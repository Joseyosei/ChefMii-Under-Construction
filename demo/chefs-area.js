// ChefMii TV, chef accounts (sign up / log in) and chef dashboard.
// PROTOTYPE: accounts and uploads are stored only in this browser (localStorage + IndexedDB).
// Production plan: Supabase Auth + Storage with row-level security.
import { CHEFS, CUISINES, AREAS } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);

/* ---------- auth (local, hashed with PBKDF2) ---------- */
const USERS = 'chefmii_chef_accounts', SESSION = 'chefmii_session';
const users = { all() { try { return JSON.parse(localStorage.getItem(USERS) || '[]'); } catch { return []; } }, save(a) { localStorage.setItem(USERS, JSON.stringify(a)); } };
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function hash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
}
export const auth = {
  current() { try { const s = JSON.parse(localStorage.getItem(SESSION)); return s && users.all().find(u => u.email === s.email) || null; } catch { return null; } },
  async signup(d) {
    const email = d.email.trim().toLowerCase(); if (users.all().some(u => u.email === email)) throw new Error('An account with this email already exists. Log in instead.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16))); const u = { id: 'c' + Date.now().toString(36), name: d.name.trim(), email, salt, hash: await hash(d.password, salt), cuisine: d.cuisine, area: d.area, bio: '', price: 30, minGuests: 10, dishes: '', created: new Date().toISOString(), checks: { applied: true } };
    users.save([...users.all(), u]); localStorage.setItem(SESSION, JSON.stringify({ email, at: Date.now() })); return u;
  },
  async login(email, pw) {
    const u = users.all().find(x => x.email === email.trim().toLowerCase()); if (!u || await hash(pw, u.salt) !== u.hash) throw new Error('Email or password is not right.');
    localStorage.setItem(SESSION, JSON.stringify({ email: u.email, at: Date.now() })); return u;
  },
  logout() { localStorage.removeItem(SESSION); },
  update(patch) { const a = users.all(); const i = a.findIndex(u => u.email === auth.current()?.email); if (i < 0) return; a[i] = { ...a[i], ...patch }; users.save(a); return a[i]; },
  remove() { const me = auth.current(); if (!me) return; users.save(users.all().filter(u => u.email !== me.email)); media.removeAll(me.email); auth.logout(); }
};

/* ---------- media store (IndexedDB) ---------- */
const DB = 'chefmii_media';
function db() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
export const media = {
  async all() { try { const d = await db(); return await new Promise(r => { const q = d.transaction('items').objectStore('items').getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); }); } catch { return []; } },
  async add(item) { const d = await db(); await new Promise((r, j) => { const t = d.transaction('items', 'readwrite'); t.objectStore('items').put(item); t.oncomplete = r; t.onerror = () => j(t.error); }); },
  async remove(id) { const d = await db(); await new Promise(r => { const t = d.transaction('items', 'readwrite'); t.objectStore('items').delete(id); t.oncomplete = r; }); },
  async removeAll(email) { for (const m of await media.all()) if (m.owner === email) await media.remove(m.id); }
};

