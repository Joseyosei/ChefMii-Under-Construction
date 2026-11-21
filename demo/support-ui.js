// ChefMii customer service chat widget (accessible).
// Uses /api/support (Claude, when ANTHROPIC_API_KEY is set in Vercel); falls back to the built-in helper below.
import { CHEFS, FEE } from './data.js';
import { recommendLocal } from './agent.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const QUICK = ['Find me a chef', 'How much does it cost?', 'How do you check chefs?', 'Allergies and dietary needs', 'Talk to a person'];
let history = [], lastFocus = null;

/* ---------- built-in helper (no AI model needed) ---------- */
function localReply(text) {
  const t = text.toLowerCase();
  const booking = /(party|birthday|naming|engagement|graduation|christmas|\d+\s*(guests|people))/.test(t);
  if (/(person|human|someone|agent|complain|refund|cancel|problem|issue|wrong)/.test(t))
    return { text: "I'm sorry about that. I'll pass this to the ChefMii team so a person can help. Please send your details through the request form and we'll reply within 24 hours.", links: [['Contact the team', '#/request']] };
  if (!booking && /(allerg|nut|gluten|dairy|vegan|vegetarian|halal|diet)/.test(t))
    return { text: 'Yes, our chefs cater for dietary needs. Tell us on the request form and, with your consent, we share it only with your booked chef, who confirms every dish before you book. We delete it 30 days after your event. We never promise a dish is allergen-free; your chef always confirms.', links: [['Request a chef', '#/request']] };
  if (!booking && /(price|cost|how much|fee|pay|budget)/.test(t))
    return { text: `Chefs set a price per guest, usually £29 to £42 for party menus, including shopping, cooking, serving and clean-up. ChefMii adds a ${Math.round(FEE * 100)}% booking fee. For example, 20 guests at £35 is £700 plus £105, so £805 in total. Payment is held until after your event.`, links: [['Get a price estimate', '#/request']] };
  if (/(check|verif|safe|trust|hygiene|insur|vetted)/.test(t))
    return { text: 'Every ChefMii chef shows photo ID on a video call, is registered with their local council as a food business, is trained in food hygiene and allergens, and has public liability insurance. We record that each check was done and never keep copies of ID.', links: [['How we verify chefs', '#/join']] };
  if (/(area|where|cover|london|travel|postcode)/.test(t) && !/(chef for|party|guests)/.test(t))
    return { text: 'We cover all of London for now. Tell me your area or postcode and the occasion and I can suggest chefs.', links: [] };
  if (/(video|tv|watch)/.test(t))
    return { text: 'You can watch our chefs cook on ChefMii TV, then book the chef who made the food you like.', links: [['Open ChefMii TV', '#/tv']] };
  if (/(chef|cook|party|birthday|naming|engagement|graduation|christmas|guests|jollof|suya|waakye|banku|egusi|nigerian|ghanaian|sierra|book)/.test(t) || /\d+/.test(t)) {
    const r = recommendLocal(text, {});
    const picks = r.picks.slice(0, 2);
    if (!picks.length) return { text: "Tell me the occasion, number of guests, your area and the food you'd like, and I'll suggest a chef.", links: [] };
    const lines = picks.map(p => { const c = CHEFS.find(x => x.id === p.id); return `${c.name} (${c.cuisine.join(' and ')}, ${c.area}): ${p.quote.menu}, about £${Math.round(p.quote.total)} for ${p.quote.guests} guests.`; });
    return { text: `Here are my top picks:\n${lines.join('\n')}${r.intent.allergy ? '\nYou mentioned an allergy, so your chef will confirm every dish first.' : ''}`, links: picks.map(p => [`View ${CHEFS.find(x => x.id === p.id).name}`, `#/chef/${p.id}`]).concat([['Request a chef', '#/request']]) };
  }
  if (/(hi|hello|hey|good (morning|afternoon|evening))/.test(t))
    return { text: 'Hello! How can I help with your celebration today?', links: [] };
  return { text: "I can help you find a chef, explain prices, how we check chefs, and dietary needs. What would you like to know?", links: [] };
}

