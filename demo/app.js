import { CHEFS, CUISINES, OCCASIONS, AREAS, FEE } from './data.js';
import { recommendLocal, summariseIntent } from './agent.js';

const WA = '447551674140';
const CHEF_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfwKH4BPHk4PS9OFk5tmeU3t1C-YFD4oieRsf6PxRnTDeTtQQ/viewform';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '£' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
const from = c => Math.min(...c.menus.map(m => m.p));
const initials = n => n.replace('Chef ', '').slice(0, 1);

/* ---------- icons (stroke, 24px) ---------- */
const I = {
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  fork: '<path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M8 3v6M16 21V3c-2 1.5-3 4-3 7v3h3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  shield: '<path d="M12 3 5 6v5c0 4.6 3 8.5 7 10 4-1.5 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  hat: '<path d="M7 18h10v3H7zM6 14.5A4.5 4.5 0 0 1 7.6 6a5 5 0 0 1 8.8 0A4.5 4.5 0 0 1 18 14.5V18H6z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>'
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ---------- consent (UK GDPR + PECR) ---------- */
const CONSENT_KEY = 'chefmii_consent_v1';
const consent = {
  get() { try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; } },
  set(prefs) { const v = { necessary: true, preferences: !!prefs.preferences, analytics: !!prefs.analytics, date: new Date().toISOString(), version: 1 }; try { localStorage.setItem(CONSENT_KEY, JSON.stringify(v)); } catch {} if (!v.preferences) try { localStorage.removeItem('chefmii_last_search'); } catch {} return v; },
  allows(k) { const c = consent.get(); return !!(c && c[k]); }
};
function cookieBanner() {
  if (consent.get()) { $('#cookieRoot').innerHTML = ''; document.body.classList.remove('cookie-open'); return; }
  document.body.classList.add('cookie-open');
  $('#cookieRoot').innerHTML = `<div class="cookie" role="dialog" aria-labelledby="ckT" aria-live="polite">
    <h3 id="ckT">Cookies on ChefMii</h3>
    <p>We use strictly necessary storage to make the site work, like keeping your booking request and remembering this choice. With your permission we also remember your last search. We do not use advertising cookies. <a href="#/cookies">Cookie policy</a></p>
    <div class="acts"><button class="btn btn-primary" data-ck="all">Accept all</button><button class="btn btn-outline" data-ck="reject">Reject non-essential</button><button class="btn btn-ghost wide" data-ck="manage">Manage preferences</button></div></div>`;
  $('#cookieRoot').querySelectorAll('[data-ck]').forEach(b => b.onclick = () => {
    const k = b.dataset.ck;
    if (k === 'all') { consent.set({ preferences: true, analytics: true }); cookieBanner(); }
    else if (k === 'reject') { consent.set({ preferences: false, analytics: false }); cookieBanner(); }
    else cookieModal();
  });
}
function cookieModal() {
  const c = consent.get() || { preferences: false, analytics: false };
  const root = document.createElement('div'); root.className = 'modal-bg'; root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cmT">
    <div style="display:flex;justify-content:space-between;align-items:center"><h3 id="cmT" style="font-family:var(--sans);font-size:20px;margin:0">Cookie preferences</h3><button class="btn btn-ghost" id="cmX" aria-label="Close" style="padding:8px">${ic('x')}</button></div>
    <div class="opt"><div><b>Strictly necessary</b><p>Keeps the site working: your cookie choice and booking requests you send from this device. Always on.</p></div><label class="switch"><input type="checkbox" checked disabled><span></span></label></div>
    <div class="opt"><div><b>Preferences</b><p>Remembers your last search (area, cuisine, guests) so you do not type it again.</p></div><label class="switch"><input type="checkbox" id="ckP" ${c.preferences ? 'checked' : ''}><span></span></label></div>
    <div class="opt"><div><b>Analytics</b><p>Helps us understand which pages are used. Not active in this prototype; nothing is loaded even if switched on.</p></div><label class="switch"><input type="checkbox" id="ckA" ${c.analytics ? 'checked' : ''}><span></span></label></div>
    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn btn-primary" id="ckSave">Save choices</button><button class="btn btn-outline" id="ckRej">Reject non-essential</button></div></div>`;
  document.body.appendChild(root);
  const close = () => { root.remove(); cookieBanner(); };
  root.querySelector('#cmX').onclick = close; root.onclick = e => { if (e.target === root) close(); };
  root.querySelector('#ckSave').onclick = () => { consent.set({ preferences: root.querySelector('#ckP').checked, analytics: root.querySelector('#ckA').checked }); close(); };
  root.querySelector('#ckRej').onclick = () => { consent.set({}); close(); };
}

/* ---------- storage ---------- */
let mem = [];
const store = {
  get() { try { return JSON.parse(localStorage.getItem('chefmii_requests') || '[]'); } catch { return mem; } },
  set(v) { mem = v; try { localStorage.setItem('chefmii_requests', JSON.stringify(v)); } catch {} }
};
const lastSearch = {
  get() { if (!consent.allows('preferences')) return {}; try { return JSON.parse(localStorage.getItem('chefmii_last_search') || '{}'); } catch { return {}; } },
  set(v) { if (consent.allows('preferences')) try { localStorage.setItem('chefmii_last_search', JSON.stringify(v)); } catch {} }
};

