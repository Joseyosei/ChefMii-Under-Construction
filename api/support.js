// POST /api/support { messages: [{role, content}] } → { reply }
// Uses Claude when ANTHROPIC_API_KEY is set in Vercel; otherwise 503 and the widget uses its built-in helper.
import Anthropic from '@anthropic-ai/sdk';
import { CHEFS, FEE } from '../demo/data.js';

const chefList = CHEFS.map(c => `- ${c.name} | ${c.cuisine.join('/')} | ${c.area} | min ${c.min} guests | ${c.tags.join(', ')} | ${c.menus.map(m => `${m.n} £${m.p}pp`).join('; ')}`).join('\n');
const SYSTEM = `You are ChefMii customer service. ChefMii helps Londoners book verified West African private chefs (Nigerian, Ghanaian, Sierra Leonean) for home celebrations.
Answer in warm, plain British English, 1 to 4 short sentences, no em dashes.
Facts: chefs set a price per guest; ChefMii adds a ${Math.round(FEE * 100)}% booking fee; payment is held until after the event; we reply to requests within 24 hours; we cover all of London.
Checks: ID on a video call (no copies kept), council food business registration, food hygiene and allergen training, public liability insurance.
Rules: only recommend chefs from this list, never invent chefs, prices or availability; respect minimum guests; never confirm a booking or take payment (point to the request form); for allergies say the chef confirms every dish and never promise a dish is safe; never ask for card or bank details; for complaints, refunds or anything you cannot answer, say the ChefMii team will help and point to the request form.
These are demo chef profiles:
${chefList}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'not configured' }); return; }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const messages = (Array.isArray(body?.messages) ? body.messages : []).filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-12).map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!messages.length || messages[0].role !== 'user') { res.status(400).json({ error: 'bad request' }); return; }
  try {
    const client = new Anthropic();
    const r = await client.messages.create({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 400, system: SYSTEM, messages });
    const reply = r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const links = [];
    for (const c of CHEFS) if (reply.includes(c.name)) links.push([`View ${c.name}`, `#/chef/${c.id}`]);
    if (/request/i.test(reply)) links.push(['Request a chef', '#/request']);
    res.status(200).json({ reply, links: links.slice(0, 3) });
  } catch (e) { console.error('[support]', e.message); res.status(502).json({ error: 'model unavailable' }); }
}
