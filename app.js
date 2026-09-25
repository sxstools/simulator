(() => {
  'use strict';

  const STAGE_W = 1206, STAGE_H = 2622;
  const STORE_KEY = 'sxs-prayer-sim-v2'; // v2: starting gems changed to 1000
  const GEMS_PER_PULL = 1;

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
    gems: 1000,
    orange: '5.88K',
    prayersToday: 0,
    prayersTodayDate: null,
    points: 3,
    sinceRare: 0,
    sinceEpic: 0,
    sinceLegendary: 43,
    sagePity: 3,
    skipConfirmUntil: 0,
    cls: 'Sage',
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
  // A class's pool is its own skills plus every ancestor class's (the video's Sage pool = Mage + Sage).
  function classPath(cls) {
    const path = [];
    for (let c = cls; c; c = window.CLASS_PARENT[c]) path.push(c);
    return path;
  }
  function poolFor(cls) {
    const path = classPath(cls);
    return window.SKILL_DB.filter((s) => path.includes(s.cls));
  }
  let pool = poolFor(state.cls);
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

  // tier: 0 = shard, 1-3 = full skill of that rarity.
  function makeResult(skill, tier) {
    return { skill, tier, kind: TIERS[tier].id };
  }

  function pickFull(tier) {
    const matches = pool.filter((s) => s.rarity === TIERS[tier].id);
    return pick(matches.length ? matches : pool);
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
    const res = makeResult(tier === 0 ? pick(pool) : pickFull(tier), tier);
    applyPityCounters(res.tier);
    return res;
  }

  function rollSession(n) {
    const replay = params.get('replay') === 'video';
    const results = [];
    for (let i = 0; i < n; i++) {
      if (replay) {
        const [k, slug] = window.VIDEO_REPLAY[i % window.VIDEO_REPLAY.length].split(':');
        const skill = window.SKILL_DB.find((x) => x.slug === slug);
        const res = makeResult(skill, k === 's' ? 0 : TIERS.findIndex((t) => t.id === skill.rarity));
        applyPityCounters(res.tier);
        results.push(res);
      } else {
        results.push(rollOne());
      }
    }
    state.gems -= n * GEMS_PER_PULL;
    state.prayersToday += n;
    state.prayersTodayDate = todayStr();
    state.points += n;
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
    document.querySelectorAll('.cls-name').forEach((el) => { el.textContent = state.cls; });
    $('.cls-cover').style.fontSize = state.cls.length > 9 ? '33px' : state.cls.length > 7 ? '37px' : '';
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
  // Pray x1 / x10 / x100 (x100 confirms first).
  let pendingPulls = 0;
  function requestPray(n) {
    if (state.gems < n * GEMS_PER_PULL) { toast('Not enough gems'); return; }
    // Only Pray x100 asks for confirmation, and not after "Don't show again today".
    if (n < 100 || Date.now() < state.skipConfirmUntil) { startDraw(n); return; }
    pendingPulls = n;
    $('#confirm-text').textContent = `Draw ${n} time${n === 1 ? '' : 's'}?`;
    setDontShow(false);
    openConfirm(true);
  }
  tap($('#pray1'), () => requestPray(1));
  tap($('#pray10'), () => requestPray(10));
  tap($('#pray100'), () => requestPray(100));
  function openConfirm(open) {
    $('#confirm').hidden = !open;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('behind-dialog', open && s.classList.contains('active')));
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
    if ($('#dont-show').classList.contains('checked')) {
      const m = new Date(); m.setHours(24, 0, 0, 0);
      state.skipConfirmUntil = m.getTime(); saveState();
    }
    openConfirm(false);
    startDraw(pendingPulls);
  });
  function setDontShow(on) {
    const el = $('#dont-show');
    el.classList.toggle('checked', on);
    el.setAttribute('aria-checked', String(on));
  }
  tap($('#dont-show'), () => setDontShow(!$('#dont-show').classList.contains('checked')));

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
    const sk = res.skill, shard = res.tier === 0;
    // Icons cut from the video already include the game's ring; downloaded art gets one from CSS.
    const framedSrc = shard ? sk.shardIcon : (sk.framed ? sk.icon : null);
    const icon = framedSrc
      ? `<img class="framed" src="${framedSrc}" alt="">`
      : `<div class="art${shard ? ' shard-art' : ''}"><img src="${sk.icon}" alt=""></div>`;
    const explicit = shard ? sk.shardLabel : sk.label;
    const label = explicit || (shard ? `${sk.name} Shard` : sk.name);
    const longest = Math.max(...label.split('\n').map((l) => l.length));
    let html = `<div class="halo"></div><div class="glow"></div>${icon}`;
    if (shard) html += '<div class="badge">3</div>';
    html += `<div class="label${explicit ? (longest > 14 ? ' small' : '') : ' auto'}"></div>`;
    if (res.tier >= 1) {
      const n = 4 + res.tier * 2;
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2, r0 = 70 + rng() * 40, r1 = 110 + rng() * 60;
        html += `<i class="spark" style="left:${99 + Math.cos(a) * r0}px;top:${99 + Math.sin(a) * r0}px;` +
          `--dx:${Math.cos(a) * (r1 - r0)}px;--dy:${Math.sin(a) * (r1 - r0)}px;animation-delay:${Math.round(rng() * 300)}ms"></i>`;
      }
    }
    el.innerHTML = html;
    el.querySelector('.label').textContent = label;
    return el;
  }

  function startDraw(n) {
    const gemsBefore = state.gems;
    const results = rollSession(n);

    inner.innerHTML = '';
    const tiles = results.map((r, i) => { const t = buildTile(r, i); inner.appendChild(t); return t; });
    const last = slotFor(n - 1);
    inner.style.height = `${last.y + SIDE_Y0 + 60}px`;
    // Small draws (x1, x10) fit on screen, so center them vertically instead of hugging the top.
    const top = slotFor(0).y - 99, bottomEdge = Math.max(...results.map((_, i) => slotFor(i).y)) + 99 + 80;
    const spare = grid.clientHeight - (bottomEdge - top);
    inner.style.transform = spare > 0 ? `translateY(${spare / 2 - top}px)` : '';
    grid.classList.remove('scrollable');
    grid.scrollTop = 0;
    bottom.classList.remove('show');
    drawScreen.classList.remove('done');
    $('#draw-today').textContent = `Prayers Today: ${state.prayersToday}/10000`;
    drawScreen.querySelectorAll('.gem-count').forEach((el) => { el.textContent = gemsBefore; });

    run = { n, tiles, results, shown: 0, start: 0, scroll: 0, raf: 0, finished: false };

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
    const due = Math.min(run.n, Math.floor((now - run.start) / T.interval) + 1);
    while (run.shown < due) reveal(run.shown);

    const newest = slotFor(run.shown - 1);
    const target = Math.max(0, newest.y - SCROLL_ANCHOR);
    run.scroll += (target - run.scroll) * 0.12;
    grid.scrollTop = run.scroll;

    if (run.shown >= run.n && Math.abs(target - run.scroll) < 1) { finish(); return; }
    if (run.shown >= run.n && !bottom.classList.contains('show')) { bottom.classList.add('show'); drawScreen.classList.add('done'); }
    run.raf = requestAnimationFrame(tick);
  }

  function finish() {
    if (!run || run.finished) return;
    cancelAnimationFrame(run.raf);
    while (run.shown < run.n) reveal(run.shown);
    run.finished = true;
    const last = slotFor(run.n - 1);
    grid.scrollTop = Math.max(0, last.y - SCROLL_ANCHOR);
    bottom.classList.add('show');
    drawScreen.classList.add('done');
    grid.classList.add('scrollable');
  }

  // Tap during the reveal to skip to the end.
  grid.addEventListener('pointerdown', () => { if (run && !run.finished && run.start) finish(); });

  // Mouse click-and-drag scrolling once results are in (touch already scrolls natively).
  let drag = null, glide = 0;
  grid.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !grid.classList.contains('scrollable')) return;
    cancelAnimationFrame(glide);
    drag = { y: e.clientY, t: performance.now(), v: 0 };
    grid.setPointerCapture(e.pointerId);
    grid.classList.add('dragging');
    e.preventDefault();
  });
  grid.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const now = performance.now();
    const dy = (e.clientY - drag.y) / scale; // client px -> stage px
    grid.scrollTop -= dy;
    drag.v = -dy / Math.max(1, now - drag.t); // stage px per ms
    drag.y = e.clientY; drag.t = now;
  });
  const endDrag = () => {
    if (!drag) return;
    let v = performance.now() - drag.t < 80 ? drag.v : 0;
    drag = null;
    grid.classList.remove('dragging');
    let last = performance.now();
    const step = (now) => {
      const dt = now - last; last = now;
      grid.scrollTop += v * dt;
      v *= Math.pow(0.95, dt / 16);
      if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step);
    };
    if (v) glide = requestAnimationFrame(step);
  };
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointercancel', endDrag);

  // Pray buttons on the results screen: same confirm, then a fresh draw.
  [['#draw-pray1', 1], ['#draw-pray10', 10], ['#draw-pray100', 100]].forEach(([sel, n]) => tap($(sel), () => {
    if (run && !run.finished) return;
    cancelAnimationFrame(glide);
    requestPray(n);
  }));

  tap($('#draw-back'), () => {
    if (run && !run.finished) return;
    renderCounters();
    show('prayer', true);
  });

  // Preload images so the reveal doesn't pop in (only the selected class's pool).
  const preloaded = new Set();
  function preload(srcs) {
    srcs.forEach((src) => { if (src && !preloaded.has(src)) { preloaded.add(src); new Image().src = src; } });
  }
  preload(['assets/prayer.jpg', 'assets/draw_bg.jpg', 'assets/result_bottom.jpg']);
  const preloadPool = () => preload(pool.flatMap((s) => [s.icon, s.shardIcon]));
  preloadPool();

  // ---------- Class picker (the "Sage ⌄" pill on the Prayer screen) ----------
  const picker = $('#class-picker'), list = $('#class-list');
  window.CLASS_ORDER.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'class-opt' + (window.CLASS_PARENT[c] ? '' : ' base');
    b.dataset.cls = c;
    b.textContent = c;
    list.appendChild(b);
  });
  function openPicker(open) {
    picker.hidden = !open;
    list.querySelectorAll('.class-opt').forEach((b) => b.classList.toggle('selected', b.dataset.cls === state.cls));
    if (open) list.querySelector('.selected')?.scrollIntoView({ block: 'center' });
  }
  tap($('#class-btn'), () => openPicker(picker.hidden));
  picker.addEventListener('pointerdown', (e) => { if (e.target === picker) openPicker(false); });
  // Use click (not pointerdown) so the list can still be scrolled with a finger.
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.class-opt');
    if (!b) return;
    state.cls = b.dataset.cls; saveState();
    pool = poolFor(state.cls); preloadPool();
    renderCounters(); openPicker(false);
  });

  renderCounters();

  // Debug: ?screen=prayer|confirm|draw|result jumps straight to a screen (draw also takes &freeze=<ms>).
  if (window.CLASS_PARENT[params.get('cls')] !== undefined) { state.cls = params.get('cls'); pool = poolFor(state.cls); renderCounters(); }
  if (params.has('pts')) { state.points = +params.get('pts'); renderCounters(); }
  const dbg = params.get('screen');
  if (dbg === 'picker') { show('prayer'); openPicker(true); }
  if (dbg === 'prayer' || dbg === 'confirm') { show('prayer'); if (dbg === 'confirm') openConfirm(true); }
  if (dbg === 'draw' || dbg === 'result') {
    T.okToDim = 0; T.dimToFirst = 0;
    startDraw(+params.get('n') || 100);
    if (dbg === 'result') setTimeout(finish, 50);
    const freeze = +params.get('freeze');
    if (freeze) setTimeout(() => { cancelAnimationFrame(run.raf); run.finished = true; }, freeze);
  }
})();