/* ---------- shared pieces ---------- */
function cover(c) {
  return c.photo ? `<img src="${c.photo}" alt="${esc(c.name)} (demo profile)" loading="lazy">`
    : `<div class="dish" style="--tone:${c.tone}">${esc(c.dishes[0])}</div>`;
}
function avatar(c, size = 44) {
  return c.photo ? `<img class="avatar" style="width:${size}px;height:${size}px" src="${c.photo}" alt="">`
    : `<span class="avatar" style="width:${size}px;height:${size}px;background:${c.tone}">${initials(c.name)}</span>`;
}
function chefCard(c) {
  return `<a class="card" href="#/chef/${c.id}">
    <div class="cover">${cover(c)}<span class="pill">${ic('shield')}Verified</span><span class="demo-tag">Demo profile</span><span class="play" aria-hidden="true"></span></div>
    <div class="cbody"><div class="top"><h3>${esc(c.name)}</h3><span class="rate"><span class="s">★</span> <b>${c.rating.toFixed(1)}</b> <span class="muted">(${c.reviews})</span></span></div>
      <div class="meta">${esc(c.cuisine.join(' and '))} · ${esc(c.area)}</div>
      <div class="meta">${esc(c.dishes.slice(0, 3).join(', '))}</div>
      <div class="from">From <b>${money(from(c))}</b> per guest <span class="muted">· min ${c.min}</span></div></div></a>`;
}
const AREA_OPTIONS = Object.keys(AREAS);
function searchPanel(v = {}, compact = false) {
  const g = v.guests || '';
  return `<form class="search ${compact ? 'compact' : ''}" id="searchForm" role="search" aria-label="Find chefs">
    <div class="field" onclick="this.querySelector('input').focus()"><label for="sLoc">Location</label><div class="ctl">${ic('pin', 'ic')}<input id="sLoc" name="location" list="areaList" placeholder="e.g. Peckham, E15, East London" value="${esc(v.location || '')}" autocomplete="off"></div>
      <datalist id="areaList">${AREA_OPTIONS.map(a => `<option value="${a}">`).join('')}</datalist></div>
    <div class="field"><label for="sCui">Cuisine style</label><div class="ctl">${ic('fork', 'ic')}<select id="sCui" name="cuisine"><option value="">Any West African</option>${CUISINES.map(c => `<option ${v.cuisine === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>${ic('chev', 'chev')}</div>
    <div class="field"><label for="sGst">Guest count</label><div class="ctl">${ic('users', 'ic')}<select id="sGst" name="guests"><option value="">Any size</option>${[['10', '8 to 12 guests'], ['20', '13 to 25 guests'], ['35', '26 to 45 guests'], ['50', '46+ guests']].map(([k, l]) => `<option value="${k}" ${String(g) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${ic('chev', 'chev')}</div>
    <button class="btn btn-primary go" type="submit">${ic('search')}Find chefs</button></form>`;
}
function bindSearch() {
  const f = $('#searchForm'); if (!f) return;
  f.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f).entries()); lastSearch.set(d);
    const q = new URLSearchParams(Object.entries(d).filter(([, x]) => x)).toString(); location.hash = '#/chefs' + (q ? '?' + q : ''); };
}

