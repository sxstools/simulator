(() => {
  'use strict';

  const STAGE_W = 1206, STAGE_H = 2622;
  const CLASS_ID = 'sage';
  const STORE_KEY = 'sxs-prayer-sim-v1';
  const PULLS = 100, COST = 100;

  // Drop rates (SPEC §5) and pity (SPEC §6). Index order matters: higher = rarer.
  const TIERS = [
    { id: 'shard', rate: 0.70 },
    { id: 'rare', rate: 0.22 },
    { id: 'epic', rate: 0.07 },
    { id: 'legendary', rate: 0.01 },
  ];
  const PITY = { rare: 10, epic: 30, legendary: 70 };

  // Reveal timing (SPEC §2 / §3.4), in ms.
  const T = { okToDim: 200, dimToFirst: 400, interval: 100 };

  // Grid layout in stage px, relative to the top of #grid.
  const COL_X = { M: 604, L: 247, R: 960 };
  const ROW_PITCH = 286, SIDE_Y0 = 249, MID_RAISE = 109;
  const SCROLL_ANCHOR = 1540; // newest item's center stays about here in the grid viewport

  const DEFAULT_STATE = {
    gems: 307,
    orange: '5.88K',
    prayersToday: 0,
    prayersTodayDate: null,
    points: 3,
    sinceRare: 0,
    sinceEpic: 0,
    sinceLegendary: 43,
    sagePity: 3,
    skipConfirmUntil: 0,
  };

  const $ = (sel) => document.querySelector(sel);
  const params = new URLSearchParams(location.search);

  // ---------- RNG ----------
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return h >>> 0;
  }
  const rng = params.has('seed')
    ? mulberry32(hashSeed(params.get('seed')))
    : () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

  // ---------- State ----------
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function loadState() {
    let s = { ...DEFAULT_STATE };
    try { Object.assign(s, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) { /* storage unavailable */ }
    if (s.prayersTodayDate !== todayStr()) { s.prayersToday = 0; s.prayersTodayDate = todayStr(); }
    return s;
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }
  let state = loadState();

  // ---------- Rolling ----------
  const pool = window.SKILLS[CLASS_ID];
  const fullByRarity = { rare: [], epic: [], legendary: [] };
  pool.full.forEach((s) => fullByRarity[s.rarity].push(s));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  function rollTier(minIdx) {
    const allowed = TIERS.slice(minIdx);
    const total = allowed.reduce((sum, t) => sum + t.rate, 0);
    let r = rng() * total;
    for (let i = 0; i < allowed.length; i++) {
      r -= allowed[i].rate;
      if (r < 0) return minIdx + i;
    }
    return TIERS.length - 1;
  }

  function makeResult(kind, id) {
    if (kind === 'shard') {
      const s = pool.shards.find((x) => x.id === id);
      return { kind: 'shard', tier: 0, id, label: s.label, icon: `assets/icons/${id}_shard.png` };
    }
    const s = pool.full.find((x) => x.id === id);
    return { kind: s.rarity, tier: TIERS.findIndex((t) => t.id === s.rarity), id, label: s.label, icon: `assets/icons/${id}.png` };
  }

  function applyPityCounters(tier) {
    state.sinceRare++; state.sinceEpic++; state.sinceLegendary++;
    if (tier >= 1) state.sinceRare = 0;
    if (tier >= 2) state.sinceEpic = 0;
    if (tier >= 3) state.sinceLegendary = 0;
  }

  function rollOne() {
    // A guaranteed pull re-rolls among the allowed tiers with their relative rates (SPEC §6),
    // which is the same as rolling directly among those tiers.
    let min = 0;
    if (state.sinceLegendary >= PITY.legendary - 1) min = 3;
    else if (state.sinceEpic >= PITY.epic - 1) min = 2;
    else if (state.sinceRare >= PITY.rare - 1) min = 1;
    const tier = rollTier(min);
    const res = tier === 0 ? makeResult('shard', pick(pool.shards).id) : makeResult('full', pick(fullByRarity[TIERS[tier].id]).id);
    applyPityCounters(res.tier);
    return res;
  }

  function rollSession() {
    const replay = params.get('replay') === 'video';
    const results = [];
    for (let i = 0; i < PULLS; i++) {
      if (replay) {
        const [k, id] = window.VIDEO_REPLAY[i].split(':');
        const res = makeResult(k === 's' ? 'shard' : 'full', id);
        applyPityCounters(res.tier);
        results.push(res);
      } else {
        results.push(rollOne());
      }
    }
    state.gems -= COST;
    state.prayersToday += PULLS;
    state.prayersTodayDate = todayStr();
    state.points += PULLS;
    // Sage Skill guarantee is still TBD (SPEC §6); placeholder: -1 per session with a Legendary.
    if (results.some((r) => r.tier === 3)) state.sagePity = state.sagePity <= 1 ? 3 : state.sagePity - 1;
    saveState();
    return results;
  }

  // ---------- Stage scaling ----------
  const stage = $('#stage');
  let scale = 1;
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / STAGE_W, vh / STAGE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  fit();

  function toStage(e) {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }
  function ripple(e) {
    const p = toStage(e);
    const el = document.createElement('div');
    el.className = 'ripple';
    el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }
  function tap(el, fn) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); ripple(e); fn(e); });
  }

  // ---------- Screens ----------
  function show(id, slow) {
    document.querySelectorAll('.screen').forEach((s) => {
      s.classList.toggle('slow', !!slow);
      s.classList.toggle('active', s.id === id);
    });
  }

  function renderCounters() {
    document.querySelectorAll('.gem-count').forEach((el) => { el.textContent = state.gems; });
    const full = state.points >= 50;
    $('#points').innerHTML = `<span class="${full ? 'full' : ''}">${state.points}</span>/50`;
    $('#prayers-plaque').textContent = `Prayers Today: ${state.prayersToday}/10000`;
    $('#leg-away').textContent = PITY.legendary - state.sinceLegendary;
    $('#sage-away').textContent = state.sagePity;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1400);
  }

  // Home
  tap($('#statue'), () => { renderCounters(); show('prayer'); });

  // Prayer
  tap($('#prayer-back'), () => show('home'));
  tap($('#pray1'), () => {});
  tap($('#pray10'), () => {});
  tap($('#pray100'), () => {
    if (Date.now() < state.skipConfirmUntil) { startDraw(); return; }
    $('#dont-show').checked = false;
    openConfirm(true);
  });
  function openConfirm(open) {
    $('#confirm').hidden = !open;
    $('#prayer').classList.toggle('behind-dialog', open);
  }

  // Hidden reset: hold the "Prayer" title for 2 s.
  let holdTimer;
  const titleHold = $('#title-hold');
  titleHold.addEventListener('pointerdown', () => {
    holdTimer = setTimeout(() => {
      state = { ...DEFAULT_STATE, prayersTodayDate: todayStr() };
      saveState(); renderCounters(); toast('Reset to starting values');
    }, 2000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => titleHold.addEventListener(ev, () => clearTimeout(holdTimer)));

  // Confirm
  tap($('#cancel'), () => openConfirm(false));
  tap($('#ok'), () => {
    if ($('#dont-show').checked) {
      const m = new Date(); m.setHours(24, 0, 0, 0);
      state.skipConfirmUntil = m.getTime(); saveState();
    }
    openConfirm(false);
    startDraw();
  });
  $('.radio').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const cb = $('#dont-show'); cb.checked = !cb.checked;
  });

  // ---------- Draw ----------
  const grid = $('#grid'), inner = $('#grid-inner'), drawScreen = $('#draw'), bottom = $('#draw-bottom');
  let run = null;

  function slotFor(i) {
    const row = Math.floor(i / 3), col = ['M', 'L', 'R'][i % 3];
    const sideY = SIDE_Y0 + row * ROW_PITCH;
    return { x: COL_X[col], y: col === 'M' ? sideY - MID_RAISE : sideY };
  }

  function buildTile(res, i) {
    const { x, y } = slotFor(i);
    const el = document.createElement('div');
    el.className = `tile ${res.kind}`;
    el.style.left = `${x - 99}px`; el.style.top = `${y - 99}px`;
    const longest = Math.max(...res.label.split('\n').map((l) => l.length));
    let html = `<div class="halo"></div><div class="glow"></div><img src="${res.icon}" alt="">`;
    if (res.kind === 'shard') html += '<div class="badge">3</div>';
    html += `<div class="label${longest > 14 ? ' small' : ''}"></div>`;
    if (res.tier >= 1) {
      const n = 4 + res.tier * 2;
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2, r0 = 70 + rng() * 40, r1 = 110 + rng() * 60;
        html += `<i class="spark" style="left:${99 + Math.cos(a) * r0}px;top:${99 + Math.sin(a) * r0}px;` +
          `--dx:${Math.cos(a) * (r1 - r0)}px;--dy:${Math.sin(a) * (r1 - r0)}px;animation-delay:${Math.round(rng() * 300)}ms"></i>`;
      }
    }
    el.innerHTML = html;
    el.querySelector('.label').textContent = res.label;
    return el;
  }

  function startDraw() {
    const gemsBefore = state.gems;
    const results = rollSession();

    inner.innerHTML = '';
    const tiles = results.map((r, i) => { const t = buildTile(r, i); inner.appendChild(t); return t; });
    const last = slotFor(PULLS - 1);
    inner.style.height = `${last.y + SIDE_Y0 + 60}px`;
    grid.classList.remove('scrollable');
    grid.scrollTop = 0;
    bottom.classList.remove('show');
    drawScreen.classList.remove('done');
    $('#draw-today').textContent = `Prayers Today: ${state.prayersToday}/10000`;
    drawScreen.querySelectorAll('.gem-count').forEach((el) => { el.textContent = gemsBefore; });

    run = { tiles, results, shown: 0, start: 0, scroll: 0, raf: 0, finished: false };

    setTimeout(() => {
      show('draw', true);
      setTimeout(() => {
        drawScreen.querySelectorAll('.gem-count').forEach((el) => { el.textContent = state.gems; });
        run.start = performance.now();
        run.raf = requestAnimationFrame(tick);
      }, T.dimToFirst);
    }, T.okToDim);
  }

  function reveal(i) {
    run.tiles[i].classList.add('in');
    run.shown = i + 1;
  }

  function tick(now) {
    if (!run || run.finished) return;
    const due = Math.min(PULLS, Math.floor((now - run.start) / T.interval) + 1);
    while (run.shown < due) reveal(run.shown);

    const newest = slotFor(run.shown - 1);
    const target = Math.max(0, newest.y - SCROLL_ANCHOR);
    run.scroll += (target - run.scroll) * 0.12;
    grid.scrollTop = run.scroll;

    if (run.shown >= PULLS && Math.abs(target - run.scroll) < 1) { finish(); return; }
    if (run.shown >= PULLS && !bottom.classList.contains('show')) { bottom.classList.add('show'); drawScreen.classList.add('done'); }
    run.raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (!run || run.finished) return;
    cancelAnimationFrame(run.raf);
    while (run.shown < PULLS) reveal(run.shown);
    run.finished = true;
    const last = slotFor(PULLS - 1);
    grid.scrollTop = Math.max(0, last.y - SCROLL_ANCHOR);
    bottom.classList.add('show');
    drawScreen.classList.add('done');
    grid.classList.add('scrollable');
  }

  // Tap during the reveal to skip to the end.
  grid.addEventListener('pointerdown', () => { if (run && !run.finished && run.start) finish(); });

  tap($('#draw-back'), () => {
    if (run && !run.finished) return;
    renderCounters();
    show('prayer', true);
  });

  // Preload images so the reveal doesn't pop in.
  ['assets/prayer.jpg', 'assets/draw_bg.jpg', 'assets/result_bottom.jpg',
    ...pool.full.map((s) => `assets/icons/${s.id}.png`),
    ...pool.shards.map((s) => `assets/icons/${s.id}_shard.png`),
  ].forEach((src) => { const img = new Image(); img.src = src; });

  renderCounters();

  // Debug: ?screen=prayer|confirm|draw|result jumps straight to a screen (draw also takes &freeze=<ms>).
  const dbg = params.get('screen');
  if (dbg === 'prayer' || dbg === 'confirm') { show('prayer'); if (dbg === 'confirm') openConfirm(true); }
  if (dbg === 'draw' || dbg === 'result') {
    T.okToDim = 0; T.dimToFirst = 0;
    startDraw();
    if (dbg === 'result') setTimeout(finish, 50);
    const freeze = +params.get('freeze');
    if (freeze) setTimeout(() => { cancelAnimationFrame(run.raf); run.finished = true; }, freeze);
  }
})();
