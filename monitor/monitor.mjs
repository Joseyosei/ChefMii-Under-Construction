#!/usr/bin/env node
// Minimal CLI: node monitor/monitor.mjs "Your message" [deployment_id]
// Needs ANTHROPIC_API_KEY in the environment.
import { monitorDeployment, DEFAULT_DEPLOYMENT } from '../lib/monitor-core.js';

const message = process.argv[2] || 'Give me a short status update on your latest work.';
const deploymentId = process.argv[3] || DEFAULT_DEPLOYMENT;
const ctrl = new AbortController();
process.on('SIGINT', () => ctrl.abort());

let code = 0;
for await (const ev of monitorDeployment({ deploymentId, message, signal: ctrl.signal })) {
  if (ev.type === 'text') process.stdout.write(ev.text);
  else if (ev.type === 'runs') console.error(`[runs] ${ev.runs.length} recent:`, ev.runs.map(r => `${r.id} ${r.created_at} ${r.session_id || r.error}`).join(' | '));
  else if (ev.type === 'error') { console.error(`\n[error] ${ev.text}`); code = 1; }
  else console.error(`\n[${ev.type}] ${ev.text}`);
}
process.exit(code);
