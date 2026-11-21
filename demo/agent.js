// ChefMii recommendation agent (shared by the browser and the Vercel /api/recommend function).
// Harness design: explicit rules, a small set of tools over the catalogue, a planner,
// a verifier that rejects anything not in the catalogue, and a trace for observability.
import { CHEFS, AREAS, FEE, DISH_GUIDE, OCCASIONS, PLACES } from './data.js';

export const RULES = [
  'Only recommend chefs that exist in the ChefMii catalogue. Never invent chefs, dishes or prices.',
  'Respect the minimum guest count of every chef.',
  'Prices are per guest; the host pays the chef price plus a 15% ChefMii booking fee.',
  'If the host mentions an allergy, flag it with ALLERGY CHECK and never promise a dish is safe: the chef must confirm.',
  'Never confirm a booking or take payment. Recommend, explain why, and hand over to the request form.',
  'Keep answers short and in plain English.'
];

// ---------- tools ----------
export const tools = {
  search_chefs({ cuisine, area, guests } = {}) {
    return CHEFS.filter(c =>
      (!cuisine || c.cuisine.some(x => x.toLowerCase() === cuisine.toLowerCase())) &&
      (!area || c.area === area) &&
      (!guests || guests >= c.min)
    ).map(c => c.id);
  },
  get_chef({ id }) { return CHEFS.find(c => c.id === id) || null; },
  quote({ id, menuIndex = 0, guests }) {
    const c = CHEFS.find(x => x.id === id); if (!c) return null;
    const m = c.menus[menuIndex] || c.menus[0];
    const chef = m.p * guests, fee = Math.round(chef * FEE * 100) / 100;
    return { menu: m.n, perGuest: m.p, guests, chef, fee, total: Math.round((chef + fee) * 100) / 100 };
  },
  dish_guide({ occasion }) { return DISH_GUIDE[occasion] || DISH_GUIDE.Other; }
};

// ---------- understand the request ----------
const DISH_WORDS = ['jollof', 'suya', 'asun', 'waakye', 'egusi', 'pounded yam', 'banku', 'tilapia', 'kelewele', 'cassava leaf', 'groundnut', 'nkwobi', 'abacha', 'ofe onugbu', 'moi moi', 'puff-puff', 'small chops', 'ofada', 'fufu', 'plantain', 'shito', 'chin chin'];
export function parseRequest(text = '', f = {}) {
  const t = (text || '').toLowerCase();
  const intent = { cuisine: f.cuisine || null, area: f.area || null, guests: f.guests ? +f.guests : null, occasion: f.occasion || null, budget: f.budget ? +f.budget : null, dishes: [], diet: [], allergy: null, raw: text };
  if (!intent.cuisine) {
    if (/nigeria|naija|yoruba|igbo|lagos|owambe/.test(t)) intent.cuisine = 'Nigerian';
    else if (/ghana|accra|kumasi|twi/.test(t)) intent.cuisine = 'Ghanaian';
    else if (/sierra|salone|freetown/.test(t)) intent.cuisine = 'Sierra Leonean';
  }
  if (!intent.area) {
    for (const a of Object.keys(AREAS)) if (t.includes(a.split(' ')[0].toLowerCase() + ' london') || t.includes(a.split(' ')[0].toLowerCase() + 'london')) intent.area = a;
    const pc = (f.location || text || '').toUpperCase().match(/\b([A-Z]{1,2})\d{1,2}[A-Z]?\b/);
    if (!intent.area && pc) for (const [a, ps] of Object.entries(AREAS)) if (ps.includes(pc[1])) intent.area = a;
    if (!intent.area && f.location) for (const a of Object.keys(AREAS)) if (f.location.toLowerCase().includes(a.split(' ')[0].toLowerCase())) intent.area = a;
    const hay = ((f.location || '') + ' ' + t).toLowerCase();
    if (!intent.area) for (const [a, ps] of Object.entries(PLACES)) if (ps.some(x => hay.includes(x))) { intent.area = a; break; }
  }
  if (!intent.guests) { const g = t.match(/(\d{1,3})\s*(guests|people|persons|pax|of us|heads)/) || t.match(/\bfor (\d{1,3})\b(?!\s*(pp|per|a head|each|%))/); if (g && +g[1] >= 2 && +g[1] <= 300) intent.guests = +g[1]; }
  if (!intent.budget) { const b = t.match(/£\s?(\d{2,3})\s*(pp|per (head|person|guest)|a head|each)/); if (b) intent.budget = +b[1]; }
  if (!intent.occasion) {
    const map = [['naming', 'Naming ceremony'], ['christening', 'Naming ceremony'], ['engagement', 'Engagement'], ['introduction', 'Engagement'], ['graduat', 'Graduation'], ['christmas', 'Christmas or New Year'], ['new year', 'Christmas or New Year'], ['birthday', 'Birthday'], ['bday', 'Birthday']];
    for (const [k, v] of map) if (t.includes(k)) { intent.occasion = v; break; }
  }
  intent.dishes = DISH_WORDS.filter(d => t.includes(d));
  if (/vegan/.test(t)) intent.diet.push('vegan'); if (/vegetarian|veggie/.test(t)) intent.diet.push('vegetarian'); if (/halal/.test(t)) intent.diet.push('halal');
  const al = t.match(/(nut|peanut|groundnut|gluten|dairy|shellfish|fish|egg|sesame)[^.,;]*allerg|allerg[^.,;]*(nut|peanut|gluten|dairy|shellfish|fish|egg|sesame)/);
  if (al || /allerg/.test(t)) intent.allergy = (al && (al[1] || al[2])) || 'unspecified';
  if (intent.allergy && /nut|peanut|groundnut/.test(intent.allergy)) intent.diet.push('nut-free');
  return intent;
}

