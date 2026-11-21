// POST /api/recommend  { text, filters }  → recommendations
// Uses Claude (tool use) when ANTHROPIC_API_KEY is set in Vercel; otherwise the rules agent.
// Either way the output passes the same verifier, so it can only contain real catalogue chefs.
import { recommendLocal, parseRequest, tools, verify, RULES, summariseIntent } from '../demo/agent.js';
import { CHEFS } from '../demo/data.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const TOOLS = [
  { name: 'search_chefs', description: 'Find catalogue chef ids by cuisine (Nigerian, Ghanaian, Sierra Leonean), London area (East/South/North/West/Central London) and guest count. All fields optional.', input_schema: { type: 'object', properties: { cuisine: { type: 'string' }, area: { type: 'string' }, guests: { type: 'integer' } } } },
  { name: 'get_chef', description: 'Get one chef profile with menus, prices per guest, minimum guests, tags and occasions.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'quote', description: 'Price a chef menu for a guest count (includes the 15% ChefMii fee).', input_schema: { type: 'object', properties: { id: { type: 'string' }, menuIndex: { type: 'integer' }, guests: { type: 'integer' } }, required: ['id', 'guests'] } },
  { name: 'dish_guide', description: 'Typical West African dishes for an occasion.', input_schema: { type: 'object', properties: { occasion: { type: 'string' } } } },
  { name: 'submit_recommendations', description: 'Final answer. Up to 3 chefs, best first.', input_schema: { type: 'object', properties: {
      message: { type: 'string', description: '2 to 3 short sentences for the host, plain English, no em dashes.' },
      dishes: { type: 'array', items: { type: 'string' } },
      picks: { type: 'array', maxItems: 3, items: { type: 'object', properties: { id: { type: 'string' }, menuIndex: { type: 'integer' }, reasons: { type: 'array', items: { type: 'string' } } }, required: ['id', 'reasons'] } }
    }, required: ['message', 'picks'] } }
];

async function claude(text, filters) {
  const intent = parseRequest(text, filters);
  const guests = intent.guests || 20;
  const trace = [{ step: 'understand', detail: summariseIntent(intent) }];
  const system = `You are the ChefMii concierge. ChefMii helps Londoners book West African private chefs for home celebrations.\nRules:\n- ${RULES.join('\n- ')}\nUse the tools, then call submit_recommendations. Assume ${guests} guests if none given.`;
  const messages = [{ role: 'user', content: `Host request: ${text || '(none)'}\nForm filters: ${JSON.stringify(filters || {})}` }];
  for (let turn = 0; turn < 6; turn++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, tools: TOOLS, messages })
    });
    if (!r.ok) throw new Error('Claude API ' + r.status);
    const data = await r.json();
    messages.push({ role: 'assistant', content: data.content });
    const uses = data.content.filter(b => b.type === 'tool_use');
    if (!uses.length) break;
    const results = [];
    for (const u of uses) {
      if (u.name === 'submit_recommendations') {
        const picks = (u.input.picks || []).map(p => ({ id: p.id, reasons: p.reasons || [], quote: tools.quote({ id: p.id, menuIndex: p.menuIndex || 0, guests }) || { guests } }));
        const out = verify({ intent, picks, dishes: u.input.dishes || tools.dish_guide({ occasion: intent.occasion }), message: u.input.message || '' }, trace);
        return { ...out, engine: 'claude', model: MODEL };
      }
      const fn = tools[u.name]; let res;
      try { res = fn ? fn(u.input || {}) : { error: 'unknown tool' }; } catch (e) { res = { error: String(e) }; }
      trace.push({ step: 'tool:' + u.name, detail: JSON.stringify(u.input).slice(0, 120) });
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(res).slice(0, 6000) });
    }
    messages.push({ role: 'user', content: results });
  }
  throw new Error('Agent did not finish');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const text = String(body?.text || '').slice(0, 600);
  const filters = body?.filters || {};
  const started = Date.now();
  let out;
  if (process.env.ANTHROPIC_API_KEY) {
    try { out = await claude(text, filters); }
    catch (e) { out = recommendLocal(text, filters); out.trace.unshift({ step: 'fallback', detail: 'AI model unavailable, used the rules agent' }); console.error('[recommend]', e.message); }
  } else out = recommendLocal(text, filters);
  out.ms = Date.now() - started;
  console.log('[recommend]', JSON.stringify({ engine: out.engine, picks: out.picks.map(p => p.id), ms: out.ms }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
}

export const catalogueSize = CHEFS.length;