/* ---------- ChefMii TV ---------- */
const BUILT_IN = CHEFS.flatMap(c => [
  ...(c.clip ? [{ id: c.id + '-clip', chef: c.id, title: c.clipCaption, kind: 'Cooking video', src: c.clip, poster: c.clipPoster, shape: 'wide' }] : []),
  { id: c.id + '-reel', chef: c.id, title: `Meet ${c.name}: ${c.dishes[0].toLowerCase()} and set menus`, kind: 'Chef reel', src: c.video, poster: c.poster, shape: 'tall' }
]);
let tvFilter = 'All';
export async function tvPage() {
  const me = auth.current(); const mine = (await media.all()).filter(m => me && m.owner === me.email);
  const items = [...mine.map(m => ({ ...m, local: true })), ...BUILT_IN].filter(it => tvFilter === 'All' || (it.local ? (it.cuisine || '').includes(tvFilter) : CHEFS.find(c => c.id === it.chef).cuisine.includes(tvFilter)));
  return `<section class="tvhead"><div class="wrap"><p class="eyebrow" style="color:#F4B393">ChefMii TV</p><h1>Watch West African chefs cook</h1>
    <p class="lead">Short cooking videos and reels from ChefMii chefs. Find the food you love, then book the chef who made it.</p>
    <div class="chips" style="margin-top:18px">${['All', ...CUISINES].map(x => `<button class="chip ${tvFilter === x ? 'on' : ''}" data-tvf="${x}">${x}</button>`).join('')}</div></div></section>
  <section style="padding-top:36px"><div class="wrap">
    <div class="toolbar"><span class="muted">${items.length} videos · AI-generated demo content until real chefs are filmed</span>${me ? `<a class="btn btn-primary" href="#/dashboard/media">Upload a video</a>` : `<a class="btn btn-outline" href="#/signup">Chefs: upload your videos</a>`}</div>
    <div class="tvgrid">${items.map(it => { const c = CHEFS.find(x => x.id === it.chef);
      return `<button class="tvcard ${it.shape === 'tall' ? 'tall' : ''}" data-tv="${it.id}">
        <div class="tvthumb">${it.local ? (it.type.startsWith('image') ? `<img data-blob="${it.id}" alt="">` : `<video data-blob="${it.id}" muted playsinline preload="metadata"></video>`) : `<img src="${it.poster}" alt="" loading="lazy">`}<span class="tvplay"></span>${it.local ? '<span class="vidtag" style="background:#7A4A0B">Pending review · only you can see this</span>' : `<span class="vidtag">${it.kind}</span>`}</div>
        <div class="tvmeta"><b>${esc(it.title)}</b><span class="muted small">${it.local ? esc(me.name) + ' · your upload' : esc(c.name) + ' · ' + esc(c.cuisine.join(' and '))}</span></div></button>`; }).join('')}</div></div></section>`;
}
export async function bindTv(rerender) {
  document.querySelectorAll('[data-tvf]').forEach(b => b.onclick = () => { tvFilter = b.dataset.tvf; rerender(); });
  const all = await media.all(); const urls = {};
  document.querySelectorAll('[data-blob]').forEach(el => { const m = all.find(x => x.id === el.dataset.blob); if (m) { urls[m.id] = urls[m.id] || URL.createObjectURL(m.blob); el.src = urls[m.id]; } });
  document.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => {
    const id = b.dataset.tv; const it = BUILT_IN.find(x => x.id === id) || all.find(x => x.id === id); if (!it) return;
    const c = CHEFS.find(x => x.id === it.chef); const src = it.src || urls[it.id] || URL.createObjectURL(it.blob);
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="tvmodal">${(it.type || 'video').startsWith('image') ? `<img src="${src}" alt="">` : `<video src="${src}" autoplay controls playsinline></video>`}
      <div class="tvinfo"><b>${esc(it.title)}</b><span class="muted small">${c ? esc(c.name) + ' · ' + esc(c.area) : 'Your upload · pending review'}</span>
      ${c ? `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#/request?chef=${c.id}&menu=0">Request ${esc(c.name)}</a><a class="btn btn-outline" href="#/chef/${c.id}">View profile</a></div>` : ''}</div></div>`;
    bg.onclick = e => { if (e.target === bg) bg.remove(); }; document.body.appendChild(bg);
  });
}

/* ---------- sign up / log in ---------- */
export function signupPage() {
  return `<div class="wrap authwrap"><div class="authcard"><p class="eyebrow">For chefs</p><h1 style="font-size:34px">Create your chef account</h1>
    <p class="muted">Join ChefMii as a founding chef. It takes 2 minutes.</p>
    <form id="suf" novalidate>
      <div class="f"><label for="suName">Full name</label><input id="suName" name="name" autocomplete="name" maxlength="60"></div>
      <div class="f"><label for="suEmail">Email</label><input id="suEmail" name="email" type="email" autocomplete="email" maxlength="120"></div>
      <div class="f"><label for="suPw">Password</label><input id="suPw" name="password" type="password" autocomplete="new-password" minlength="8"><p class="small muted" style="margin:4px 0 0">At least 8 characters, with a number.</p></div>
      <div class="r2"><div class="f"><label for="suCui">Main cuisine</label><select id="suCui" name="cuisine">${CUISINES.map(c => `<option>${c}</option>`).join('')}<option>Other West African</option></select></div>
        <div class="f"><label for="suArea">Area</label><select id="suArea" name="area">${Object.keys(AREAS).map(a => `<option>${a}</option>`).join('')}</select></div></div>
      <div class="f check"><input type="checkbox" id="suOk"><label for="suOk" style="font-weight:400;margin:0">I agree to the ChefMii chef terms and have read the <a href="#/privacy">privacy policy</a>.</label></div>
      <p class="err" id="suErr" role="alert"></p>
      <button class="btn btn-primary" style="width:100%;padding:14px">Create account</button>
      <p class="small muted" style="text-align:center;margin-top:14px">Already have an account? <a href="#/login">Log in</a></p>
      <p class="small muted proto-note">Prototype: your account is stored only in this browser, with the password hashed. Do not reuse a real password.</p>
    </form></div></div>`;
}
export function bindSignup(go) {
  $('#suf').onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target).entries()); const err = [];
    if (d.name.trim().length < 2) err.push('your name'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) err.push('a valid email');
    if (d.password.length < 8 || !/\d/.test(d.password)) err.push('a password of 8+ characters with a number'); if (!$('#suOk').checked) err.push('agreement to the terms');
    if (err.length) { $('#suErr').textContent = 'Please add ' + err.join(', ') + '.'; return; }
    try { await auth.signup(d); go('#/dashboard'); } catch (x) { $('#suErr').textContent = x.message; } };
}
export function loginPage() {
  return `<div class="wrap authwrap"><div class="authcard"><p class="eyebrow">For chefs</p><h1 style="font-size:34px">Log in</h1><p class="muted">Welcome back. Manage your profile, menus and videos.</p>
    <form id="lif" novalidate>
      <div class="f"><label for="liEmail">Email</label><input id="liEmail" name="email" type="email" autocomplete="email"></div>
      <div class="f"><label for="liPw">Password</label><input id="liPw" name="password" type="password" autocomplete="current-password"></div>
      <p class="err" id="liErr" role="alert"></p>
      <button class="btn btn-primary" style="width:100%;padding:14px">Log in</button>
      <p class="small muted" style="text-align:center;margin-top:14px">New to ChefMii? <a href="#/signup">Create a chef account</a></p>
      <p class="small muted proto-note">Prototype: accounts only work in the browser where they were created. Password reset arrives with the real login system.</p>
    </form></div></div>`;
}
export function bindLogin(go) {
  $('#lif').onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target).entries());
    try { await auth.login(d.email, d.password); go('#/dashboard'); } catch (x) { $('#liErr').textContent = x.message; } };
}

/* ---------- dashboard ---------- */
const STEPS = [['applied', 'Apply', 'Account created'], ['call', 'Screening call', '15-minute video call with ChefMii'], ['id', 'ID check', 'Show photo ID on the call. We never keep a copy'], ['food', 'Food safety', 'Council registration, food hygiene and allergen training'], ['insurance', 'Insurance', 'Public liability insurance'], ['film', 'Taste and film', 'Cook two dishes; we film your clips'], ['live', 'Go live', 'Sign the chef agreement']];
export async function dashboardPage(tab = 'overview') {
  const me = auth.current(); if (!me) return null;
  const mine = (await media.all()).filter(m => m.owner === me.email);
  const done = STEPS.filter(s => me.checks?.[s[0]]).length;
  const profileFields = ['bio', 'dishes'].filter(k => (me[k] || '').trim()).length + (mine.length ? 1 : 0);
  const tabs = [['overview', 'Overview'], ['profile', 'Profile'], ['media', 'My videos'], ['bookings', 'Bookings'], ['verify', 'Verification']];
  let body = '';
  if (tab === 'overview') body = `<div class="kpis"><div class="kpi"><span>Verification</span><b>${done}/7</b><small>steps done</small></div><div class="kpi"><span>Profile</span><b>${Math.round(((profileFields + 2) / 5) * 100)}%</b><small>complete</small></div><div class="kpi"><span>Videos</span><b>${mine.length}</b><small>uploaded</small></div><div class="kpi"><span>Bookings</span><b>0</b><small>this month</small></div></div>
    <div class="panel"><h3>Next steps</h3><ol class="todo">${!(me.bio || '').trim() ? '<li><a href="#/dashboard/profile">Add your bio and signature dishes</a></li>' : ''}${!mine.length ? '<li><a href="#/dashboard/media">Upload your first cooking video</a></li>' : ''}<li><a href="#/dashboard/verify">Book your screening call</a></li></ol></div>`;
  if (tab === 'profile') body = `<form id="pf" class="panel"><h3>Your public profile</h3>
    <div class="r2"><div class="f"><label>Name shown to hosts</label><input name="name" value="${esc(me.name)}" maxlength="60"></div><div class="f"><label>Main cuisine</label><select name="cuisine">${[...CUISINES, 'Other West African'].map(c => `<option ${me.cuisine === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
    <div class="r2"><div class="f"><label>Area</label><select name="area">${Object.keys(AREAS).map(a => `<option ${me.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div><div class="f"><label>Signature dishes</label><input name="dishes" value="${esc(me.dishes)}" placeholder="e.g. Party jollof, Asun, Moi moi" maxlength="120"></div></div>
    <div class="f"><label>Bio</label><textarea name="bio" maxlength="400" placeholder="Where you learned to cook, what you cook best, which occasions you love">${esc(me.bio)}</textarea></div>
    <div class="r2"><div class="f"><label>Price from (per guest, £)</label><input name="price" type="number" min="15" max="200" value="${me.price}"></div><div class="f"><label>Minimum guests</label><input name="minGuests" type="number" min="2" max="100" value="${me.minGuests}"></div></div>
    <p class="err" id="pfMsg"></p><button class="btn btn-primary">Save profile</button></form>`;
  if (tab === 'media') body = `<form id="mf" class="panel"><h3>Upload to ChefMii TV</h3><p class="muted small">Short cooking videos (up to 60 seconds) or food photos. Every upload is reviewed by ChefMii before hosts can see it.</p>
    <div class="drop" id="drop"><input type="file" id="mFile" accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"><p><b>Choose a video or photo</b><br><span class="small muted">MP4, MOV, WebM, JPG or PNG · up to 50 MB</span></p></div>
    <div class="r2" style="margin-top:12px"><div class="f"><label for="mTitle">Title</label><input id="mTitle" maxlength="80" placeholder="e.g. Smoky party jollof for 30"></div><div class="f"><label for="mDish">Dish</label><input id="mDish" maxlength="60" placeholder="e.g. Jollof rice"></div></div>
    <div class="f check"><input type="checkbox" id="mOk"><label for="mOk" style="font-weight:400;margin:0">This is my own content, and everyone who appears in it agreed to be filmed and shown on ChefMii.</label></div>
    <p class="err" id="mErr"></p><button class="btn btn-primary">Upload</button></form>
    <div class="panel"><h3>My videos</h3>${mine.length ? `<div class="mgrid">${mine.map(m => `<div class="mitem">${m.type.startsWith('image') ? `<img data-blob="${m.id}" alt="">` : `<video data-blob="${m.id}" muted controls playsinline preload="metadata"></video>`}<b>${esc(m.title)}</b><span class="small muted">${esc(m.dish)} · ${esc(m.status)}</span><button class="btn btn-ghost small" data-del="${m.id}">Delete</button></div>`).join('')}</div>` : '<p class="muted">No uploads yet.</p>'}</div>`;
  if (tab === 'bookings') body = `<div class="panel"><h3>Bookings</h3><p class="muted">No booking requests yet. When a host requests you, it appears here with the date, guests, postcode, menu and any ALLERGY CHECK.</p>
    <table class="tbl"><tr><th>Date</th><th>Occasion</th><th>Guests</th><th>Menu</th><th>Status</th></tr><tr><td colspan="5" class="muted">Nothing yet</td></tr></table></div>`;
  if (tab === 'verify') body = `<div class="panel"><h3>Verification (${done}/7)</h3><p class="muted small">We check everything and keep as little as possible. We record that a check was done and its expiry date, never copies of your ID.</p>
    <ol class="steps7">${STEPS.map(([k, t, d]) => `<li class="${me.checks?.[k] ? 'ok' : ''}"><b>${t}</b><span class="small muted">${d}</span><em>${me.checks?.[k] ? 'Done' : 'To do'}</em></li>`).join('')}</ol>
    <a class="btn btn-primary" target="_blank" rel="noopener" href="https://docs.google.com/forms/d/e/1FAIpQLSfwKH4BPHk4PS9OFk5tmeU3t1C-YFD4oieRsf6PxRnTDeTtQQ/viewform">Book your screening call</a></div>`;
  return `<div class="wrap dash"><aside class="dside"><div class="who"><span class="avatar" style="background:#B9481E">${esc(me.name.slice(0, 1))}</span><div><b>${esc(me.name)}</b><span class="small muted">${esc(me.cuisine)} · ${esc(me.area)}</span></div></div>
    <nav>${tabs.map(([k, l]) => `<a href="#/dashboard/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}<a href="#/tv">ChefMii TV</a></nav>
    <button class="btn btn-ghost" id="logout" style="margin-top:10px">Log out</button><button class="linkdanger" id="delacc">Delete my account</button></aside>
    <section class="dmain"><p class="proto-note small">Prototype dashboard: data is saved only in this browser.</p><h1 style="font-size:32px">${tabs.find(t => t[0] === tab)?.[1] || 'Overview'}</h1>${body}</section></div>`;
}
export async function bindDashboard(go, rerender) {
  const lo = $('#logout'); if (lo) lo.onclick = () => { auth.logout(); go('#/login'); };
  const da = $('#delacc'); if (da) da.onclick = () => { if (confirm('Delete your ChefMii account and all your uploads from this browser? This cannot be undone.')) { auth.remove(); go('#/'); } };
  const pf = $('#pf'); if (pf) pf.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(pf).entries()); auth.update({ ...d, price: +d.price, minGuests: +d.minGuests }); $('#pfMsg').style.color = 'var(--ok)'; $('#pfMsg').textContent = 'Saved.'; };
  const all = await media.all();
  document.querySelectorAll('[data-blob]').forEach(el => { const m = all.find(x => x.id === el.dataset.blob); if (m) el.src = URL.createObjectURL(m.blob); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Delete this upload?')) { await media.remove(b.dataset.del); rerender(); } });
  const mf = $('#mf'); if (mf) mf.onsubmit = async e => { e.preventDefault(); const f = $('#mFile').files[0]; const err = [];
    if (!f) err.push('a video or photo'); else { if (f.size > 50 * 1024 * 1024) err.push('a file under 50 MB'); if (!/^(video|image)\//.test(f.type)) err.push('a video or photo file'); }
    if (!$('#mTitle').value.trim()) err.push('a title'); if (!$('#mOk').checked) err.push('your confirmation');
    if (err.length) { $('#mErr').textContent = 'Please add ' + err.join(', ') + '.'; return; }
    const me = auth.current();
    try { await media.add({ id: 'u' + Date.now().toString(36), owner: me.email, title: $('#mTitle').value.trim(), dish: $('#mDish').value.trim(), cuisine: me.cuisine, type: f.type, blob: f, created: new Date().toISOString(), status: 'Pending review' }); rerender(); }
    catch (x) { $('#mErr').textContent = 'Could not save the file in this browser (storage may be full).'; } };
}
