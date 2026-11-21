// POST /api/monitor  { message, deploymentId? }  →  text/event-stream of monitor events
// Protected: requires header x-monitor-token matching the MONITOR_TOKEN env var (set in Vercel).
import { monitorDeployment, DEFAULT_DEPLOYMENT } from '../lib/monitor-core.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const token = process.env.MONITOR_TOKEN;
  if (!token) { res.status(503).json({ error: 'Monitor is not set up yet: add MONITOR_TOKEN and ANTHROPIC_API_KEY in Vercel.' }); return; }
  if (req.headers['x-monitor-token'] !== token) { res.status(401).json({ error: 'Wrong access code.' }); return; }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const message = String(body?.message || '').slice(0, 2000);
  const deploymentId = /^depl_[A-Za-z0-9]+$/.test(body?.deploymentId || '') ? body.deploymentId : DEFAULT_DEPLOYMENT;

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  const ctrl = new AbortController();
  req.on('close', () => ctrl.abort());
  const timer = setTimeout(() => ctrl.abort(), 55000);
  const send = ev => res.write(`data: ${JSON.stringify(ev)}\n\n`);
  try { for await (const ev of monitorDeployment({ deploymentId, message, signal: ctrl.signal })) send(ev); }
  catch (e) { send({ type: 'error', text: e.message }); }
  finally { clearTimeout(timer); send({ type: 'end' }); res.end(); }
}