async function getReply(text) {
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch('/api/support', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }), signal: ctrl.signal });
    clearTimeout(tm);
    if (r.ok) { const d = await r.json(); if (d.reply) return { text: d.reply, links: d.links || [] }; }
  } catch {}
  return localReply(text);
}

/* ---------- widget ---------- */
export function mountSupport() {
  const btn = document.createElement('button');
  btn.className = 'cs-fab'; btn.type = 'button'; btn.id = 'csBtn';
  btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-controls', 'csPanel'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg><span>Chat with us</span>';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'csPanel'; panel.className = 'cs-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'csTitle');
  panel.innerHTML = `<header class="cs-head"><img src="assets/logo-white.png" alt="" width="96" height="23"><div><h2 id="csTitle">ChefMii customer service</h2><p><span class="cs-dot" aria-hidden="true"></span>We usually reply in seconds</p></div>
      <button type="button" class="cs-x" id="csClose" aria-label="Close chat">×</button></header>
    <div class="cs-log" id="csLog" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"></div>
    <div class="cs-quick" id="csQuick" role="group" aria-label="Suggested questions">${QUICK.map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="cs-form" id="csForm"><label for="csInput" class="sr">Type your message</label>
      <input id="csInput" autocomplete="off" maxlength="600" placeholder="Type your message…">
      <button type="submit" class="cs-send" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>
    <p class="cs-foot">Prototype assistant. Please don't share card or bank details. <a href="#/privacy">Privacy</a></p>`;
  document.body.appendChild(panel);

  const $ = id => panel.querySelector('#' + id), log = $('csLog');
  const add = (who, text, links = []) => {
    const row = document.createElement('div'); row.className = 'cs-row ' + who;
    row.innerHTML = `${who === 'bot' ? '<span class="cs-av" aria-hidden="true">C</span>' : ''}<div class="cs-bubble"><span class="sr">${who === 'bot' ? 'ChefMii says:' : 'You said:'} </span>${esc(text).replace(/\n/g, '<br>')}${links.length ? `<div class="cs-links">${links.map(([l, h]) => `<a href="${esc(h)}"${h.startsWith('mailto') ? '' : ''}>${esc(l)}</a>`).join('')}</div>` : ''}</div>`;
    log.appendChild(row); log.scrollTop = log.scrollHeight;
    row.querySelectorAll('.cs-links a[href^="#"]').forEach(a => a.onclick = () => close(false));
  };
  const typing = () => { const r = document.createElement('div'); r.className = 'cs-row bot'; r.id = 'csTyping'; r.innerHTML = '<span class="cs-av" aria-hidden="true">C</span><div class="cs-bubble cs-typing" aria-label="ChefMii is typing"><i></i><i></i><i></i></div>'; log.appendChild(r); log.scrollTop = log.scrollHeight; };
  const ask = async text => {
    text = text.trim(); if (!text) return;
    add('user', text); history.push({ role: 'user', content: text }); $('csInput').value = '';
    typing(); const r = await getReply(text); $('csTyping')?.remove();
    add('bot', r.text, r.links); history.push({ role: 'assistant', content: r.text });
  };
  const open = () => {
    lastFocus = document.activeElement; panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.body.classList.add('cs-open');
    if (!log.children.length) add('bot', "Hi, I'm the ChefMii assistant. I can help you find a West African chef for your celebration, explain prices and answer questions. How can I help?");
    $('csInput').focus();
  };
  const close = (restore = true) => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('cs-open'); if (restore) (lastFocus || btn).focus(); };
  btn.onclick = () => (panel.hidden ? open() : close());
  $('csClose').onclick = () => close();
  $('csForm').onsubmit = e => { e.preventDefault(); ask($('csInput').value); };
  panel.querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(); } });
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('button,input,a[href],[tabindex="0"]')].filter(x => !x.disabled && x.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
