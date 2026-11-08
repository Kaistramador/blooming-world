/* ============================================================
 * Blooming World — standalone core: sound, store, helpers,
 * background & tile rendering (port of sound.ts / store.ts /
 * BloomingBackground / GemTile)
 * ============================================================ */

/* ---------------- WebAudio synth ---------------- */
let audioCtx = null;
let soundEnabled = true;
function setSoundEnabled(v) { soundEnabled = v; }
function ac() {
  if (!soundEnabled) return null;
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, type, vol, delay) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (delay || 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.08, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
const sfx = {
  click() { tone(520, 0.06, 'triangle', 0.05); },
  swap() { tone(320, 0.08, 'sine', 0.05); },
  match(cascade) {
    const base = 440 * Math.pow(1.12, Math.min(cascade || 1, 8));
    tone(base, 0.09, 'triangle', 0.07);
    tone(base * 1.5, 0.09, 'sine', 0.04, 0.03);
  },
  boom() { tone(120, 0.25, 'sawtooth', 0.09); tone(80, 0.3, 'square', 0.05, 0.02); },
  special() { tone(660, 0.12, 'triangle', 0.07); tone(880, 0.12, 'triangle', 0.06, 0.06); tone(1100, 0.14, 'sine', 0.05, 0.12); },
  coin() { tone(880, 0.07, 'square', 0.05); tone(1320, 0.1, 'square', 0.05, 0.06); },
  win() { tone(523, 0.14, 'triangle', 0.08); tone(659, 0.14, 'triangle', 0.08, 0.12); tone(784, 0.2, 'triangle', 0.08, 0.24); tone(1047, 0.3, 'sine', 0.07, 0.4); },
  lose() { tone(330, 0.2, 'sine', 0.07); tone(262, 0.25, 'sine', 0.07, 0.15); tone(196, 0.35, 'sine', 0.06, 0.3); },
  star(n) { tone(700 + n * 200, 0.15, 'triangle', 0.08); },
};

/* ---------------- player store (zustand-compatible save) ---------------- */
const SAVE_KEY = 'blooming-world-save-v1';
const DEFAULT_BOOSTERS = { hammer: 1, bomb: 0, cross: 0, shuffle: 1, undo: 0, moves5: 0 };
function defaultState() {
  return {
    name: '', lang: 'ru', sound: true, coins: 300, stars: {}, scores: {},
    boosters: Object.assign({}, DEFAULT_BOOSTERS),
    owned: {
      skins: ['classic', 'stones'], avatars: ['av-seed', 'av-flower'],
      frames: ['fr-none'], nameStyles: ['ns-basic'], effects: [],
    },
    equipped: { skin: 'classic', avatar: 'av-seed', frame: 'fr-none', nameStyle: 'ns-basic', tileEffect: '', avatarEffect: '', nameEffect: '' },
    stats: { wins: 0, bestCascade: 0, totalScore: 0, movesMade: 0 },
  };
}
function normalizeState(s) {
  const d = defaultState();
  const out = Object.assign({}, d, s || {});
  out.stars = Object.assign({}, s && s.stars ? s.stars : {});
  out.scores = Object.assign({}, s && s.scores ? s.scores : {});
  out.boosters = Object.assign({}, DEFAULT_BOOSTERS, s && s.boosters ? s.boosters : {});
  out.owned = Object.assign({}, d.owned, s && s.owned ? s.owned : {});
  out.equipped = Object.assign({}, d.equipped, s && s.equipped ? s.equipped : {});
  out.stats = Object.assign({}, d.stats, s && s.stats ? s.stats : {});
  out.lang = out.lang === 'en' ? 'en' : 'ru';
  return out;
}
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed && parsed.state ? parsed.state : parsed);
  } catch (e) { return defaultState(); }
}
function saveState() {
  try {
    const inner = Object.assign({}, App.player);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: inner, version: 0 }));
  } catch (e) { /* storage unavailable — play without persistence */ }
}
/* store actions (mutate App.player + persist) */
const store = {
  t(key, vars) { return translate(App.player.lang, key, vars); },
  setLang(l) { App.player.lang = l; saveState(); },
  setSound(v) { setSoundEnabled(v); App.player.sound = v; saveState(); },
  setName(n) { App.player.name = String(n).slice(0, 16); saveState(); },
  addCoins(n) { App.player.coins += n; saveState(); },
  spendCoins(n) {
    if (App.player.coins < n) return false;
    App.player.coins -= n; saveState(); return true;
  },
  recordWin(level, stars, score, maxCascade, movesUsed) {
    const s = App.player;
    const prevStars = s.stars[level] || 0;
    const firstClear = !(level in s.stars);
    const newStars = stars > prevStars;
    const chapter = chapterOfLevel(level);
    const reward = firstClear ? 30 + stars * 10 + chapter * 5 : 10 + stars * 5;
    s.stars[level] = Math.max(prevStars, stars);
    s.scores[level] = Math.max(s.scores[level] || 0, score);
    s.coins += reward;
    s.stats.wins += 1;
    s.stats.bestCascade = Math.max(s.stats.bestCascade, maxCascade);
    s.stats.totalScore += score;
    s.stats.movesMade += movesUsed;
    saveState();
    return { firstClear, newStars, reward };
  },
  addBooster(id, n) { App.player.boosters[id] = (App.player.boosters[id] || 0) + n; saveState(); },
  useBooster(id) {
    const s = App.player;
    if ((s.boosters[id] || 0) <= 0) return false;
    s.boosters[id]--; saveState(); return true;
  },
  buyBooster(id) {
    const s = App.player;
    const price = BOOSTER_MAP[id].price;
    if (s.coins < price) return false;
    s.coins -= price;
    s.boosters[id] = (s.boosters[id] || 0) + 1;
    saveState(); return true;
  },
  buyCosmetic(kind, id, price) {
    const s = App.player;
    if (s.owned[kind].includes(id)) return false;
    if (s.coins < price) return false;
    s.coins -= price;
    s.owned[kind].push(id);
    saveState(); return true;
  },
  equip(kind, id) { App.player.equipped[kind] = id; saveState(); },
  maxUnlocked() {
    const s = App.player;
    const levels = Object.keys(s.stars).map(Number);
    const cleared = levels.length > 0 ? Math.max.apply(null, levels) : 0;
    return Math.min(TOTAL_LEVELS, cleared + 1);
  },
  totalStars() {
    const vals = Object.values(App.player.stars);
    return vals.reduce((a, b) => a + b, 0);
  },
  resetAll() {
    const keepLang = App.player.lang;
    App.player = normalizeState(defaultState());
    App.player.lang = keepLang;
    setSoundEnabled(App.player.sound);
    saveState();
  },
};