// ---------- plan, score, verify ----------
export function recommendLocal(text, filters = {}) {
  const trace = [];
  const intent = parseRequest(text, filters);
  trace.push({ step: 'understand', detail: summariseIntent(intent) });
  const guests = intent.guests || 20;
  let ids = tools.search_chefs({ cuisine: intent.cuisine, area: intent.area, guests: intent.guests });
  trace.push({ step: 'tool:search_chefs', detail: `cuisine=${intent.cuisine || 'any'}, area=${intent.area || 'any'}, guests=${intent.guests || 'any'} → ${ids.length} chefs` });
  if (ids.length < 3) {
    ids = tools.search_chefs({ cuisine: intent.cuisine, guests: intent.guests });
    trace.push({ step: 'widen', detail: `Too few matches, widened to all London areas → ${ids.length} chefs` });
  }
  if (ids.length < 3) {
    ids = tools.search_chefs({ guests: intent.guests });
    trace.push({ step: 'widen', detail: `Widened to all West African cuisines → ${ids.length} chefs` });
  }
  const scored = ids.map(id => {
    const c = tools.get_chef({ id }); let s = c.rating * 10; const why = [];
    if (intent.cuisine && c.cuisine.includes(intent.cuisine)) { s += 30; why.push(`Cooks ${intent.cuisine} food`); }
    if (intent.area && c.area === intent.area) { s += 15; why.push(`Based in ${c.area}`); }
    const dishHits = intent.dishes.filter(d => c.dishes.join(' ').toLowerCase().includes(d) || c.menus.some(m => m.items.join(' ').toLowerCase().includes(d)));
    if (dishHits.length) { s += 12 * dishHits.length; why.push(`Makes ${dishHits.join(', ')}`); }
    if (intent.occasion && c.occasions.includes(intent.occasion)) { s += 10; why.push(`Often cooks for ${intent.occasion.toLowerCase()}s`); }
    for (const d of intent.diet) if (c.tags.some(tg => tg.startsWith(d))) { s += 8; why.push(c.tags.find(tg => tg.startsWith(d))); }
    // pick menu: occasion name first, then budget fit
    let mi = 0;
    const occ = intent.occasion ? c.menus.findIndex(m => m.n.toLowerCase().includes(intent.occasion.split(' ')[0].toLowerCase())) : -1;
    if (occ >= 0) mi = occ;
    else if (intent.budget) { let best = 1e9; c.menus.forEach((m, k) => { const d = Math.abs(m.p - intent.budget); if (d < best) { best = d; mi = k; } }); }
    const q = tools.quote({ id, menuIndex: mi, guests });
    if (intent.budget) { if (q.perGuest <= intent.budget) { s += 10; why.push(`Within your £${intent.budget} per guest budget`); } else s -= (q.perGuest - intent.budget); }
    why.push(`${c.rating.toFixed(1)} stars from ${c.reviews} reviews`);
    return { id, name: c.name, score: Math.round(s), reasons: why, quote: q };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  trace.push({ step: 'tool:quote', detail: `Priced ${scored.length} menus for ${guests} guests` });
  const out = verify({ intent, picks: scored, dishes: tools.dish_guide({ occasion: intent.occasion || 'Other' }), message: '' }, trace);
  out.message = buildMessage(out);
  out.engine = 'rules';
  return out;
}

export function verify(result, trace = []) {
  const ok = result.picks.filter(p => {
    const c = CHEFS.find(x => x.id === p.id);
    if (!c) { trace.push({ step: 'verify', detail: `Removed unknown chef "${p.id}"` }); return false; }
    const g = p.quote?.guests || result.intent.guests || 20;
    if (g < c.min) { trace.push({ step: 'verify', detail: `Removed ${c.name}: needs at least ${c.min} guests` }); return false; }
    p.quote = tools.quote({ id: c.id, menuIndex: Math.max(0, c.menus.findIndex(m => m.n === p.quote?.menu)), guests: g }); // recompute price from catalogue
    p.name = c.name;
    return true;
  });
  trace.push({ step: 'verify', detail: `${ok.length} recommendations checked against the catalogue and minimum guests; prices recalculated` });
  if (result.intent.allergy) trace.push({ step: 'safety', detail: `ALLERGY CHECK: ${result.intent.allergy}. Chef must confirm before booking.` });
  return { ...result, picks: ok, trace };
}

export function summariseIntent(i) {
  const p = [];
  if (i.occasion) p.push(i.occasion.toLowerCase()); if (i.guests) p.push(`${i.guests} guests`); if (i.cuisine) p.push(`${i.cuisine} food`);
  if (i.area) p.push(i.area); if (i.budget) p.push(`about £${i.budget} per guest`); if (i.dishes.length) p.push(`wants ${i.dishes.join(', ')}`);
  if (i.diet.length) p.push(i.diet.join(', ')); if (i.allergy) p.push(`allergy: ${i.allergy}`);
  return p.length ? p.join(' · ') : 'No details yet, showing our best-rated chefs';
}

function buildMessage(r) {
  if (!r.picks.length) return 'I could not find a chef that fits yet. Send a request and Jo will find one for you.';
  const top = r.picks[0], i = r.intent;
  let m = `For ${i.occasion ? 'your ' + i.occasion.toLowerCase() : 'your event'}${i.guests ? ' for ' + i.guests : ''}, ${top.name} is the best fit: ${top.reasons.slice(0, 2).map((r, k) => k ? r.charAt(0).toLowerCase() + r.slice(1) : r.charAt(0).toLowerCase() + r.slice(1)).join(' and ')}.`;
  m += ` For this occasion people usually serve ${r.dishes.slice(0, 3).join(', ')}.`;
  if (i.allergy) m += ' You mentioned an allergy, so your chef will confirm every dish before you book.';
  return m;
}

export const OCCASION_LIST = OCCASIONS;
