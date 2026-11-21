// Accessible "Agent monitor" panel: streams /api/monitor (Server-Sent Events over fetch).
const DEFAULT_DEPL = 'depl_015qQAdokxkBNmFH86Uxijec';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let ctrl = null, lastFocus = null;

export function mountMonitor() {
  const btn = document.createElement('button');
  btn.id = 'monBtn'; btn.className = 'mon-fab'; btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-controls', 'monPanel'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg><span>Agent monitor</span>';
  document.body.appendChild(btn);
  const panel = document.createElement('div');
  panel.id = 'monPanel'; panel.className = 'mon-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'monTitle'); panel.setAttribute('aria-describedby', 'monDesc');
  panel.innerHTML = `<div class="mon-head"><div><h2 id="monTitle">Agent monitor</h2><p id="monDesc" class="small muted">Follows the latest run of a Managed Agents deployment, sends it a message and shows the reply as it streams.</p></div>
    <button type="button" class="mon-x" id="monClose" aria-label="Close agent monitor">×</button></div>
    <form id="monForm" class="mon-form">
      <div class="f"><label for="monDepl">Deployment ID</label><input id="monDepl" value="${DEFAULT_DEPL}" autocomplete="off" spellcheck="false" pattern="depl_[A-Za-z0-9]+" aria-describedby="monDeplHint"><span id="monDeplHint" class="small muted">Starts with depl_</span></div>
      <div class="f"><label for="monCode">Access code</label><input id="monCode" type="password" autocomplete="off" aria-describedby="monCodeHint"><span id="monCodeHint" class="small muted">Set as MONITOR_TOKEN in Vercel. Kept only for this browser tab.</span></div>
      <div class="f"><label for="monMsg">Message to the agent</label><textarea id="monMsg" rows="3" maxlength="2000">Give me a short status update on your latest work.</textarea></div>
      <div class="mon-acts"><button class="btn btn-primary" id="monStart" type="submit">Start monitoring</button><button class="btn btn-outline" id="monStop" type="button" disabled>Stop</button><button class="btn btn-ghost" id="monClear" type="button">Clear</button></div>
    </form>
    <p class="mon-status" id="monStatus" role="status" aria-live="polite">Idle</p>
    <div class="mon-log" id="monLog" role="log" aria-live="polite" aria-relevant="additions" aria-label="Agent output" tabindex="0"></div>`;
  document.body.appendChild(panel);

  const $ = id => panel.querySelector('#' + id);
  try { $('monCode').value = sessionStorage.getItem('chefmii_monitor_code') || ''; } catch {}
  const open = () => { lastFocus = document.activeElement; panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.body.classList.add('mon-open'); $('monMsg').focus(); };
  const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('mon-open'); (lastFocus || btn).focus(); };
  btn.onclick = () => (panel.hidden ? open() : close());
  $('monClose').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(); } });
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('button:not([disabled]),input,textarea,[tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  const log = $('monLog');
  let current = null;
  const line = (cls, text) => { const p = document.createElement('p'); p.className = 'mon-line ' + cls; p.textContent = text; log.appendChild(p); stick(); return p; };
  const stick = () => { if (log.scrollHeight - log.scrollTop - log.clientHeight < 80) log.scrollTop = log.scrollHeight; };
  const status = t => { $('monStatus').textContent = t; };
  $('monClear').onclick = () => { log.innerHTML = ''; current = null; };
  $('monStop').onclick = () => { ctrl?.abort(); };

  $('monForm').onsubmit = async e => {
    e.preventDefault();
    const depl = $('monDepl').value.trim(), code = $('monCode').value, msg = $('monMsg').value.trim();
    if (!/^depl_[A-Za-z0-9]+$/.test(depl)) { status('Please enter a deployment ID that starts with depl_.'); $('monDepl').focus(); return; }
    if (!code) { status('Please enter the access code.'); $('monCode').focus(); return; }
    try { sessionStorage.setItem('chefmii_monitor_code', code); } catch {}
    ctrl = new AbortController(); $('monStart').disabled = true; $('monStop').disabled = false; status('Connecting…'); current = null;
    line('mon-sys', `▶ ${new Date().toLocaleTimeString('en-GB')} · ${depl}`);
    if (msg) line('mon-user', 'You: ' + msg);
    try {
      const r = await fetch('/api/monitor', { method: 'POST', headers: { 'content-type': 'application/json', 'x-monitor-token': code }, body: JSON.stringify({ deploymentId: depl, message: msg }), signal: ctrl.signal });
      if (!r.ok || !r.body) { let m = `HTTP ${r.status}`; try { m = (await r.json()).error || m; } catch {} throw new Error(m); }
      const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
          if (!data) continue; let ev; try { ev = JSON.parse(data); } catch { continue; }
          if (ev.type === 'text') { if (!current) current = line('mon-agent', 'Agent: '); current.textContent += ev.text; stick(); }
          else if (ev.type === 'runs') { line('mon-sys', `Recent runs: ${ev.runs.length ? ev.runs.map(x => `${x.id.slice(0, 12)}… ${x.created_at?.slice(0, 16).replace('T', ' ')} ${x.session_id ? '✓ session' : '✗ ' + (x.error || 'no session')}`).join(' · ') : 'none'}`); }
          else if (ev.type === 'status') { status(ev.text); line('mon-sys', ev.text); }
          else if (ev.type === 'done') { status(ev.text); line('mon-ok', '✓ ' + ev.text); current = null; }
          else if (ev.type === 'error') { status('Error: ' + ev.text); line('mon-err', '✗ ' + ev.text); current = null; }
        }
      }
    } catch (err) {
      if (ctrl.signal.aborted) { status('Stopped.'); line('mon-sys', '■ Stopped'); }
      else { status('Error: ' + err.message); line('mon-err', '✗ ' + err.message); }
    } finally { const hadFocus = panel.contains(document.activeElement) || document.activeElement === document.body; $('monStart').disabled = false; $('monStop').disabled = true; ctrl = null; if (hadFocus && !panel.hidden) $('monStart').focus(); }
  };
}