/* ---------------- tiny dom helpers ---------------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}
function fmt(n) { return Number(n).toLocaleString('ru-RU'); }
function shade(hex, amount) {
  const n = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amount));
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}
const SPECIAL_GLYPH = { rocketH: '⇢', rocketV: '⇣', bomb: '✹', rainbow: '❈' };
const RAINBOW_BG = 'conic-gradient(#c74134,#f6e04b,#2ea56d,#3d9be0,#b06fc9,#ef8f2a,#c74134)';
const ITEM_BG = 'linear-gradient(160deg,#a5825a,#7c5c3a 55%,#5c4326)';

/**
 * Tile markup. anim: '' | 'pop' | 'born' | 'fall' (wobble auto by era)
 * scale: 1 (board) — uses cqw units; container must have container-type.
 */
function tileHtml(tile, theme, skin, anim) {
  const st = theme.tile;
  const palette = skin.palette || theme.palette;
  const isRainbow = tile.color === -1;
  const isItem = tile.kind === 'item';
  const colorIdx = Math.max(0, Math.min(5, tile.color));
  const base = palette[colorIdx] || '#999999';
  const dark = shade(base, -46);
  const light = shade(base, 42);

  let shape;
  if (isRainbow) shape = 'border-radius:50%;';
  else if (isItem) shape = 'border-radius:26%;';
  else {
    const s = gemShapeCss(tile.color);
    shape = (s.clipPath ? 'clip-path:' + s.clipPath + ';' : '') + 'border-radius:' + s.borderRadius + ';';
  }

  let background;
  if (isRainbow) background = RAINBOW_BG;
  else if (isItem) background = ITEM_BG;
  else if (skin.glyphs || st.gradient) background = 'linear-gradient(160deg, ' + light + ', ' + base + ' 55%, ' + dark + ')';
  else background = base;

  const rimInset = Math.round((0.06 - st.rimWidth) * 100);
  const rimFilters = [];
  if (st.pixelShadow && !st.softShadow) rimFilters.push('drop-shadow(0.08em 0.08em 0 rgba(0,0,0,.4))');
  if (st.softShadow) rimFilters.push('drop-shadow(0 0.07em 0.12em rgba(0,0,0,.35))');
  const glowColor = isItem ? '#a5825a' : base;
  const fillFilters = st.glow
    ? ['drop-shadow(0 0 0.2em ' + glowColor + ')', 'drop-shadow(0 0 0.42em ' + glowColor + '55)']
    : [];

  let cls = 'tile-root';
  if (anim === 'pop') cls += ' bm-pop';
  else if (anim === 'born') cls += ' bm-born';
  else if (anim === 'fall') cls += ' bm-fall-in';
  else if (st.wobble) cls += ' bm-wobble';
  if (isRainbow) cls += ' bm-rainbow-spin';
  else if (tile.special !== 'none') cls += ' bm-special-pulse';

  let inner = '';
  if (st.rimWidth > 0) {
    inner += '<div class="tile-rim" style="inset:' + rimInset + '%;background:' + st.rim + ';' + shape +
      (rimFilters.length ? 'filter:' + rimFilters.join(', ') + ';' : '') + '"></div>';
  }
  inner += '<div class="tile-body" style="background:' + background + ';' + shape +
    (st.glass ? 'backdrop-filter:blur(2px);opacity:.9;' : '') +
    (fillFilters.length ? 'filter:' + fillFilters.join(', ') + ';' : '') + '">';
  if (st.pattern === 'pixel') inner += '<div class="bm-pixel-pattern"></div>';
  if (st.pattern === 'rays') inner += '<div style="position:absolute;inset:0;background:repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 8deg, transparent 8deg 16deg)"></div>';
  if (st.gloss) inner += '<div style="position:absolute;left:10%;right:10%;top:6%;height:38%;background:linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.06))"></div>';
  if (st.shine) inner += '<div class="bm-shine-wrap"><div class="bm-shine-bar"></div></div>';
  if (skin.ring && !isRainbow && !isItem) inner += '<div style="position:absolute;inset:0;background:radial-gradient(closest-side, transparent 56%, rgba(255,255,255,.55) 66%, transparent 78%)"></div>';
  inner += '</div>';

  let over = '';
  if (skin.glyphs && !isRainbow && !isItem) {
    over += '<span class="tile-glyph">' + skin.glyphs[colorIdx] + '</span>';
  }
  if (tile.special !== 'none') {
    over += '<span class="spec-disc"' + (skin.glyphs ? ' style="background:transparent"' : '') + '><span class="spec-glyph">' + SPECIAL_GLYPH[tile.special] + '</span></span>';
  }
  if (isItem) over += '<span class="tile-glyph" style="font-size:48cqw">🌰</span>';

  return '<div class="' + cls + '" style="container-type:size">' + inner +
    '<div class="tile-over">' + over + '</div></div>';
}