/* ---------- concierge (AI agent) ---------- */
const PROMPTS = ['Naming ceremony for 30 in Lewisham, Nigerian food, about £35 a head', 'Ghanaian engagement party, 40 guests, North London, waakye and banku', '15 people for my mum\'s birthday in E15, one guest has a nut allergy', 'Christmas dinner for 12, Igbo food, some vegetarians'];
function conciergeBox(id = 'cg') {
  return `<div class="cbox"><label for="${id}Txt" class="sr">Describe your celebration</label>
    <textarea id="${id}Txt" placeholder="Tell me about your celebration: occasion, guests, area, food you love, budget, allergies"></textarea>
    <div class="prompts">${PROMPTS.map(p => `<button type="button" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <div class="row"><span class="agent-mark"><span class="dot"></span>ChefMii concierge · checks every pick against verified chefs</span><button class="btn btn-primary" id="${id}Go">${ic('hat')}Recommend chefs</button></div>
    <div id="${id}Out" aria-live="polite"></div></div>`;
}
async function askAgent(text, filters) {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch('/api/recommend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, filters }), signal: ctrl.signal });
    clearTimeout(t); if (!r.ok) throw new Error(r.status); return await r.json();
  } catch (e) { const out = recommendLocal(text, filters); out.trace.unshift({ step: 'offline', detail: 'Server agent unreachable, ran the same agent in your browser' }); return out; }
}
function renderAnswer(out) {
  const picks = out.picks.map((p, k) => { const c = CHEFS.find(x => x.id === p.id); const mi = Math.max(0, c.menus.findIndex(m => m.n === p.quote.menu));
    return `<div class="pick"><span class="rank">${k + 1}</span><div><div class="who">${avatar(c)}<div><a href="#/chef/${c.id}" style="font-weight:700;font-size:17px;text-decoration:none">${esc(c.name)}</a><div class="meta">${esc(c.cuisine.join(' and '))} · ${esc(c.area)}</div></div></div>
      <ul>${p.reasons.slice(0, 4).map(r => `<li>${ic('check')}${esc(r)}</li>`).join('')}</ul></div>
      <div class="price">${esc(p.quote.menu)}<b>${money(p.quote.total)}</b>${p.quote.guests} guests incl. fee<br><a class="btn btn-primary" style="margin-top:8px;padding:9px 14px;font-size:14px" href="#/request?chef=${c.id}&menu=${mi}&guests=${p.quote.guests}">Request</a></div></div>`; }).join('');
  const allergy = out.intent?.allergy ? `<div class="alert"><b>Allergy check:</b> you mentioned ${esc(out.intent.allergy === 'unspecified' ? 'an allergy' : 'a ' + out.intent.allergy + ' allergy')}. Your chef will confirm every dish before you book. ChefMii never promises a dish is safe.</div>` : '';
  const eng = out.engine === 'claude' ? `AI model (${esc(out.model)}) with tool use, verified against the catalogue` : 'Rules agent: same tools and verifier, no AI model connected yet';
  return `<div class="answer"><div class="msg">${esc(out.message)}</div><div class="understood"><b>I understood:</b> ${esc(summariseIntent(out.intent))}</div>${allergy}
    ${picks || '<div class="empty">No chef fits yet. <a href="#/request">Send a request</a> and we will find one.</div>'}
    ${out.dishes?.length ? `<p class="small muted" style="margin-top:10px"><b>Dishes that suit this occasion:</b> ${out.dishes.map(esc).join(', ')}</p>` : ''}
    <details class="trace"><summary>How the agent decided</summary><ol>${out.trace.map(t => `<li><b>${esc(t.step)}</b>: ${esc(t.detail)}</li>`).join('')}</ol><p style="margin-top:8px">Engine: ${eng}.</p></details></div>`;
}
function bindConcierge(id = 'cg', seed = '') {
  const txt = $('#' + id + 'Txt'), out = $('#' + id + 'Out'); if (!txt) return;
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { txt.value = b.dataset.p; run(); });
  const run = async () => { const t = txt.value.trim(); if (!t) { txt.focus(); return; }
    out.innerHTML = '<div class="loading"><i></i><i></i><i></i> Checking verified chefs, menus and prices</div>';
    const res = await askAgent(t, {}); out.innerHTML = renderAnswer(res); };
  $('#' + id + 'Go').onclick = run;
  txt.onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); };
  if (seed) { txt.value = seed; run(); }
}

/* ---------- pages ---------- */
function home() {
  const v = lastSearch.get();
  return `<section class="hero"><div class="wrap">
      <p class="eyebrow" style="color:#F4B393">London · West African private chefs</p>
      <h1>The chef your celebration deserves</h1>
      <p class="lead">Watch verified West African chefs cook, compare menus and prices per guest, then book. They shop, cook, serve and clean up at your home.</p>
      ${searchPanel(v)}
      <div class="ask">Not sure what to book? <a href="#/concierge">Ask the ChefMii concierge</a></div>
      <div class="proof"><span>${ic('check')}ID verified chefs</span><span>${ic('check')}Food hygiene and allergen trained</span><span>${ic('check')}Insured</span><span>${ic('check')}Payment held until after your event</span></div>
    </div></section>
    <section><div class="wrap">
      <div class="sec-head"><div><p class="eyebrow">Featured</p><h2>Chefs hosts love</h2></div><a class="btn btn-outline" href="#/chefs">See all chefs ${ic('arrow')}</a></div>
      <div class="grid g3">${CHEFS.slice(0, 3).map(chefCard).join('')}</div></div></section>
    <section class="bg-cream"><div class="wrap concierge">
      <div><p class="eyebrow">AI concierge</p><h2>Describe your party. Get the right chef.</h2>
        <p class="muted">The ChefMii concierge reads your request, searches verified chefs, prices their menus for your guest count and explains each pick. It only recommends real chefs on ChefMii, respects minimum guest numbers and flags allergies for the chef to confirm.</p>
        <p class="small muted">Prototype: chefs are demo profiles.</p></div>
      ${conciergeBox('hm')}</div></section>
    <section><div class="wrap"><div class="sec-head"><div><p class="eyebrow">Occasions</p><h2>Made for West African celebrations</h2></div></div>
      <div class="occ">${[['Naming ceremony', 'Small chops, jollof, moi moi'], ['Birthday', 'Jollof, suya, plantain'], ['Engagement', 'Both families\' favourites'], ['Graduation', 'Party buffets'], ['Christmas or New Year', 'Turkey jollof, nkwobi']].map(([o, d]) => `<a href="#/concierge?q=${encodeURIComponent(o + ' for 20 guests in London')}">${o}<span>${d}</span></a>`).join('')}</div></div></section>
    ${howBlock()}
    <section style="padding-top:0"><div class="wrap"><div class="band"><div><p class="eyebrow" style="color:#F4B393">For chefs</p><h2>Cook for London's best parties. Keep 100% of your price.</h2><p>Free verified profile, we film your cooking, and payment is taken upfront. The host pays the booking fee, not you.</p><a class="btn btn-light" href="#/join">Become a ChefMii chef ${ic('arrow')}</a></div>
      <ul><li>${ic('check')}Free filming and profile set-up</li><li>${ic('check')}Paid within 48 hours of the event</li><li>${ic('check')}No exclusivity: keep your own clients</li></ul></div></div></section>
    ${faq()}`;
}
function howBlock() {
  return `<section class="bg-cream" id="how"><div class="wrap"><div class="sec-head"><div><p class="eyebrow">How it works</p><h2>Booked in three steps</h2></div></div>
    <div class="steps"><div class="step"><div class="n">1</div><h3>Watch chefs cook</h3><p>Every chef has short cooking videos, set menus and a clear price per guest.</p></div>
    <div class="step"><div class="n">2</div><h3>Send your details</h3><p>Date, guests, postcode and dietary needs. Or ask the concierge to choose for you.</p></div>
    <div class="step"><div class="n">3</div><h3>We confirm in 24 hours</h3><p>Your chef and quote on WhatsApp. Payment is held until after your event.</p></div></div></div></section>`;
}
function faq() {
  return `<section class="faq"><div class="wrap" style="max-width:820px"><h2>Questions</h2>
    <details><summary>How much does a chef cost?</summary><p>Chefs set their price per guest, usually £29 to £42 for party menus, including shopping, cooking, serving and clean-up. ChefMii adds a 15% booking fee. You see the total before you pay.</p></details>
    <details><summary>How do you check chefs?</summary><p>Every chef shows photo ID on a video call, is registered with their local council as a food business, is trained in food hygiene and allergens, and has public liability insurance. We record that checks were done; we never keep copies of ID.</p></details>
    <details><summary>Can you cater for allergies?</summary><p>Yes. Tell us on the request form. With your consent we share it only with your booked chef, who confirms every dish, and we delete it 30 days after your event.</p></details>
    <details><summary>Which areas do you cover?</summary><p>All of London for now.</p></details></div></section>`;
}
function chefsPage(q) {
  const v = { ...lastSearch.get(), ...q };
  const res = recommendLocal('', { cuisine: v.cuisine, location: v.location, guests: v.guests });
  // filter strictly by cuisine/area/guests for the list, ranked by agent score
  const intent = res.intent;
  let list = CHEFS.filter(c => (!v.cuisine || c.cuisine.includes(v.cuisine)) && (!intent.area || c.area === intent.area) && (!v.guests || +v.guests >= c.min));
  const order = recommendLocal('', { cuisine: v.cuisine, area: intent.area, guests: v.guests }).picks.map(p => p.id);
  list.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99) || b.rating - a.rating);
  const more = list.length >= 3 ? [] : CHEFS.filter(c => !list.includes(c) && (!v.cuisine || c.cuisine.includes(v.cuisine)) && (!v.guests || +v.guests >= c.min)).slice(0, 3 - Math.min(list.length, 2) + 1);
  return `<section style="padding-top:36px"><div class="wrap"><h1 style="font-size:clamp(28px,3.6vw,42px)">West African chefs in London</h1>
    ${searchPanel(v, true)}
    <div class="toolbar"><span class="muted">${list.length} chef${list.length === 1 ? '' : 's'}${intent.area ? ' in ' + intent.area : ''}${v.cuisine ? ' · ' + v.cuisine : ''}${v.guests ? ' · around ' + v.guests + ' guests' : ''} · ranked by the concierge</span>
    <a class="btn btn-ghost" href="#/concierge">Not sure? Ask the concierge ${ic('arrow')}</a></div>
    <div class="grid">${list.map(chefCard).join('')}</div>
    ${!list.length ? `<div class="empty">No chef matches all of that yet. <a href="#/request">Send a request</a> and we will find one.</div>` : ''}
    ${more.length ? `<h3 style="margin:44px 0 16px">${list.length ? 'More chefs who travel across London' : 'Chefs close to what you asked for'}</h3><div class="grid">${more.map(chefCard).join('')}</div>` : ''}
  </div></section>`;
}
function chefPage(id) {
  const c = CHEFS.find(x => x.id === id); if (!c) return `<section><div class="wrap empty">Chef not found. <a href="#/chefs">See all chefs</a></div></section>`;
  return `<div class="wrap profile"><div><div class="video">${c.photo ? `<img src="${c.photo}" alt="${esc(c.name)} (demo profile)">` : `<div class="cover" style="aspect-ratio:auto;height:100%"><div class="dish" style="--tone:${c.tone};font-size:34px">${esc(c.dishes[0])}</div></div>`}
      <span class="bigplay" aria-hidden="true"></span><div class="over">Cooking clip: ${esc(c.dishes[0].toLowerCase())}. Real chef videos play here after filming.</div></div></div>
    <div><a class="back" href="#/chefs">${ic('back')} All chefs</a><p class="eyebrow">${esc(c.cuisine.join(' and '))} · ${esc(c.area)}</p><h1 style="font-size:clamp(32px,4vw,48px)">${esc(c.name)}</h1>
      <div class="rate"><span class="s">★</span> <b>${c.rating.toFixed(1)}</b> <span class="muted">from ${c.reviews} reviews · demo profile</span></div>
      <div class="badges"><span class="badge">${ic('check')}ID verified</span><span class="badge">${ic('check')}Council registered</span><span class="badge">${ic('check')}Hygiene and allergen trained</span><span class="badge">${ic('check')}Insured</span></div>
      <p>${esc(c.bio)}</p><div class="tags">${c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}<span class="tag">min ${c.min} guests</span></div>
      <h2 style="font-size:26px;margin-top:30px">Set menus</h2>
      ${c.menus.map((m, k) => `<div class="menu"><div class="mh"><h3>${esc(m.n)}</h3><span class="pp"><b>${money(m.p)}</b> / guest</span></div><ul>${m.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><a class="btn btn-primary" href="#/request?chef=${c.id}&menu=${k}">Request this menu</a></div>`).join('')}
      <p class="small muted">Price includes shopping, cooking, serving and clean-up. ChefMii booking fee of 15% is added at checkout.</p></div></div>`;
}
function conciergePage(q) {
  return `<section style="padding-top:44px"><div class="wrap concierge"><div><p class="eyebrow">AI concierge</p><h1 style="font-size:clamp(30px,4vw,46px)">Tell us about your celebration</h1>
    <p class="muted">The concierge is an agent with four tools: it searches verified chefs, reads their profiles, prices menus for your guests and suggests dishes for the occasion. A verifier then removes anything that is not a real ChefMii chef or breaks a chef's minimum guest count, and recalculates every price.</p>
    <p class="small muted">It never books or takes payment, and never promises a dish is allergen-safe: your chef confirms that.</p></div>${conciergeBox('cg')}</div></section>`;
}
function requestPage(q) {
  const d = new Date(); d.setDate(d.getDate() + 3); const minD = d.toISOString().slice(0, 10);
  return `<div class="wrap formgrid"><form id="rf" novalidate><h1 style="font-size:clamp(28px,3.6vw,42px)">Request a chef</h1><p class="muted">We reply on WhatsApp within 24 hours with your chef and quote. Nothing to pay now.</p>
    <div class="r2"><div class="f"><label for="fChef">Chef</label><select id="fChef" name="chef"><option value="">Match me with a chef</option>${CHEFS.map(c => `<option value="${c.id}" ${q.chef === c.id ? 'selected' : ''}>${esc(c.name)} · ${esc(c.cuisine.join('/'))}</option>`).join('')}</select></div>
      <div class="f"><label for="fMenu">Menu</label><select id="fMenu" name="menu"></select></div></div>
    <div class="r2"><div class="f"><label for="fOcc">Occasion</label><select id="fOcc" name="occasion">${OCCASIONS.map(o => `<option>${o}</option>`).join('')}</select></div>
      <div class="f"><label for="fDate">Event date</label><input id="fDate" type="date" name="date" min="${minD}"></div></div>
    <div class="r2"><div class="f"><label for="fGuests">Guests: <b id="gOut"></b></label><input id="fGuests" type="range" name="guests" min="8" max="60" value="${+q.guests || 20}"></div>
      <div class="f"><label for="fPc">London postcode</label><input id="fPc" name="postcode" placeholder="e.g. E15 1AA" maxlength="9" autocomplete="postal-code"></div></div>
    <div class="f"><label for="fDiet">Dietary needs or allergies (optional)</label><textarea id="fDiet" name="dietary" placeholder="e.g. 2 vegetarians, 1 guest with a peanut allergy"></textarea></div>
    <div class="f check" id="consentBox" style="display:none"><input type="checkbox" id="fConsent"><label for="fConsent" style="font-weight:400;margin:0">I agree that ChefMii can use this allergy and dietary information to plan my menu and share it only with my booked chef. It is deleted 30 days after my event. I can withdraw this at any time.</label></div>
    <div class="r2"><div class="f"><label for="fName">Your name</label><input id="fName" name="name" maxlength="60" autocomplete="name"></div>
      <div class="f"><label for="fPhone">WhatsApp number</label><input id="fPhone" name="phone" type="tel" placeholder="07..." maxlength="16" autocomplete="tel"></div></div>
    <div class="f"><label for="fNotes">Anything else?</label><textarea id="fNotes" name="notes" placeholder="Timing, kitchen size, serving style"></textarea></div>
    <p class="small muted">By sending, you agree to our <a href="#/privacy">privacy policy</a>.</p><p class="err" id="err" role="alert"></p>
    <button class="btn btn-primary" type="submit" style="width:100%;padding:15px">Send request</button></form>
    <aside><div class="sum"><h3 style="font-family:var(--sans);font-size:18px">Price estimate</h3><div id="sum"></div><p class="small muted" style="margin-top:12px">Estimate only. Your chef confirms the final quote. Payment is held until after your event.</p></div></aside></div>`;
}
function bindRequest(q) {
  const fc = $('#fChef'), fm = $('#fMenu'), fg = $('#fGuests'), fd = $('#fDiet');
  let wantMenu = q.menu;
  const calc = () => { const c = CHEFS.find(x => x.id === fc.value), g = +fg.value; $('#gOut').textContent = g;
    if (!c) { $('#sum').innerHTML = `<div class="l"><span>Typical price</span><span>£29 to £42 / guest</span></div><div class="l"><span>Guests</span><span>${g}</span></div><div class="l t"><span>Estimate</span><span>${money(g * 29 * (1 + FEE))} to ${money(g * 42 * (1 + FEE))}</span></div>`; return; }
    const m = c.menus[+fm.value || 0], cp = g * m.p, fee = cp * FEE;
    $('#sum').innerHTML = `<div class="l"><b>${esc(m.n)}</b></div><div class="l"><span>${g} × ${money(m.p)}</span><span>${money(cp)}</span></div><div class="l"><span>Booking fee (15%)</span><span>${money(fee)}</span></div><div class="l t"><span>Total</span><span>${money(cp + fee)}</span></div>${g < c.min ? `<p class="err">${esc(c.name)} needs at least ${c.min} guests.</p>` : ''}`; };
  const fill = () => { const c = CHEFS.find(x => x.id === fc.value); fm.innerHTML = c ? c.menus.map((m, k) => `<option value="${k}">${esc(m.n)} · ${money(m.p)}/guest</option>`).join('') : '<option value="">Chef will suggest a menu</option>'; if (c && wantMenu != null && c.menus[wantMenu]) fm.value = wantMenu; wantMenu = null; calc(); };
  fc.onchange = fill; fm.onchange = calc; fg.oninput = calc; fd.oninput = () => { $('#consentBox').style.display = fd.value.trim() ? 'flex' : 'none'; }; fill();
  $('#rf').onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target).entries()); const err = [];
    if (!d.date) err.push('the event date'); if (!/^[A-Za-z]{1,2}\d/.test((d.postcode || '').trim())) err.push('a London postcode');
    if (!(d.name || '').trim()) err.push('your name'); if (!/^[+0-9 ]{10,16}$/.test((d.phone || '').trim())) err.push('a valid WhatsApp number');
    if ((d.dietary || '').trim() && !$('#fConsent').checked) err.push('your consent to use the allergy information');
    const c = CHEFS.find(x => x.id === d.chef); if (c && +d.guests < c.min) err.push(`at least ${c.min} guests for ${c.name}`);
    if (err.length) { $('#err').textContent = 'Please add ' + err.join(', ') + '.'; return; }
    const m = c ? c.menus[+d.menu || 0] : null, g = +d.guests;
    const r = { id: 'CM-' + Date.now().toString(36).toUpperCase().slice(-6), created: new Date().toISOString(), status: 'New', chef: c ? c.name : 'Match me', menu: m ? m.n : '', guests: g, occasion: d.occasion, date: d.date, postcode: d.postcode.toUpperCase().trim(), dietary: d.dietary, consent: !!(d.dietary || '').trim(), name: d.name.trim(), phone: d.phone.trim(), notes: d.notes, estimate: m ? Math.round(g * m.p * (1 + FEE)) : null };
    const all = store.get(); all.unshift(r); store.set(all); location.hash = '#/done/' + r.id; };
}
function donePage(id) {
  const r = store.get().find(x => x.id === id) || mem.find(x => x.id === id);
  if (!r) return `<section><div class="wrap empty">Request not found. <a href="#/request">Start again</a></div></section>`;
  const txt = `Hi ChefMii, I've sent request ${r.id}.\nOccasion: ${r.occasion}\nDate: ${r.date}\nGuests: ${r.guests}\nPostcode: ${r.postcode}\nChef: ${r.chef}${r.menu ? ' (' + r.menu + ')' : ''}${r.estimate ? '\nEstimate: ' + money(r.estimate) : ''}\nName: ${r.name}`;
  return `<div class="wrap done"><div class="tick">${ic('check')}</div><h1 style="font-size:40px">Request sent</h1><p>Thanks ${esc(r.name)}. Your reference is <b>${r.id}</b>. Jo will WhatsApp you within 24 hours with your chef and quote.</p>
    <p class="muted">For a faster reply, send it on WhatsApp now.</p><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(txt)}">Send on WhatsApp</a><p style="margin-top:20px"><a href="#/chefs">Browse more chefs</a></p></div>`;
}
function joinPage() {
  return `<section class="hero" style="background-position:center 40%"><div class="wrap" style="padding:70px 20px 60px"><p class="eyebrow" style="color:#F4B393">For chefs</p><h1>Get booked for London's best parties</h1>
    <p class="lead">Join ChefMii as a founding chef. Free verified profile, we film your cooking, and you keep 100% of your price.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" target="_blank" rel="noopener" href="${CHEF_FORM}">Apply as a founding chef (3 min)</a><a class="btn btn-light" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent("Hi Jo, I'm a chef and I'd like to join ChefMii")}">Ask Jo on WhatsApp</a></div></div></section>
  <section><div class="wrap"><div class="steps"><div class="step"><div class="n">100%</div><h3>Keep your price</h3><p>The host pays the ChefMii booking fee, not you.</p></div><div class="step"><div class="n">Free</div><h3>Filming and profile</h3><p>We film two short cooking clips and set up your menus and prices.</p></div><div class="step"><div class="n">48h</div><h3>Paid fast</h3><p>Payment is taken upfront and paid to you within 48 hours of the event.</p></div></div></div></section>
  <section class="bg-cream"><div class="wrap" style="max-width:900px"><p class="eyebrow">Verification</p><h2>How we verify chefs</h2><p class="muted">We check everything and keep as little as possible. We never keep copies of your ID.</p>
  <table class="tbl" style="background:#fff;border-radius:14px;overflow:hidden;margin-top:14px"><tr><th>Step</th><th>What happens</th><th>Time</th></tr>
  ${[['Apply', 'Fill in the short form', '3 min'], ['Call', '15-minute WhatsApp video call with Jo', '15 min'], ['ID check', 'Show photo ID on the call. We record that it was checked, not a copy', '5 min'], ['Food safety', 'Council food business registration, food hygiene training and allergen training (the free FSA course is fine)', '10 min'], ['Insurance', 'Public liability insurance', '5 min'], ['Taste and film', 'Cook two signature dishes; we film and agree menus', '2 to 3 hrs'], ['Go live', 'Sign the chef agreement and your profile goes live', '10 min']].map((r, i) => `<tr><td><b>${i + 1}. ${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
  <p class="small muted" style="margin-top:12px">Help: <a target="_blank" rel="noopener" href="https://www.food.gov.uk/business-guidance/how-to-register-a-food-business">Register a food business (FSA)</a> · <a target="_blank" rel="noopener" href="https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses">Allergen guidance (FSA)</a></p></div></section>`;
}
const UPDATED = '21 November 2026';
function privacyPage() {
  return `<div class="wrap legal"><p class="eyebrow">Legal</p><h1>Privacy policy</h1><p class="muted">Last updated ${UPDATED}. Draft for the ChefMii prototype; it will be reviewed before launch.</p>
  <h2>1. Who we are</h2><p>ChefMii ("we", "us") helps people in London book West African private chefs. ChefMii is run by Joseph Osei-Bonsu, East London, United Kingdom, and is not yet a registered company. We are the controller of your personal data. Contact: <a href="mailto:job.archteam4@gmail.com">job.archteam4@gmail.com</a> or <a href="https://wa.me/${WA}">WhatsApp</a>.</p>
  <h2>2. What we collect and why</h2>
  <table><tr><th>Data</th><th>Why</th><th>Lawful basis (UK GDPR)</th><th>How long we keep it</th></tr>
  <tr><td>Hosts: name, WhatsApp number, event date, postcode, guest count, occasion, notes</td><td>To arrange your booking and send you a quote</td><td>Contract, or steps before a contract at your request</td><td>Up to 6 years after your event for accounting and legal claims; enquiries that do not become bookings: 12 months</td></tr>
  <tr><td>Allergy and dietary information</td><td>To plan a safe menu with your chef</td><td>Your explicit consent (special category health data)</td><td>Deleted 30 days after your event</td></tr>
  <tr><td>What you type into the AI concierge</td><td>To recommend chefs and menus</td><td>Legitimate interests (helping you choose)</td><td>Not stored by us; processed only to answer you</td></tr>
  <tr><td>Chefs: name, contact details, social handle, area, cuisines, menus, prices, videos and photos</td><td>To verify chefs and show their profile</td><td>Contract; consent for using videos in marketing</td><td>While the chef is active, then up to 6 years</td></tr>
  <tr><td>Chef checks: that ID, council registration, food hygiene and allergen training and insurance were checked, with expiry dates</td><td>Safety of hosts and fraud prevention</td><td>Legitimate interests</td><td>While the chef is active, then up to 6 years. We never keep copies of ID documents</td></tr>
  <tr><td>Your cookie choice</td><td>To remember your choice</td><td>Legitimate interests; strictly necessary storage</td><td>12 months</td></tr></table>
  <h2>3. Who we share it with</h2><p>Your booked chef (only what they need for your event, including allergies if you consented). Service providers who host or run ChefMii for us: Vercel (website hosting), Google (forms and email), Meta (WhatsApp, if you choose to message us), a payment provider when payments launch, and, if switched on, an AI model provider that processes concierge requests. We do not sell your data and we do not use advertising cookies.</p>
  <h2>4. International transfers</h2><p>Some providers process data outside the UK, for example in the United States. Where they do, we rely on UK adequacy regulations (including the UK-US data bridge where the provider is certified) or the UK International Data Transfer Agreement or Addendum.</p>
  <h2>5. Your rights</h2><p>You can ask to access, correct or delete your data, restrict or object to how we use it, move it to another service, and withdraw consent at any time (for example for allergy information or marketing). Contact us using the details above. We reply within one month.</p>
  <h2>6. Complaints</h2><p>Please tell us first. You can also complain to the Information Commissioner's Office: <a target="_blank" rel="noopener" href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</a>.</p>
  <h2>7. Security</h2><p>Accounts are protected with two-step sign-in, access is limited to the founder, and we collect only what we need.</p>
  <h2>8. Cookies</h2><p>See our <a href="#/cookies">cookie policy</a>.</p>
  <h2>9. This prototype</h2><p>In this prototype, booking requests are saved only in your own browser and sent to us only if you press "Send on WhatsApp". Chef profiles are demo data.</p>
  <h2>10. Changes</h2><p>We will update this page and the date above if anything changes.</p></div>`;
}
function cookiesPage() {
  return `<div class="wrap legal"><p class="eyebrow">Legal</p><h1>Cookie policy</h1><p class="muted">Last updated ${UPDATED}.</p>
  <p>Cookies and similar technologies (like your browser's local storage) store small pieces of information on your device. Under the Privacy and Electronic Communications Regulations we must tell you what we use and ask your consent for anything that is not strictly necessary (<a target="_blank" rel="noopener" href="https://ico.org.uk/for-organisations/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies/">ICO guidance</a>).</p>
  <table><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Category</th><th>Expires</th></tr>
  <tr><td>chefmii_consent_v1</td><td>Local storage, first party</td><td>Remembers your cookie choice</td><td>Strictly necessary</td><td>Until you change it (we ask again after 12 months)</td></tr>
  <tr><td>chefmii_requests</td><td>Local storage, first party</td><td>Keeps booking requests you send from this device so you can see your reference</td><td>Strictly necessary</td><td>Until you clear it</td></tr>
  <tr><td>chefmii_last_search</td><td>Local storage, first party</td><td>Remembers your last search (area, cuisine, guests)</td><td>Preferences (only with consent)</td><td>Until you clear it or withdraw consent</td></tr>
  <tr><td>None in use</td><td>-</td><td>Analytics: not active in this prototype</td><td>Analytics (only with consent)</td><td>-</td></tr></table>
  <p>We do not use advertising or tracking cookies. Fonts and images are served from our own site, so no third party sets cookies when you visit.</p>
  <p>Links to WhatsApp, Google Forms and the ICO open other websites with their own cookie policies.</p>
  <p><button class="btn btn-primary" id="openCk">Change cookie settings</button></p></div>`;
}
function adminPage() {
  const all = store.get(), ST = ['New', 'Contacted', 'Quoted', 'Booked', 'Lost'];
  return `<section style="padding-top:40px"><div class="wrap"><h1 style="font-size:36px">Founder view</h1><p class="muted">Requests sent from this device (prototype: stored in this browser only).</p>
  <div style="display:flex;gap:10px;margin:14px 0"><button class="btn btn-outline" id="csv">Export CSV</button><button class="btn btn-ghost" id="clr">Clear demo data</button></div>
  ${all.length ? `<div style="overflow-x:auto"><table class="tbl"><tr><th>Ref</th><th>Status</th><th>Event</th><th>Chef and menu</th><th>Host</th><th>Estimate</th></tr>${all.map((r, i) => `<tr><td><b>${r.id}</b><div class="muted small">${new Date(r.created).toLocaleString('en-GB')}</div></td>
   <td><select class="select" data-i="${i}">${ST.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
   <td>${esc(r.occasion)}<div class="muted small">${esc(r.date)} · ${r.guests} guests · ${esc(r.postcode)}</div>${r.dietary ? `<div class="alert" style="margin-top:6px">ALLERGY CHECK: ${esc(r.dietary)}</div>` : ''}</td>
   <td>${esc(r.chef)}<div class="muted small">${esc(r.menu)}</div></td><td>${esc(r.name)}<div class="small"><a target="_blank" rel="noopener" href="https://wa.me/${esc(r.phone.replace(/\D/g, '').replace(/^0/, '44'))}">${esc(r.phone)}</a></div></td><td>${r.estimate ? money(r.estimate) : '-'}</td></tr>`).join('')}</table></div>` : '<div class="empty">No requests yet. Try the <a href="#/request">request form</a>.</div>'}</div></section>`;
}
function bindAdmin() {
  document.querySelectorAll('select[data-i]').forEach(s => s.onchange = () => { const a = store.get(); a[+s.dataset.i].status = s.value; store.set(a); });
  const c = $('#csv'); if (c) c.onclick = () => { const a = store.get(); if (!a.length) return; const k = Object.keys(a[0]);
    const csv = [k.join(',')].concat(a.map(r => k.map(x => '"' + String(r[x] ?? '').replace(/"/g, '""') + '"').join(','))).join('\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); l.download = 'chefmii_requests.csv'; l.click(); };
  const x = $('#clr'); if (x) x.onclick = () => { if (confirm('Delete all demo requests on this device?')) { store.set([]); render(); } };
}

/* ---------- router ---------- */
function render() {
  const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const parts = path.split('/'); const q = Object.fromEntries(new URLSearchParams(qs || ''));
  let html, after;
  switch (parts[0]) {
    case 'chefs': html = chefsPage(q); after = bindSearch; break;
    case 'chef': html = chefPage(parts[1]); break;
    case 'concierge': html = conciergePage(q); after = () => bindConcierge('cg', q.q || ''); break;
    case 'how': html = howBlock() + faq(); break;
    case 'request': html = requestPage(q); after = () => bindRequest(q); break;
    case 'done': html = donePage(parts[1]); break;
    case 'join': html = joinPage(); break;
    case 'privacy': html = privacyPage(); break;
    case 'cookies': html = cookiesPage(); after = () => { $('#openCk').onclick = cookieModal; }; break;
    case 'admin': html = adminPage(); after = bindAdmin; break;
    default: html = home(); after = () => { bindSearch(); bindConcierge('hm'); };
  }
  $('#app').innerHTML = html; if (after) after();
  document.querySelectorAll('.nav .links a').forEach(a => a.classList.toggle('on', a.dataset.r === parts[0]));
  $('#drawer').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
  document.title = ({ chefs: 'Find a chef', chef: 'Chef profile', concierge: 'AI concierge', request: 'Request a chef', join: 'For chefs', privacy: 'Privacy policy', cookies: 'Cookie policy', admin: 'Founder view', how: 'How it works' }[parts[0]] || 'Book a West African private chef in London') + ' · ChefMii';
}
$('#burger').onclick = () => { $('#drawer').style.top = Math.max(0, document.querySelector('.nav').getBoundingClientRect().bottom) + 'px'; const o = $('#drawer').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', String(o)); };
$('#cookieSettings').onclick = cookieModal;
$('#waFloat').href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi ChefMii, I'd like to book a chef");
window.addEventListener('hashchange', render);
render(); cookieBanner();
