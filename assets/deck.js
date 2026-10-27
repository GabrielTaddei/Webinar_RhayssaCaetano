(() => {
  const qs = new URLSearchParams(location.search);
  const PRINT = qs.has('print');
  const PRESENTER = qs.has('presenter');
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('kulzer-webinar-deck') : null;
  const root = document.documentElement;
  if (PRINT) root.classList.add('print');
  addEventListener('beforeprint', () => root.classList.add('print'));
  addEventListener('afterprint', () => { if (!PRINT) root.classList.remove('print'); });

  const deck = document.getElementById('deck');
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const wipe = document.getElementById('wipe');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = slides.length;
  let cur = -1, busy = false, queued = null;

  /* ---------- per-slide setup ---------- */
  const STOPS = [['Retraction','RetraXil blue'],['Bite','Bite registration'],['Impression','Flexitime unlimited'],['Cementation','iCEM Universal Plus']];
  slides.forEach(s => {
    s.querySelectorAll('[data-r]').forEach((el, i) => el.style.setProperty('--i', i));
    if (s.dataset.track !== 'none') {
      const st = +s.dataset.stage || 0;
      const t = document.createElement('div');
      t.className = 'track'; t.setAttribute('aria-label', Number.isInteger(st) && st >= 1 && st <= 4 ? `Case step ${st} of 4: ${STOPS[st-1][0]}` : 'Case steps');
      t.innerHTML = '<div class="fill"></div>' + STOPS.map((x, i) => {
        const k = i + 1, cls = st > 4 || k < st ? 'done' : (k === st ? 'now' : '');
        return `<div class="stop ${cls}"><i class="dot"></i><div><b>${x[0]}</b><span>${x[1]}</span></div></div>`;
      }).join('');
      t.dataset.fill = st > 4 ? 100 : Math.max(0, (Math.ceil(st) - 1) * (100 / 3));
      s.appendChild(t);
      const f = document.createElement('p'); f.className = 'folio'; f.textContent = String(s.dataset.n || '').padStart(2, '0');
      s.appendChild(f);
    }
  });
  const setFill = (s, on) => s.querySelectorAll('.track').forEach(t => t.querySelector('.fill').style.width = on ? `${t.dataset.fill * 0.75}%` : "0");
  if (PRINT) slides.forEach(s => setFill(s, true));

  /* ---------- Flexible-Time-Concept timeline ---------- */
  const ftc = document.getElementById('ftc');
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  if (ftc) {
    const pps = 5, max = 330, ticks = ftc.querySelector('.ticks');
    for (let t = 0; t <= max; t += 30) {
      const d = document.createElement('div'); d.className = 'tick' + (t % 60 === 0 ? ' major' : '');
      d.style.left = (t * pps - 1) + 'px'; d.innerHTML = `<span>${fmt(t)}</span>`; ticks.appendChild(d);
    }
    const range = ftc.querySelector('input');
    const set = h => {
      ftc.style.setProperty('--h', h);
      ftc.querySelector('[data-ftc=handling]').textContent = fmt(h) + ' min';
      ftc.querySelector('[data-ftc=out]').textContent = 'out at ' + fmt(h + 150) + ' min';
    };
    range.addEventListener('input', () => set(+range.value));
    ['keydown','pointerdown','click'].forEach(ev => range.addEventListener(ev, e => e.stopPropagation()));
    ftc.play = () => {
      if (reduced) return set(150);
      set(60); range.value = 60;
      const t0 = performance.now(), dur = 2600, delay = 700;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - t0 - delay) / dur));
        const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const v = Math.round((60 + 90 * e) / 5) * 5; set(v); range.value = v;
        if (p < 1 && slides[cur] && slides[cur].contains(ftc)) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    set(150);
  }

  /* ---------- counters & timers ---------- */
  const countUp = s => s.querySelectorAll('[data-count]').forEach((el, i) => {
    const to = +el.dataset.count, dec = +(el.dataset.dec || 0);
    if (reduced) return;
    const t0 = performance.now() + 250 + i * 90, dur = 1500;
    el.textContent = (0).toFixed(dec);
    const step = now => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const runTimers = s => s.querySelectorAll('[data-timer]').forEach(el => {
    if (reduced) return;
    const secs = +el.dataset.timer, ring = el.parentElement.querySelector('.fg'), C = 364.4;
    const t0 = performance.now() + 900, dur = 3200; // a 3-second visual sweep of the 2-minute dwell
    const step = now => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      ring.style.strokeDashoffset = (C * p).toFixed(1);
      el.textContent = fmt(secs * (1 - p));
      if (p < 1) requestAnimationFrame(step); else setTimeout(() => { ring.style.transition = 'stroke-dashoffset .8s'; ring.style.strokeDashoffset = 0; el.textContent = fmt(secs); setTimeout(() => ring.style.transition = '', 900); }, 900);
    };
    requestAnimationFrame(step);
  });

  /* ---------- wipe content per chapter ---------- */
  const WIPES = {
    retraxil: '<img class="logo" src="assets/retraxil-logo-white.svg" alt="">',
    bite: '<p class="logo bite-word">Bite registration</p>',
    flexitime: '<div class="logo fx-lockup" style="align-items:center"><span class="name">Flexitime<sup>®</sup></span><span class="bar">unlimited</span></div>',
    icem: '<img class="logo" src="assets/icem-logo-white.svg" alt="" style="height:190px">'
  };

  /* ---------- navigation ---------- */
  const draw = s => s.querySelectorAll('[data-draw]').forEach((el, i) => {
    if (reduced) return;
    const len = el.getTotalLength(); el.style.transition = 'none';
    el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
    el.getBoundingClientRect();
    el.style.transition = `stroke-dashoffset 1.3s cubic-bezier(.6,0,.2,1) ${(+el.dataset.draw || 0) * 1 + 300}ms`;
    el.style.strokeDashoffset = 0;
  });
  function enter(s) {
    s.classList.add('is-active');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      s.classList.add('is-in'); setFill(s, true); countUp(s); runTimers(s); draw(s);
      if (ftc && s.contains(ftc)) ftc.play();
    }));
  }
  function leave(s) { s.classList.remove('is-active', 'is-in'); setFill(s, false); }

  function ui() {
    document.getElementById('count').textContent = `${cur + 1} / ${total}`;
    document.getElementById('progress').style.width = `${((cur + 1) / total) * 100}%`;
    const n = slides[cur].querySelector('.notes');
    document.getElementById('notesText').textContent = n ? n.textContent.trim() : 'No notes for this slide.';
    history.replaceState(null, '', `#${cur + 1}`);
    if (PRESENTER) {
      const nx = slides[cur + 1];
      document.getElementById('pNow').textContent = `${cur + 1} / ${total}  ${slides[cur].getAttribute('aria-label') || ''}`;
      document.getElementById('pNext').textContent = nx ? `Next: ${nx.getAttribute('aria-label')}` : 'Last slide';
      document.getElementById('pNotes').textContent = n ? n.textContent.trim() : '';
    }
  }

  async function go(n, remote) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === cur) return;
    if (bc && !remote) bc.postMessage({ n });
    if (busy) { queued = n; return; }
    const a = slides[cur], b = slides[n], dir = n > cur ? 1 : -1;
    const ch = b.dataset.chapter;
    const wipeIt = a && !reduced && a.dataset.chapter !== ch && WIPES[ch];
    cur = n; ui();
    if (!a) { enter(b); return; }
    if (!wipeIt) { leave(a); enter(b); return; }
    busy = true;
    wipe.dataset.c = ch; wipe.innerHTML = WIPES[ch]; wipe.classList.remove('show-logo');
    const from = dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
    const to = dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
    await wipe.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { duration: 620, easing: 'cubic-bezier(.75,0,.25,1)', fill: 'forwards' }).finished;
    leave(a); b.classList.add('is-active');
    wipe.classList.add('show-logo');
    await new Promise(r => setTimeout(r, 650));
    enter(b);
    await wipe.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: to }], { duration: 620, easing: 'cubic-bezier(.75,0,.25,1)', fill: 'forwards' }).finished;
    wipe.classList.remove('show-logo');
    busy = false;
    if (queued !== null) { const q = queued; queued = null; go(q); }
  }
  const base = () => (busy && queued !== null ? queued : cur);
  const next = () => go(base() + 1), prev = () => go(base() - 1);

  /* ---------- scaling ---------- */
  function fit() {
    if (deck.classList.contains('overview')) return layoutOverview();
    if (PRESENTER) { stage.style.setProperty('--s', Math.min(innerWidth * 0.58 / 1920, (innerHeight - 40) / 1080)); return; }
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--s', s);
  }
  addEventListener('resize', fit);

  /* ---------- overview ---------- */
  function layoutOverview() {
    stage.querySelectorAll('.slide-wrap').forEach(w => {
      const s = w.firstElementChild; w.style.height = (w.clientWidth * 9 / 16) + 'px'; s.style.setProperty('--os', w.clientWidth / 1920);
    });
  }
  function toggleOverview(force) {
    const on = force ?? !deck.classList.contains('overview');
    if (on) {
      slides.forEach((s, i) => {
        const w = document.createElement('div'); w.className = 'slide-wrap' + (i === cur ? ' current' : '');
        s.before(w); w.appendChild(s); s.classList.add('is-in');
        w.addEventListener('click', e => { e.stopPropagation(); toggleOverview(false); const c = cur; cur = -1; slides.forEach(leave); go(i); });
      });
      deck.classList.add('overview'); requestAnimationFrame(layoutOverview);
    } else {
      stage.querySelectorAll('.slide-wrap').forEach(w => { const sl = w.firstElementChild; sl.style.removeProperty('--os'); w.before(sl); w.remove(); });
      deck.classList.remove('overview');
      slides.forEach((s, i) => { if (i !== cur) leave(s); });
      fit();
    }
  }

  /* ---------- input ---------- */
  const notes = document.getElementById('notesPanel'), help = document.getElementById('help');
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    const k = e.key;
    if (['ArrowRight','PageDown',' ','Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft','PageUp','Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(total - 1);
    else if (k === 'f' || k === 'F') full();
    else if (k === 'p' || k === 'P') window.open(location.pathname + '?presenter#' + (cur + 1), 'kulzer-presenter', 'width=1280,height=760');
    else if (k === 'n' || k === 'N') notes.classList.toggle('open');
    else if (k === 'g' || k === 'G' || (k === 'Escape' && deck.classList.contains('overview'))) toggleOverview();
    else if (k === '?') help.classList.toggle('open');
    else if (k === 'Escape') { help.classList.remove('open'); notes.classList.remove('open'); }
  });
  function full() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
  stage.addEventListener('click', e => {
    if (deck.classList.contains('overview') || e.target.closest('input,button,a')) return;
    const r = stage.getBoundingClientRect();
    (e.clientX - r.left) < r.width * 0.3 ? prev() : next();
  });
  let tx = null;
  addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  addEventListener('touchend', e => { if (tx === null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) d < 0 ? next() : prev(); tx = null; });
  document.getElementById('bPrev').onclick = e => { e.stopPropagation(); prev(); };
  document.getElementById('bNext').onclick = e => { e.stopPropagation(); next(); };
  document.getElementById('bFull').onclick = e => { e.stopPropagation(); full(); };
  document.getElementById('bNotes').onclick = e => { e.stopPropagation(); notes.classList.toggle('open'); };
  document.getElementById('bGrid').onclick = e => { e.stopPropagation(); toggleOverview(); };
  help.onclick = () => help.classList.remove('open');
  let hudT;
  addEventListener('pointermove', () => { deck.classList.add('show-hud'); clearTimeout(hudT); hudT = setTimeout(() => deck.classList.remove('show-hud'), 2200); });
  addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10) - 1; if (!isNaN(n) && n !== cur) go(n); });

  if (bc) bc.onmessage = e => { if (typeof e.data?.n === 'number') go(e.data.n, true); };
  if (PRESENTER) {
    root.classList.add('presenter');
    const p = document.createElement('aside'); p.className = 'presenter-panel';
    p.innerHTML = '<p class="clock" id="pClock">00:00</p><p id="pNow"></p><p id="pNext"></p><div id="pNotes"></div><p class="hint">Arrows move both windows. Click the clock to reset it.</p>';
    document.body.appendChild(p);
    let t0 = Date.now();
    const tick = () => { const s = Math.floor((Date.now() - t0) / 1000); document.getElementById('pClock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    setInterval(tick, 1000); document.getElementById('pClock').onclick = () => { t0 = Date.now(); tick(); };
  }

  /* ---------- start ---------- */
  if (!PRINT) {
    fit();
    const start = parseInt(location.hash.slice(1), 10) - 1;
    go(isNaN(start) ? 0 : start);
  }
})();