/* mini tile for shop previews (anchored palette, fixed size) */
function previewTileHtml(color, skin) {
  const fakeTheme = { tile: Object.assign({}, chapterTheme(9).tile, { wobble: false, shine: false }) };
  const skin2 = skin.glyphs || skin.ring
    ? skin
    : {};
  const tile = { id: 0, color, special: 'none', kind: 'gem' };
  return '<div class="skin-tile" style="container-type:size">' +
    tileHtml(tile, Object.assign({}, fakeTheme, { palette: ANCHORS }), skin2, '') + '</div>';
}

/* ---------------- blooming background ---------------- */
function mulberry32Public(seed) { return mulberry32(seed); }
function buildBackground(bg, seed, asRoot) {
  const layer = el('div', 'bg-layer' + (asRoot ? ' as-root' : ''));
  const rng = mulberry32Public((seed || 1) * 7919 + 13);
  const rand = (min, max) => min + rng() * (max - min);

  const sky = el('div');
  sky.style.cssText = 'position:absolute;inset:0;background:' + bg.sky;
  layer.appendChild(sky);

  if (bg.dark) {
    // moon + stars instead of sun
    layer.appendChild(el('div', 'bg-moon'));
  } else if (bg.sun) {
    if (bg.rays) layer.appendChild(el('div', 'bg-rays'));
    layer.appendChild(el('div', 'bg-sun'));
  }
  if (bg.stars) {
    for (let i = 0; i < 26; i++) {
      const s = el('div', 'bg-star');
      s.style.left = rand(2, 98) + '%';
      s.style.top = rand(2, 55) + '%';
      s.style.animationDelay = rand(0, 3) + 's';
      layer.appendChild(s);
    }
  }
  for (let i = 0; i < (bg.clouds || 0); i++) {
    const c = el('div', 'bg-cloud');
    c.style.top = rand(6, 30) + '%';
    c.style.transform = 'scale(' + rand(0.6, 1.3) + ')';
    c.style.animationDuration = rand(45, 90) + 's';
    c.style.animationDelay = -rand(0, 60) + 's';
    layer.appendChild(c);
  }
  const hillFar = el('div', 'bg-hill');
  hillFar.style.background = bg.hillFar;
  layer.appendChild(hillFar);
  const hillNear = el('div', 'bg-hill near');
  hillNear.style.background = bg.hillNear;
  layer.appendChild(hillNear);
  const ground = el('div', 'bg-ground');
  ground.style.background = bg.ground;
  layer.appendChild(ground);

  const TREES = ['#2e8a4e', '#3aa25c', '#2f7d46', '#46b36a', '#2e8a4e'];
  for (let i = 0; i < (bg.trees || 0); i++) {
    const t = el('div', 'bg-tree');
    t.style.setProperty('--tree', TREES[i % TREES.length]);
    t.style.left = rand(2, 92) + '%';
    t.style.transform += ' scale(' + rand(0.7, 1.15) + ')';
    t.style.animationDelay = -rand(0, 4) + 's';
    layer.appendChild(t);
  }
  for (let i = 0; i < (bg.bushes || 0); i++) {
    const b = el('div', 'bg-bush');
    b.style.setProperty('--bush', i % 2 ? '#3da05a' : '#33914e');
    b.style.left = rand(1, 90) + '%';
    b.style.transform = 'scale(' + rand(0.6, 1.2) + ')';
    layer.appendChild(b);
  }
  const FLW = ['#ff8ab0', '#ffd166', '#c084fc', '#7dd3fc', '#fda4af', '#fef08a'];
  for (let i = 0; i < (bg.flowers || 0); i++) {
    const f = el('div', 'bg-flower');
    f.style.setProperty('--fl', FLW[i % FLW.length]);
    f.style.left = rand(1, 95) + '%';
    f.style.bottom = rand(18.5, 24) + '%';
    f.style.transform = 'scale(' + rand(0.7, 1.3) + ')';
    layer.appendChild(f);
  }
  for (let i = 0; i < (bg.butterflies || 0); i++) {
    const b = el('div', 'bg-butterfly');
    b.style.setProperty('--bf', FLW[i % FLW.length]);
    b.style.left = rand(10, 80) + '%';
    b.style.top = rand(20, 55) + '%';
    b.style.animationDuration = rand(7, 12) + 's';
    b.style.animationDelay = -rand(0, 8) + 's';
    layer.appendChild(b);
  }
  const PT = ['#ffb0c8', '#ffd9a0', '#e9d5ff', '#fff1a8'];
  for (let i = 0; i < (bg.petals || 0); i++) {
    const p = el('div', 'bg-petal');
    p.style.setProperty('--pt', PT[i % PT.length]);
    p.style.left = rand(0, 100) + '%';
    p.style.setProperty('--drift', rand(-8, 8) + 'vw');
    p.style.animationDuration = rand(8, 16) + 's';
    p.style.animationDelay = -rand(0, 14) + 's';
    layer.appendChild(p);
  }
  for (let i = 0; i < (bg.fireflies || 0); i++) {
    const f = el('div', 'bg-firefly');
    f.style.left = rand(3, 95) + '%';
    f.style.top = rand(15, 70) + '%';
    f.style.animationDuration = rand(3.5, 6) + 's';
    f.style.animationDelay = -rand(0, 5) + 's';
    layer.appendChild(f);
  }
  const SPK = ['✦', '✧', '⋆'];
  for (let i = 0; i < (bg.sparkles || 0); i++) {
    const s = el('div', 'bg-sparkle', SPK[i % SPK.length]);
    s.style.left = rand(3, 95) + '%';
    s.style.top = rand(8, 68) + '%';
    s.style.animationDuration = rand(2.4, 4.5) + 's';
    s.style.animationDelay = -rand(0, 4) + 's';
    layer.appendChild(s);
  }
  return layer;
}
