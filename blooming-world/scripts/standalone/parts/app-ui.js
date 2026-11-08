/* ============================================================
 * Blooming World — standalone UI: app shell, map, game,
 * shop, ranks, profile (port of page.tsx + screens)
 * ============================================================ */

const App = {
  screen: 'map',        // map | garden | shop | ranks | profile
  level: null,          // playing level number or null
  daily: false,         // Волна 4: текущий забег — уровень дня (×2)
  player: null,
  bots: null,
  shopTab: 'boosters',
  ranksQuery: '',
  savedFlash: false,
  /* Волна 3: копилка */
  piggyDialog: null,    // null | 'status' | 'result'
  piggyGot: 0,
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ---------- app shell ---------- */
function renderApp() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const theme = chapterTheme(Math.floor((store.maxUnlocked() - 1) / CHAPTER_SIZE));
  root.appendChild(buildBackground(theme.bg, 99, true, theme.id));

  const screenBox = el('div', 'screen');
  root.appendChild(screenBox);
  if (App.level !== null) {
    Game.mount(screenBox);
  } else {
    if (App.screen === 'map') renderMap(screenBox);
    else if (App.screen === 'garden') renderGarden(screenBox);
    else if (App.screen === 'shop') renderShop(screenBox);
    else if (App.screen === 'ranks') renderRanks(screenBox);
    else renderProfile(screenBox);
    screenBox.appendChild(buildNav());
  }
}

function buildNav() {
  const nav = el('nav', 'bottom-nav');
  nav.setAttribute('aria-label', 'Main navigation');
  const row = el('div', 'row');
  const items = [
    { key: 'map', icon: '🗺️', label: store.t('nav.map') },
    { key: 'garden', icon: '🌸', label: store.t('nav.garden') },
    { key: 'shop', icon: '🛍️', label: store.t('nav.shop') },
    { key: 'ranks', icon: '🏆', label: store.t('nav.ranks') },
    { key: 'profile', icon: '👤', label: store.t('nav.profile') },
  ];
  for (const item of items) {
    const b = el('button', 'nav-btn' + (App.screen === item.key ? ' active' : ''));
    b.type = 'button';
    b.innerHTML = '<span class="ico">' + item.icon + '</span><span>' + item.label + '</span>';
    b.onclick = () => { sfx.click(); App.screen = item.key; renderApp(); };
    row.appendChild(b);
  }
  nav.appendChild(row);
  return nav;
}

function coinPill() {
  const d = el('span', 'coin-pill');
  d.innerHTML = '🪙 ' + fmt(App.player.coins);
  return d;
}

/* Волна 3: пилюля копилки (карта) */
function piggyPill() {
  const t = (k, v) => store.t(k, v);
  const ready = App.player.piggy.wins >= PIGGY_WINS_TARGET;
  const d = el('button', 'piggy-pill' + (ready ? ' piggy-pill-ready' : ''));
  d.type = 'button';
  d.setAttribute('aria-label', t('piggy.title'));
  const meter = el('span', 'piggy-meter');
  for (let i = 0; i < PIGGY_WINS_TARGET; i++) {
    const dot = el('span', i < App.player.piggy.wins ? 'on' : '');
    meter.appendChild(dot);
  }
  d.innerHTML = '🐷 ' + fmt(App.player.piggy.coins) + ' ';
  d.appendChild(meter);
  d.onclick = () => {
    sfx.click();
    if (ready) {
      openPiggyFlow();
    } else {
      App.piggyDialog = 'status';
      renderPiggyDialog();
    }
  };
  return d;
}

function openPiggyFlow() {
  const got = store.openPiggy();
  if (got > 0) {
    sfx.coin();
    setTimeout(() => sfx.star(3), 200);
    logEvent('piggy_open', { coins: got });
    App.piggyGot = got;
    App.piggyDialog = 'result';
  } else {
    App.piggyDialog = 'status';
  }
  renderPiggyDialog();
}

function renderPiggyDialog() {
  const old = document.getElementById('bm-piggy-modal');
  if (old) old.remove();
  if (!App.piggyDialog) return;
  const t = (k, v) => store.t(k, v);
  const over = el('div', 'modal-overlay');
  over.id = 'bm-piggy-modal';
  over.style.zIndex = '90';
  const modal = el('div', 'modal win');
  if (App.piggyDialog === 'status') {
    modal.innerHTML = '<h2>🐷 ' + t('piggy.title') + '</h2>';
    const pig = el('div', 'piggy-big', '🐷');
    modal.appendChild(pig);
    const coins = el('div', 'reward-pill');
    coins.textContent = '🪙 ' + fmt(App.player.piggy.coins);
    modal.appendChild(coins);
    const meter = el('div', 'piggy-meter');
    meter.style.cssText = 'justify-content:center;margin:8px 0;';
    for (let i = 0; i < PIGGY_WINS_TARGET; i++) {
      meter.appendChild(el('span', i < App.player.piggy.wins ? 'on' : ''));
    }
    modal.appendChild(meter);
    const info = el('div', 'sub');
    info.style.cssText = 'font-weight:700;color:#fbcfe8;';
    info.textContent = App.player.piggy.wins >= PIGGY_WINS_TARGET ? t('piggy.ready') : t('piggy.progress', { n: PIGGY_WINS_TARGET - App.player.piggy.wins });
    modal.appendChild(info);
    const hint = el('div', 'sub');
    hint.style.cssText = 'font-size:11px;opacity:.8;';
    hint.textContent = t('piggy.hint');
    modal.appendChild(hint);
    const col = el('div', 'col');
    const closeBtn = el('button', 'btn btn-ghost');
    closeBtn.type = 'button';
    closeBtn.textContent = t('common.close');
    closeBtn.onclick = () => { App.piggyDialog = null; renderPiggyDialog(); };
    col.appendChild(closeBtn);
    modal.appendChild(col);
  } else {
    modal.innerHTML = '<h2>🎉 ' + t('piggy.full') + '</h2>';
    const pig = el('div', 'piggy-big', '🪙');
    modal.appendChild(pig);
    const got = el('div', 'reward-pill');
    got.textContent = '+' + fmt(App.piggyGot);
    modal.appendChild(got);
    const col = el('div', 'col');
    const okBtn = el('button', 'btn btn-white');
    okBtn.type = 'button';
    okBtn.textContent = t('common.ok');
    okBtn.onclick = () => { App.piggyDialog = null; App.piggyGot = 0; renderPiggyDialog(); renderApp(); };
    col.appendChild(okBtn);
    modal.appendChild(col);
  }
  over.appendChild(modal);
  document.body.appendChild(over);
}

let toastTimer = null;
function showToast(msg) {
  let wrap = document.getElementById('bm-toast');
  if (!wrap) {
    wrap = el('div', 'toast-wrap');
    wrap.id = 'bm-toast';
    document.body.appendChild(wrap);
  }
  wrap.innerHTML = '';
  const box = el('div', 'toast-box bm-toast-in', msg);
  wrap.appendChild(box);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { wrap.innerHTML = ''; }, 1800);
}

/* petal confetti burst over the win modal (Волна 1 juice) */
const CONFETTI_COLORS = ['#c74134', '#f6e04b', '#2ea56d', '#3d9be0', '#b06fc9', '#ef8f2a'];
let lastConfettiAt = 0;
function spawnWinConfetti() {
  const now = Date.now();
  if (now - lastConfettiAt < 2500) return; // no double burst
  lastConfettiAt = now;
  for (let i = 0; i < 28; i++) {
    const p = el('span', 'bm-confetti');
    p.style.left = (Math.random() * 100) + '%';
    p.style.width = (8 + Math.random() * 8) + 'px';
    p.style.height = p.style.width;
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.animationDelay = (Math.random() * 1.2) + 's';
    p.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4500);
  }
}

/* ============================================================
 * MAP SCREEN
 * ============================================================ */
function renderMap(box) {
  const wrap = el('div', 'map-wrap');
  const t = (k, v) => store.t(k, v);

  const head = el('div', 'map-head');
  head.innerHTML = '<div><h1 class="bm-text-outline">' + t('app.title') + '</h1><p class="bm-text-outline">' + t('app.subtitle') + '</p></div>';
  /* Волна 3: пилюля звёзд показывает ДОСТУПНЫЕ на сад звёзды */
  const starsAvail = store.starsAvailable();
  const starsTotal = store.totalStars();
  const starsPill = el('span', 'coin-pill' + (starsAvail < starsTotal ? ' stars-avail' : ''));
  starsPill.innerHTML = '⭐ ' + starsAvail;
  head.appendChild(starsPill);
  head.appendChild(piggyPill());
  wrap.appendChild(head);

  const maxUnlocked = store.maxUnlocked();
  const currentChapter = Math.min(TOTAL_CHAPTERS - 1, Math.floor((maxUnlocked - 1) / CHAPTER_SIZE));

  const playBtn = el('button', 'btn btn-primary');
  playBtn.type = 'button';
  playBtn.style.cssText = 'width:100%;margin-bottom:12px;padding:18px;font-size:18px;';
  playBtn.textContent = '▶ ' + t('map.continue') + ' · ' + t('map.level') + ' ' + maxUnlocked;
  playBtn.onclick = () => { sfx.click(); App.level = maxUnlocked; App.daily = false; renderApp(); };
  wrap.appendChild(playBtn);

  /* Волна 4: уровень дня (фиксируется на сутки, перекат в 00:00) */
  const daily = store.ensureDaily();
  const dailyCard = el('div', 'daily-card' + (daily.done ? ' done' : ''));
  const dailyIcon = el('div', 'daily-icon', daily.done ? '✅' : '📅');
  const dailyMid = el('div', 'daily-mid');
  dailyMid.innerHTML = '<div class="daily-title bm-text-outline">' + t('daily.title') + ' <span class="daily-x2">×2</span></div>' +
    '<div class="daily-sub bm-text-outline">' + (daily.done ? t('daily.done') : t('daily.sub')) + '</div>';
  dailyCard.appendChild(dailyIcon);
  dailyCard.appendChild(dailyMid);
  if (!daily.done) {
    const dailyBtn = el('button', 'btn btn-gold daily-play');
    dailyBtn.type = 'button';
    dailyBtn.textContent = t('daily.play', { n: daily.level });
    dailyBtn.onclick = () => {
      sfx.click();
      logEvent('daily_start', { level: daily.level, date: daily.date });
      App.level = daily.level; App.daily = true; renderApp();
    };
    dailyCard.appendChild(dailyBtn);
  }
  wrap.appendChild(dailyCard);

  /* Волна 4: баннер ивента выходных (сб/вс, переключается календарём) */
  const weekendId = weekendEventFor(dateKeyOf(new Date()));
  if (weekendId) {
    const we = WEEKEND_EVENT_DEFS[weekendId];
    const banner = el('div', 'weekend-banner');
    const wIcon = el('div', 'weekend-icon', we.icon);
    const wMid = el('div', 'weekend-mid');
    wMid.innerHTML = '<div class="weekend-name">' + we.name[App.player.lang] +
      ' <span class="weekend-today">' + t('event.today') + '</span></div>' +
      '<div class="weekend-desc">' + we.desc[App.player.lang] + '</div>';
    banner.appendChild(wIcon);
    banner.appendChild(wMid);
    wrap.appendChild(banner);
  }

  for (const ch of CHAPTERS) {
    const unlocked = ch.id <= currentChapter;
    const theme = chapterTheme(ch.id);
    const card = el('div', 'chapter-card' + (unlocked ? '' : ' locked'));
    card.appendChild(buildBackground(theme.bg, ch.id + 11, false, ch.id));
    const inner = el('div', 'chapter-inner');

    const topRow = el('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';
    const titleBox = el('div');
    titleBox.innerHTML =
      '<div class="chapter-kicker bm-text-outline">' + t('map.chapter') + ' ' + (ch.id + 1) + '</div>' +
      '<div class="chapter-name bm-text-outline">' + ch.name[App.player.lang] + '</div>' +
      '<div class="chapter-tag bm-text-outline">' + ch.tagline[App.player.lang] + '</div>';
    topRow.appendChild(titleBox);
    const levels = Array.from({ length: CHAPTER_SIZE }, (_, i) => ch.id * CHAPTER_SIZE + i + 1);
    const cleared = levels.filter((lv) => (App.player.stars[lv] || 0) > 0).length;
    if (cleared === CHAPTER_SIZE) {
      const bloom = el('span', 'bloomed-pill');
      bloom.textContent = '🌸 ' + t('map.bloomed');
      topRow.appendChild(bloom);
    }
    inner.appendChild(topRow);

    const grid = el('div', 'levels-grid');
    for (const lv of levels) {
      const lvStars = App.player.stars[lv] || 0;
      const lvUnlocked = lv <= maxUnlocked;
      const isCurrent = lv === maxUnlocked && ch.id === currentChapter;
      const btn = el('button', 'level-btn ' + (lvUnlocked ? (isCurrent ? 'current' : 'open') : 'locked'));
      btn.type = 'button';
      btn.setAttribute('aria-label', t('map.level') + ' ' + lv);
      btn.innerHTML = '<span>' + (lvUnlocked ? lv : '🔒') + '</span>' +
        '<span class="level-stars">' + (lvStars > 0 ? '⭐'.repeat(lvStars) : (lvUnlocked ? '' : '·')) + '</span>';
      if (lvUnlocked) {
        btn.onclick = () => { sfx.click(); App.level = lv; App.daily = false; renderApp(); };
      } else {
        btn.disabled = true;
      }
      grid.appendChild(btn);
    }
    inner.appendChild(grid);
    if (!unlocked) {
      const note = el('div', 'bm-text-outline');
      note.style.cssText = 'margin-top:8px;text-align:center;font-size:11px;font-weight:700;opacity:.85;';
      note.textContent = t('map.nextChapter', { n: maxUnlocked - ch.id * CHAPTER_SIZE });
      inner.appendChild(note);
    }
    card.appendChild(inner);
    wrap.appendChild(card);
  }

  const soon = el('div');
  soon.style.cssText = 'text-align:center;font-size:11px;opacity:.75;padding:6px 0 2px;';
  soon.textContent = t('map.comingSoon');
  wrap.appendChild(soon);

  box.appendChild(wrap);
}

/* ============================================================
 * GARDEN SCREEN (Волна 3)
 * ============================================================ */
const GARDEN_BANDS = [
  { zone: 0, top: 0, height: 33, ground: 'linear-gradient(180deg,#7fb86b,#5d9a4e)', groundDim: 'linear-gradient(180deg,#8b9377,#6f7a60)' },
  { zone: 1, top: 33, height: 34, ground: 'linear-gradient(180deg,#63a94f,#3f8a3c)', groundDim: 'linear-gradient(180deg,#7d8a68,#5c6e4e)' },
  { zone: 2, top: 67, height: 33, ground: 'linear-gradient(180deg,#4f9c46,#32743a)', groundDim: 'linear-gradient(180deg,#6f8560,#4c6247)' },
];
const GARDEN_ZONE_KEYS = ['garden.zone0', 'garden.zone1', 'garden.zone2'];

function renderGarden(box) {
  const wrap = el('div', 'map-wrap');
  const t = (k, v) => store.t(k, v);
  const lang = App.player.lang;
  const maxUnlocked = store.maxUnlocked();
  const gardenOpen = maxUnlocked > 10;
  const restoredSet = new Set(App.player.garden.restored);
  const starsAvail = store.starsAvailable();
  const bloom = restoredSet.size / GARDEN_OBJECTS.length;

  /* ---------- закрытый сад ---------- */
  const head = el('div', 'map-head');
  const backBtn = el('button', 'btn btn-ghost');
  backBtn.type = 'button';
  backBtn.style.cssText = 'padding:8px 14px;';
  backBtn.textContent = '← ' + t('game.exit');
  backBtn.onclick = () => { sfx.click(); App.screen = 'map'; renderApp(); };
  head.appendChild(backBtn);
  wrap.appendChild(head);

  if (!gardenOpen) {
    const lock = el('div', 'card');
    lock.style.cssText = 'margin-top:28px;padding:32px 20px;text-align:center;';
    lock.innerHTML =
      '<div style="font-size:52px;line-height:1">🌱</div>' +
      '<h2 class="bm-text-outline" style="margin-top:10px;font-size:20px;">' + t('garden.lockedTitle') + '</h2>' +
      '<p class="bm-text-outline" style="font-size:13px;opacity:.9;margin-top:4px;">' + t('garden.lockedHint') + '</p>' +
      '<div style="display:inline-block;margin-top:10px;background:rgba(255,255,255,.2);border-radius:999px;padding:3px 12px;font-size:12px;font-weight:700;">' +
      t('map.chapter') + ' 1 · ' + Math.min(10, maxUnlocked - 1) + '/10</div>';
    wrap.appendChild(lock);
    box.appendChild(wrap);
    return;
  }

  const zoneUnlocked = (zone) => maxUnlocked > gardenZoneUnlockLevel(zone);

  /* ---------- шапка: заголовок + счётчики ---------- */
  const titleBox = el('div');
  titleBox.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:-44px;padding-top:0;';
  const tb = el('div');
  tb.style.cssText = 'text-align:center;flex:1;';
  tb.innerHTML = '<div class="bm-text-outline" style="font-size:18px;font-weight:900;">🌸 ' + t('garden.title') + '</div>' +
    '<div class="bm-text-outline" style="font-size:10px;opacity:.85;">' + t('garden.subtitle') + '</div>';
  titleBox.appendChild(tb);
  const pillBox = el('div');
  pillBox.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:flex-end;';
  const stPill = el('span', 'coin-pill' + (starsAvail < store.totalStars() ? ' stars-avail' : ''));
  stPill.style.fontSize = '12px';
  stPill.innerHTML = '⭐ ' + starsAvail;
  pillBox.appendChild(stPill);
  const coinP = el('span', 'coin-pill');
  coinP.style.fontSize = '12px';
  coinP.innerHTML = '🪙 ' + fmt(App.player.coins);
  pillBox.appendChild(coinP);
  titleBox.appendChild(pillBox);
  wrap.appendChild(titleBox);

  /* ---------- прогресс расцвета ---------- */
  const prog = el('div', 'card');
  prog.style.cssText = 'margin-top:10px;padding:10px 12px;';
  const progRow = el('div');
  progRow.style.cssText = 'display:flex;justify-content:space-between;font-size:11px;font-weight:700;';
  progRow.innerHTML = '<span>🌸 ' + t('garden.bloom') + '</span><span>' +
    t('garden.restoredCount', { n: restoredSet.size, m: GARDEN_OBJECTS.length }) + '</span>';
  prog.appendChild(progRow);
  const bar = el('div', 'gd-bloom-bar');
  bar.style.marginTop = '6px';
  const fill = el('div', 'gd-bloom-fill');
  fill.style.width = Math.round(bloom * 100) + '%';
  bar.appendChild(fill);
  prog.appendChild(bar);
  wrap.appendChild(prog);

  /* ---------- сцена ---------- */
  const scene = el('div', 'gd-scene');
  scene.style.marginTop = '10px';
  const sky = el('div', 'gd-sky');
  sky.style.background = 'linear-gradient(180deg, rgba(96,125,139,' + (0.42 * (1 - bloom)).toFixed(2) + ') 0%, rgba(255,255,255,0) 45%)';
  scene.appendChild(sky);
  if (bloom > 0.25) scene.appendChild(el('div', 'gd-sun'));
  for (let i = 0; i < 3; i++) {
    const c = el('div', 'gd-cloud');
    c.style.top = (4 + i * 7) + '%';
    c.style.animationDuration = (70 + i * 25) + 's';
    c.style.animationDelay = (-i * 22) + 's';
    c.style.opacity = String(0.5 + bloom * 0.45);
    scene.appendChild(c);
  }
  const hillL = el('div', 'gd-hill');
  hillL.style.cssText = 'left:-18%;top:20%;width:70%;height:18%;background:rgba(96,150,90,' + (0.5 + bloom * 0.25).toFixed(2) + ')';
  scene.appendChild(hillL);
  const hillR = el('div', 'gd-hill');
  hillR.style.cssText = 'right:-22%;top:24%;width:75%;height:16%;background:rgba(76,132,80,' + (0.45 + bloom * 0.25).toFixed(2) + ')';
  scene.appendChild(hillR);

  for (const band of GARDEN_BANDS) {
    const open = zoneUnlocked(band.zone);
    const bd = el('div', 'gd-band');
    bd.style.cssText = 'top:' + band.top + '%;height:' + band.height + '%;background:' + (open ? band.ground : band.groundDim) + ';opacity:' + (open ? 1 : 0.75) + ';';
    const label = el('div', 'gd-band-label');
    label.style.top = '6px';
    label.innerHTML = '🌄 ' + t(GARDEN_ZONE_KEYS[band.zone]) + (!open ? ' 🔒 ' + t('garden.zoneLocked', { n: GARDEN_ZONE_CHAPTER[band.zone] + 1 }) : '');
    bd.appendChild(label);
    scene.appendChild(bd);
  }

  /* ambient petals by bloom */
  const petalCount = Math.floor(bloom * 10);
  const PETALS = ['🌸', '✨', '🦋'];
  for (let i = 0; i < petalCount; i++) {
    const p = el('span', 'gd-petal', PETALS[i % 3]);
    p.style.left = (((i * 37) % 92) + 3) + '%';
    p.style.top = (18 + ((i * 53) % 70)) + '%';
    p.style.fontSize = (10 + (i % 3) * 4) + 'px';
    p.style.animationDuration = (3 + (i % 4)) + 's';
    p.style.animationDelay = (-i * 0.7) + 's';
    scene.appendChild(p);
  }

  /* objects */
  let flashTimer = null;
  const flash = (msg) => {
    let fl = document.getElementById('bm-gd-flash');
    if (!fl) {
      fl = el('div');
      fl.id = 'bm-gd-flash';
      fl.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:60;';
      fl.innerHTML = '<div class="toast-box bm-toast-in" style="background:rgba(0,0,0,.8);border-radius:999px;padding:8px 16px;font-size:13px;font-weight:700;color:#fff;"></div>';
      document.body.appendChild(fl);
    }
    fl.firstChild.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { fl.remove(); }, 1600);
  };

  for (const obj of GARDEN_OBJECTS) {
    const isRestored = restoredSet.has(obj.id);
    const open = zoneUnlocked(obj.zone);
    const canAfford = starsAvail >= obj.cost;
    const slot = el('div', 'gd-slot');
    slot.style.cssText = 'left:' + obj.x + '%;top:' + obj.y + '%;';
    if (isRestored) {
      const objBtn = el('button', 'gd-obj');
      objBtn.type = 'button';
      objBtn.setAttribute('aria-label', obj.name[lang]);
      objBtn.innerHTML = '<span class="gd-obj-emoji" style="font-size:' + Math.round(26 * obj.size) + 'px;animation-delay:' + ((obj.x % 7) * 0.4) + 's">' + obj.emoji + '</span>' +
        '<span class="gd-obj-name">' + obj.name[lang] + '</span>';
      objBtn.onclick = () => { sfx.click(); flash('🌳 ' + obj.name[lang]); };
      slot.appendChild(objBtn);
    } else {
      const emptyBtn = el('button', 'gd-obj gd-empty-slot' + (open ? '' : ' dim'));
      emptyBtn.type = 'button';
      emptyBtn.style.opacity = open ? '1' : '0.7';
      emptyBtn.setAttribute('aria-label', obj.name[lang] + ' — ' + t('garden.restore', { n: obj.cost }));
      emptyBtn.innerHTML = '<span class="gd-empty' + (open && canAfford ? ' gd-empty-can' : '') + '">' + (open ? '➕' : '🔒') + '</span>' +
        '<span class="gd-cost">⭐' + obj.cost + '</span>';
      emptyBtn.onclick = () => {
        if (!open) { sfx.click(); flash(t('garden.zoneLocked', { n: GARDEN_ZONE_CHAPTER[obj.zone] + 1 })); return; }
        renderGardenConfirm(obj, flash, () => { renderApp(); });
      };
      slot.appendChild(emptyBtn);
    }
    scene.appendChild(slot);
  }
  wrap.appendChild(scene);

  if (bloom >= 1) {
    const done = el('div');
    done.style.cssText = 'margin-top:10px;border-radius:18px;background:rgba(251,191,36,.9);padding:9px;text-align:center;font-size:14px;font-weight:900;color:#451a03;';
    done.textContent = '🌈 ' + t('garden.done');
    wrap.appendChild(done);
  }

  box.appendChild(wrap);
}

/* подтверждение восстановления объекта сада */
function renderGardenConfirm(obj, flash, onRestored) {
  const t = (k, v) => store.t(k, v);
  const lang = App.player.lang;
  const over = el('div', 'modal-overlay');
  over.style.zIndex = '90';
  const modal = el('div', 'modal light');
  modal.innerHTML = '<h2><span style="font-size:28px">' + obj.emoji + '</span> ' +
    t('garden.confirmTitle', { name: obj.name[lang] }) + '</h2>' +
    '<div class="sub" style="opacity:.8">' + t('garden.restore', { n: obj.cost }) + ' · ' +
    t('garden.coinsBack', { n: gardenCoinsBack(obj.cost) }) + '</div>';
  const col = el('div', 'col');
  const yes = el('button', 'btn btn-primary');
  yes.type = 'button';
  yes.textContent = '🌱 ' + t('garden.restore', { n: obj.cost });
  yes.onclick = () => {
    if (store.restoreGarden(obj.id)) {
      sfx.coin();
      setTimeout(() => sfx.star(2), 180);
      logEvent('garden_restore', { id: obj.id, cost: obj.cost });
      flash(t('garden.coinsBack', { n: gardenCoinsBack(obj.cost) }));
    } else {
      flash(t('garden.needStars'));
    }
    over.remove();
    onRestored();
  };
  col.appendChild(yes);
  const no = el('button', 'btn');
  no.type = 'button';
  no.style.cssText = 'background:#e2e8f0;color:#334155;';
  no.textContent = t('garden.cancel');
  no.onclick = () => over.remove();
  col.appendChild(no);
  modal.appendChild(col);
  over.appendChild(modal);
  document.body.appendChild(over);
}

/* ============================================================
 * GAME SCREEN
 * ============================================================ */
const Game = {
  cfg: null, board: null, moves: 0, score: 0,
  progress: { colors: [0, 0, 0, 0, 0, 0], items: 0, stones: 0 },
  busy: false, selected: null, activeBooster: null, buyBoosterId: null,
  winInfo: null, loseOpen: false, plus5Used: 0, attempt: 0, lostStreak: 0,
  rng: () => 0, playId: 0, snapshot: null, shakeIdx: null,
  clearing: new Set(), born: new Set(), spawned: new Set(), stonesHit: new Set(),

  mount(box) {
    const lv = App.level;
    this.cfg = getLevelConfig(lv);
    this.rng = mulberry32(lv * 7919 + this.attempt * 104729 + 13);
    this.board = createBoard(this.cfg, this.rng);
    this.moves = this.cfg.moves;
    this.score = 0;
    this.progress = { colors: [0, 0, 0, 0, 0, 0], items: 0, stones: 0 };
    this.busy = false;
    this.selected = null;
    this.activeBooster = null;
    this.buyBoosterId = null;
    this.winInfo = null;
    this.loseOpen = false;
    this.plus5Used = 0;
    this.snapshot = null;
    this.shakeIdx = null;
    this.clearing = new Set(); this.born = new Set(); this.spawned = new Set(); this.stonesHit = new Set();
    this.lostStreak = 0;
    logSessionStart();
    logEvent('level_start', { level: lv, attempt: this.attempt });
    this.buildDom(box);
    this.rebuildBoard();
    this.updateHud();
    this.renderModals();
  },

  theme() { return chapterTheme(this.cfg.chapter); },
  skin() { return GEM_SKINS.find((s) => s.id === App.player.equipped.skin) || GEM_SKINS[0]; },
  tileFx() {
    if (!App.player.equipped.tileEffect) return null;
    return EFFECTS.find((e) => e.id === App.player.equipped.tileEffect) || null;
  },
  isBoss() { return this.cfg.mode === 'tap'; },

  buildDom(box) {
    const t = (k, v) => store.t(k, v);
    const theme = this.theme();
    const wrap = el('div', 'game-wrap');
    wrap.style.background = 'none';

    // top bar
    const top = el('div', 'game-top');
    const exitBtn = el('button', 'btn btn-ghost');
    exitBtn.type = 'button';
    exitBtn.style.cssText = 'padding:7px 14px;font-size:13px;';
    exitBtn.textContent = '← ' + t('game.exit');
    exitBtn.onclick = () => {
      this.playId += 1;
      sfx.click();
      App.level = null;
      renderApp();
    };
    top.appendChild(exitBtn);
    const titleBox = el('div', 'game-title bm-text-outline');
    titleBox.innerHTML = t('map.level') + ' ' + this.cfg.level +
      (this.isBoss() ? '<span class="boss-badge bm-text-outline">' + t('game.bossLevel') + '</span>' : '');
    top.appendChild(titleBox);
    const coins = coinPill();
    coins.id = 'game-coins';
    top.appendChild(coins);
    wrap.appendChild(top);

    // stats row
    const stats = el('div', 'stats-row');
    const movesBox = el('div', 'stat-box');
    movesBox.innerHTML = '<div class="lbl">' + t('game.moves') + '</div><div class="val" id="hud-moves">' + this.moves + '</div>';
    const scoreBox = el('div', 'stat-box');
    scoreBox.innerHTML = '<div class="lbl">' + t('game.score') + '</div><div class="val" id="hud-score">0</div>';
    stats.appendChild(movesBox);
    stats.appendChild(scoreBox);
    wrap.appendChild(stats);

    // goals
    const goals = el('div', 'goals-row');
    goals.id = 'goals-row';
    wrap.appendChild(goals);

    // board
    const boardOuter = el('div', 'board-outer');
    const boardBox = el('div', 'board-box bm-board-in');
    boardBox.style.background = theme.bg.dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.15)';
    boardBox.style.backdropFilter = 'blur(2px)';
    boardBox.style.boxShadow = theme.bg.dark
      ? '0 8px 30px rgba(0,0,0,.5), inset 0 0 40px rgba(34,224,255,.06)'
      : '0 8px 30px rgba(0,0,0,.25), inset 0 0 30px rgba(255,255,255,.08)';
    this.boardInner = el('div', 'board-inner');
    this.boardInner.id = 'board-inner';
    this.boardInner.style.aspectRatio = this.cfg.w + ' / ' + this.cfg.h;
    if (theme.tile.pattern === 'pixel') this.boardInner.classList.add('bm-checker-light');
    this.boardInner.onclick = (e) => {
      const cellEl = e.target.closest('[data-idx]');
      if (!cellEl) return;
      this.handleCellClick(Number(cellEl.dataset.idx));
    };
    boardBox.appendChild(this.boardInner);
    boardOuter.appendChild(boardBox);
    wrap.appendChild(boardOuter);

    // hint
    const hint = el('div', 'hint-line');
    hint.id = 'hint-line';
    wrap.appendChild(hint);

    // boosters
    const boosters = el('div', 'boosters-row');
    boosters.id = 'boosters-row';
    wrap.appendChild(boosters);
    const cancelRow = el('div', 'cancel-row');
    cancelRow.id = 'cancel-row';
    wrap.appendChild(cancelRow);

    // modals container
    this.modalBox = el('div');
    wrap.appendChild(this.modalBox);

    box.appendChild(wrap);
    this.renderBoosters();
    this.updateHint();
  },

  updateHint() {
    const hint = document.getElementById('hint-line');
    if (!hint) return;
    hint.textContent = this.activeBooster
      ? store.t('game.selectTarget') + ' (' + BOOSTER_MAP[this.activeBooster].icon + ')'
      : this.isBoss() ? store.t('game.tapHint') : store.t('game.swapHint');
    const cancelRow = document.getElementById('cancel-row');
    cancelRow.innerHTML = '';
    if (this.activeBooster) {
      const btn = el('button', 'btn btn-ghost');
      btn.type = 'button';
      btn.style.cssText = 'padding:5px 16px;font-size:12px;';
      btn.textContent = store.t('game.cancel');
      btn.onclick = () => { this.activeBooster = null; this.renderBoosters(); this.updateHint(); };
      cancelRow.appendChild(btn);
    }
  },

  renderBoosters() {
    const row = document.getElementById('boosters-row');
    if (!row) return;
    row.innerHTML = '';
    for (const id of ['hammer', 'bomb', 'cross', 'shuffle', 'undo', 'moves5']) {
      const def = BOOSTER_MAP[id];
      const count = App.player.boosters[id] || 0;
      const btn = el('button', 'booster-btn' + (this.activeBooster === id ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-label', def.name[App.player.lang]);
      btn.innerHTML = '<span>' + def.icon + '</span>' +
        '<span class="booster-count ' + (count > 0 ? 'has' : 'zero') + '">' + count + '</span>';
      btn.onclick = () => this.handleBoosterButton(id);
      row.appendChild(btn);
    }
  },

  goalMet(p, sc) {
    return this.cfg.goals.every((g) => {
      if (g.type === 'score') return sc >= g.count;
      if (g.type === 'collect') return (p.colors[g.color] || 0) >= g.count;
      if (g.type === 'item') return p.items >= g.count;
      if (g.type === 'stone') return p.stones >= g.count;
      return false;
    });
  },

  updateHud() {
    const mv = document.getElementById('hud-moves');
    if (mv) mv.textContent = this.moves;
    const sc = document.getElementById('hud-score');
    if (sc) sc.textContent = fmt(this.score);
    const coins = document.getElementById('game-coins');
    if (coins) coins.innerHTML = '🪙 ' + fmt(App.player.coins);
    const goals = document.getElementById('goals-row');
    if (!goals) return;
    goals.innerHTML = '';
    for (const g of this.cfg.goals) {
      let done = false;
      let content = '';
      if (g.type === 'score') {
        done = this.score >= g.count;
        content = '🏆 ' + store.t('game.scoreGoal') + ' ' + fmt(this.score) + '/' + fmt(g.count);
      } else if (g.type === 'collect') {
        const have = this.progress.colors[g.color] || 0;
        done = have >= g.count;
        const shape = gemShapeCss(g.color);
        const color = (this.skin().palette || this.theme().palette)[g.color] || '#999';
        content = '<span style="display:inline-block;width:14px;height:14px;border:1px solid rgba(255,255,255,.6);' +
          (shape.clipPath ? 'clip-path:' + shape.clipPath + ';' : '') +
          'border-radius:' + shape.borderRadius + ';background:' + color + '"></span> ' +
          have + '/' + g.count;
      } else if (g.type === 'item') {
        done = this.progress.items >= g.count;
        content = '🌰 ' + store.t('game.itemGoal') + ' ' + this.progress.items + '/' + g.count;
      } else {
        done = this.progress.stones >= g.count;
        content = '🪨 ' + store.t('game.stoneGoal') + ' ' + Math.min(this.progress.stones, g.count) + '/' + g.count;
      }
      const chip = el('span', 'chip' + (done ? ' done' : ''));
      chip.innerHTML = content + (done ? ' ✓' : '');
      goals.appendChild(chip);
    }
  },

  rebuildBoard() {
    const inner = this.boardInner;
    if (!inner) return;
    inner.innerHTML = '';
    const w = this.board.w, h = this.board.h;
    const cw = 100 / w, chh = 100 / h;
    for (let idx = 0; idx < this.board.cells.length; idx++) {
      const cell = this.board.cells[idx];
      if (!cell) continue;
      const r = Math.floor(idx / w), c = idx % w;
      const div = el('div', 'cell');
      div.style.cssText = 'left:' + (c * cw) + '%;top:' + (r * chh) + '%;width:' + cw + '%;height:' + chh + '%;';
      div.dataset.idx = String(idx);

      if (cell.blocker) {
        const hp = cell.blocker.hp;
        if (this.stonesHit.has(idx)) div.classList.add('bm-stone-hit');
        const pips = Array.from({ length: Math.max(1, hp) }, () => '<span></span>').join('');
        div.innerHTML = '<div class="stone-wrap" style="clip-path:polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%);background:rgba(28,24,20,.6);">' +
          '<div style="position:absolute;inset:8%;' +
          'background:' + (hp >= 2 ? 'linear-gradient(160deg,#9aa2ac,#5c646e)' : 'linear-gradient(160deg,#8a92a0,#4a5260)') + ';' +
          'box-shadow:inset 0 2px 3px rgba(255,255,255,.25), inset 0 -3px 5px rgba(0,0,0,.35);">' +
          (hp === 1 ? '<div style="height:100%;width:100%;opacity:.5;background:linear-gradient(115deg, transparent 42%, rgba(20,24,30,.7) 46%, rgba(20,24,30,.7) 50%, transparent 54%), linear-gradient(245deg, transparent 60%, rgba(20,24,30,.6) 66%, rgba(20,24,30,.6) 70%, transparent 74%)"></div>' : '') +
          '</div><div class="stone-pips">' + pips + '</div></div>';
        inner.appendChild(div);
        continue;
      }
      if (!cell.tile) {
        div.classList.add('void-cell');
        div.innerHTML = '<div class="void-dot"></div>';
        inner.appendChild(div);
        continue;
      }
      const isSelected = this.selected === idx;
      const tile = cell.tile;
      let anim = '';
      if (this.clearing.has(tile.id)) anim = 'pop';
      else if (this.born.has(idx)) anim = 'born';
      else if (this.spawned.has(tile.id)) anim = 'fall';
      const btn = el('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'cell ' + r + '-' + c);
      btn.className = (isSelected ? 'sel' : '') + (this.activeBooster ? ' targeting' : '');
      btn.innerHTML = tileHtml(tile, this.theme(), this.skin(), anim);
      div.appendChild(btn);
      if (this.shakeIdx === idx) div.classList.add('bm-shake');
      inner.appendChild(div);
    }
  },

  shake(idx) {
    this.shakeIdx = idx;
    this.rebuildBoard();
    setTimeout(() => {
      if (this.shakeIdx === idx) { this.shakeIdx = null; this.rebuildBoard(); }
    }, 600);
  },

  spawnParticles(frame) {
    if (!frame.board || frame.clearingIds.length === 0) return;
    const cells = frame.clearingIds
      .map((id) => frame.board.cells.findIndex((c) => c && c.tile && c.tile.id === id))
      .filter((i) => i >= 0)
      .slice(0, 14);
    const glyph = this.tileFx() ? this.tileFx().visual : '•';
    const color = this.skin().palette || this.theme().palette;
    for (const idx of cells) {
      const r = Math.floor(idx / frame.board.w), c = idx % frame.board.w;
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 45;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const p = el('span', 'bm-particle', glyph);
      p.style.left = ((c + 0.5) / frame.board.w * 100) + '%';
      p.style.top = ((r + 0.5) / frame.board.h * 100) + '%';
      p.style.fontSize = '14px';
      p.style.color = color[idx % color.length] || '#fff';
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.setProperty('--rot', (Math.random() * 240 - 120) + 'deg');
      this.boardInner.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  },

  spawnFloat(xPct, yPct, text) {
    const f = el('span', 'float-txt bm-float-up', text);
    f.style.left = xPct + '%';
    f.style.top = yPct + '%';
    this.boardInner.appendChild(f);
    setTimeout(() => f.remove(), 950);
  },

  /* big combo praise popup (era accent color) */
  spawnCombo(cascade) {
    const t = (k) => store.t(k);
    const praise = cascade >= 5 ? t('game.combo5') : cascade >= 4 ? t('game.combo4') : cascade === 3 ? t('game.combo3') : t('game.combo2');
    const wrap = el('span', 'bm-combo-wrap');
    const pop = el('span', 'bm-combo-pop', '×' + cascade + '! ' + praise);
    pop.style.color = this.theme().uiAccent;
    wrap.appendChild(pop);
    this.boardInner.appendChild(wrap);
    setTimeout(() => wrap.remove(), 1100);
  },

  /* expanding shockwave ring at a cell */
  spawnShock(idx, w, h) {
    const s = el('span', 'bm-shockwave');
    s.style.left = (((idx % w) + 0.5) / w * 100) + '%';
    s.style.top = ((Math.floor(idx / w) + 0.5) / h * 100) + '%';
    s.style.width = '34%';
    s.style.aspectRatio = '1';
    s.style.marginLeft = '-17%';
    s.style.marginTop = '-17%';
    this.boardInner.appendChild(s);
    setTimeout(() => s.remove(), 600);
  },

  pulseBoard() {
    const inner = this.boardInner;
    if (!inner) return;
    inner.classList.remove('bm-board-shake');
    void inner.offsetWidth; // restart animation
    inner.classList.add('bm-board-shake');
    setTimeout(() => inner.classList.remove('bm-board-shake'), 450);
  },

  async playFrames(res) {
    const playId = ++this.playId;
    this.busy = true;
    for (const frame of res.frames) {
      if (playId !== this.playId) return;
      this.board = frame.board;
      this.clearing = new Set(frame.clearingIds);
      this.born = new Set(frame.bornIds);
      this.spawned = new Set(frame.spawnIds);
      this.stonesHit = new Set(frame.stonesHit);
      if (frame.points > 0) {
        this.score += frame.points;
        if (frame.clearingIds.length > 0) {
          const idxs = frame.clearingIds
            .map((id) => frame.board.cells.findIndex((c) => c && c.tile && c.tile.id === id))
            .filter((i) => i >= 0);
          if (idxs.length > 0) {
            const cx = idxs.reduce((a, i) => a + ((i % frame.board.w) + 0.5), 0) / idxs.length / frame.board.w;
            const cy = idxs.reduce((a, i) => a + (Math.floor(i / frame.board.w) + 0.5), 0) / idxs.length / frame.board.h;
            this.spawnFloat(cx * 100, cy * 100, '+' + frame.points);
          }
        }
        this.updateHud();
      }
      if (frame.clearingIds.length > 0) { this.spawnParticles(frame); sfx.match(frame.cascade); }
      if (frame.stonesHit.length > 0) {
        sfx.boom();
        for (const idx of frame.stonesHit.slice(0, 3)) this.spawnShock(idx, frame.board.w, frame.board.h);
        this.pulseBoard();
      }
      if (frame.collectedIds.length > 0) sfx.coin();
      if (frame.cascade >= 2) {
        this.spawnCombo(frame.cascade);
        this.spawnFloat(50, 46, 'x' + frame.cascade + '!');
      }
      if (frame.cascade >= 3) this.pulseBoard();
      this.rebuildBoard();
      await sleep(frame.clearingIds.length > 0 ? 250 : 300);
      if (playId !== this.playId) return;
      this.clearing = new Set(); this.born = new Set(); this.spawned = new Set(); this.stonesHit = new Set();
      this.rebuildBoard();
    }
    this.progress.colors = this.progress.colors.map((v, i) => v + (res.colorsCollected[i] || 0));
    this.progress.items += res.itemsCollected;
    this.progress.stones += res.stonesDestroyed;
    if (res.shuffled) showToast(store.t('game.shuffled'));
    this.updateHud();
    this.busy = false;
  },

  afterMove(res, movesUsed) {
    const p = {
      colors: this.progress.colors.map((v, i) => v + (res.colorsCollected[i] || 0)),
      items: this.progress.items + res.itemsCollected,
      stones: this.progress.stones + res.stonesDestroyed,
    };
    const sc = this.score;
    const movesLeft = this.moves;
    if (this.goalMet(p, sc)) {
      const bonus = movesLeft * 50;
      const finalScore = sc + bonus;
      const stars = finalScore >= this.cfg.star3 ? 3 : finalScore >= this.cfg.star2 ? 2 : 1;
      sfx.win();
      setTimeout(() => sfx.star(1), 400);
      const info = store.recordWin(this.cfg.level, stars, finalScore, res.maxCascade, movesUsed, { daily: !!App.daily });
      this.score = finalScore;
      this.winInfo = { stars, reward: info.reward, firstClear: info.firstClear, newStars: info.newStars, bonus, streak: info.streak, mult: info.mult, piggy: info.piggy, event: info.event };
      logEvent('level_win', { level: this.cfg.level, stars: stars, score: finalScore, movesUsed: movesUsed, streak: info.streak, mult: info.mult, reward: info.reward, daily: info.event.daily ? 1 : 0, weekend: info.event.weekend || '', cascade: info.event.cascadeCoins });
      if (info.event.daily) logEvent('daily_win', { level: this.cfg.level, reward: info.reward });
      this.updateHud();
      this.renderModals();
    } else if (movesLeft <= 0) {
      sfx.lose();
      this.lostStreak = App.player.streak || 0;
      store.recordLoss();
      logEvent('level_lose', { level: this.cfg.level, score: sc, movesUsed: movesUsed, moves: this.cfg.moves });
      this.loseOpen = true;
      this.renderModals();
    }
  },

  async doMove(res, opts) {
    opts = opts || {};
    if (opts.snapshot) this.snapshot = opts.snapshot;
    if (opts.consume !== false) {
      this.moves -= 1;
      this.updateHud();
    }
    await this.playFrames(res);
    this.afterMove(res, opts.consume === false ? 0 : 1);
  },

  handleCellClick(idx) {
    if (!this.board || !this.cfg || this.busy || this.winInfo || this.loseOpen) return;
    const cell = this.board.cells[idx];
    if (!cell) return;

    if (this.activeBooster) {
      const r = Math.floor(idx / this.board.w), c = idx % this.board.w;
      if (this.activeBooster === 'hammer') {
        if (store.useBooster('hammer')) {
          this.activeBooster = null;
          this.renderBoosters(); this.updateHint();
          void this.doMove(hammerHit(this.board, r, c, this.cfg, this.rng), { consume: false });
        }
      } else if (this.activeBooster === 'bomb') {
        if (store.useBooster('bomb')) {
          this.activeBooster = null;
          this.renderBoosters(); this.updateHint();
          void this.doMove(bombBlast(this.board, r, c, this.cfg, this.rng), { consume: false });
        }
      } else if (this.activeBooster === 'cross') {
        if (store.useBooster('cross')) {
          this.activeBooster = null;
          this.renderBoosters(); this.updateHint();
          void this.doMove(crossBlast(this.board, r, c, this.cfg, this.rng), { consume: false });
        }
      }
      return;
    }

    if (this.cfg.mode === 'tap') {
      const res = tryTap(this.board, Math.floor(idx / this.board.w), idx % this.board.w, this.cfg, this.rng);
      if (res.valid) {
        this.moves -= 1;
        this.updateHud();
        void (async () => {
          await this.playFrames(res);
          this.afterMove(res, 1);
        })();
      } else {
        this.shake(idx);
      }
      return;
    }

    // swap mode
    const tile = cell.tile;
    if (!tile || tile.kind !== 'gem') return;
    if (this.selected === null) {
      this.selected = idx;
      sfx.click();
      this.rebuildBoard();
      return;
    }
    if (this.selected === idx) {
      this.selected = null;
      this.rebuildBoard();
      return;
    }
    const rs = Math.floor(this.selected / this.board.w), cs = this.selected % this.board.w;
    const rt = Math.floor(idx / this.board.w), ct = idx % this.board.w;
    if (Math.abs(rs - rt) + Math.abs(cs - ct) !== 1) {
      this.selected = idx;
      sfx.click();
      this.rebuildBoard();
      return;
    }
    const snapshot = {
      board: this.board, moves: this.moves, score: this.score,
      colors: [...this.progress.colors], items: this.progress.items, stones: this.progress.stones,
    };
    const res = trySwap(this.board, this.selected, idx, this.cfg, this.rng);
    if (!res.valid) {
      sfx.swap();
      this.selected = null;
      this.shake(idx);
      return;
    }
    this.selected = null;
    sfx.swap();
    void this.doMove(res, { snapshot });
  },

  handleBoosterButton(id) {
    if (this.busy || this.winInfo || this.loseOpen) return;
    sfx.click();
    if (id === 'shuffle') {
      if (this.board && this.cfg && store.useBooster('shuffle')) {
        const res = shuffleBoard(this.board, this.cfg, this.rng);
        this.board = res.frames[0].board;
        this.rebuildBoard();
        this.renderBoosters();
      } else if ((App.player.boosters.shuffle || 0) <= 0) {
        this.buyBoosterId = 'shuffle';
        this.renderModals();
      }
      return;
    }
    if (id === 'undo') {
      const snap = this.snapshot;
      if (snap && store.useBooster('undo')) {
        this.board = snap.board;
        this.moves = snap.moves;
        this.score = snap.score;
        this.progress = { colors: [...snap.colors], items: snap.items, stones: snap.stones };
        this.snapshot = null;
        this.rebuildBoard();
        this.updateHud();
        this.renderBoosters();
      } else if ((App.player.boosters.undo || 0) <= 0) {
        this.buyBoosterId = 'undo';
        this.renderModals();
      }
      return;
    }
    if (id === 'moves5') {
      this.buyBoosterId = 'moves5';
      this.renderModals();
      return;
    }
    if ((App.player.boosters[id] || 0) > 0) {
      this.activeBooster = this.activeBooster === id ? null : id;
      this.renderBoosters();
      this.updateHint();
    } else {
      this.buyBoosterId = id;
      this.renderModals();
    }
  },

  handlePlus5() {
    if ((App.player.boosters.moves5 || 0) > 0) {
      store.useBooster('moves5');
    } else if (App.player.coins >= BOOSTER_MAP.moves5.price) {
      store.buyBooster('moves5');
    } else {
      return;
    }
    sfx.coin();
    this.loseOpen = false;
    this.moves += 5;
    this.plus5Used += 1;
    this.updateHud();
    this.renderModals();
  },

  renderModals() {
    const box = this.modalBox;
    if (!box) return;
    box.innerHTML = '';
    const t = (k, v) => store.t(k, v);

    if (this.winInfo) {
      spawnWinConfetti();
      const over = el('div', 'modal-overlay');
      const modal = el('div', 'modal win');
      modal.innerHTML = '<h2>' + t('game.win') + '</h2>';
      const starsRow = el('div', 'stars-row');
      for (let n = 1; n <= 3; n++) {
        const s = el('span', n <= this.winInfo.stars ? 'bm-star-pop' : 'dim', '⭐');
        if (n <= this.winInfo.stars) s.style.animationDelay = (n * 0.22) + 's';
        starsRow.appendChild(s);
      }
      modal.appendChild(starsRow);
      const scoreLine = el('div', 'sub');
      scoreLine.innerHTML = t('game.score') + ': <b>' + fmt(this.score) + '</b>' +
        (this.winInfo.bonus > 0 ? '<div style="color:#fde68a">+' + this.winInfo.bonus + ' ⚡</div>' : '');
      modal.appendChild(scoreLine);
      const reward = el('div', 'reward-pill');
      reward.textContent = '🪙 +' + this.winInfo.reward + (this.winInfo.mult > 1 ? '  ×' + this.winInfo.mult : '');
      modal.appendChild(reward);
      /* Волна 4: бейджи событий */
      const ev = this.winInfo.event;
      if (ev && ev.daily) {
        const b = el('div', 'event-badge daily');
        b.textContent = t('daily.badge');
        modal.appendChild(b);
      }
      if (ev && ev.weekend === 'coins') {
        const b = el('div', 'event-badge coins');
        b.textContent = t('event.coinsBadge');
        modal.appendChild(b);
      }
      if (ev && ev.weekend === 'cascade' && ev.cascadeCoins > 0) {
        const b = el('div', 'event-badge cascade');
        b.textContent = t('event.cascadeBadge', { n: ev.maxCascade, c: ev.cascadeCoins });
        modal.appendChild(b);
      }
      /* Волна 2: серия побед */
      const streakBox = el('div');
      streakBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:6px;';
      const streakPill = el('div');
      streakPill.style.cssText = 'background:rgba(234,88,12,.92);color:#fff;border-radius:999px;padding:3px 12px;font-size:12px;font-weight:900;';
      streakPill.textContent = '🔥 ' + t('streak.title') + ': ' + this.winInfo.streak;
      streakBox.appendChild(streakPill);
      const chips = el('div');
      chips.style.cssText = 'display:flex;gap:4px;';
      for (let m = 2; m <= STREAK_MAX_MULT; m++) {
        const c = el('span');
        const on = this.winInfo.mult >= m;
        c.style.cssText = 'border-radius:999px;padding:1px 6px;font-size:10px;font-weight:900;' +
          (on ? 'background:#fff;color:#ea580c;' : 'background:rgba(0,0,0,.25);color:rgba(255,255,255,.6);');
        c.textContent = '×' + m;
        chips.appendChild(c);
      }
      streakBox.appendChild(chips);
      const nextHint = el('div');
      nextHint.style.cssText = 'font-size:12px;font-weight:700;color:#d1fae5;';
      nextHint.textContent = this.winInfo.mult >= STREAK_MAX_MULT
        ? t('streak.max')
        : t('streak.next', { m: this.winInfo.mult + 1, n: this.winInfo.mult + 1 - this.winInfo.streak });
      streakBox.appendChild(nextHint);
      modal.appendChild(streakBox);
      /* Волна 3: копилка в модали победы */
      const pig = this.winInfo.piggy;
      const pigPill = el('div');
      pigPill.style.cssText = 'border-radius:999px;padding:3px 12px;font-size:12px;font-weight:900;color:#fff;margin-top:4px;display:inline-block;' +
        (pig.ready ? 'background:#db2777;' : 'background:rgba(251,113,133,.8);');
      pigPill.textContent = t('piggy.deposit', { n: pig.deposit, w: Math.min(pig.wins, PIGGY_WINS_TARGET), m: PIGGY_WINS_TARGET });
      const pigWrap = el('div');
      pigWrap.style.cssText = 'text-align:center;';
      pigWrap.appendChild(pigPill);
      if (pig.ready) {
        const pigReady = el('div');
        pigReady.style.cssText = 'font-size:11px;font-weight:900;color:#fde68a;margin-top:2px;';
        pigReady.textContent = '🐷 ' + t('piggy.ready');
        pigWrap.appendChild(pigReady);
      }
      modal.appendChild(pigWrap);
      if (this.winInfo.firstClear) {
        const l = el('div', 'sub');
        l.style.cssText = 'font-weight:700;color:#d1fae5;';
        l.textContent = t('game.firstWin');
        modal.appendChild(l);
      } else if (this.winInfo.newStars) {
        const l = el('div', 'sub');
        l.style.cssText = 'font-weight:700;color:#fde68a;';
        l.textContent = t('game.newStars');
        modal.appendChild(l);
      }
      const col = el('div', 'col');
      const nextBtn = el('button', 'btn btn-white');
      nextBtn.type = 'button';
      nextBtn.textContent = t('game.next') + ' →';
      nextBtn.onclick = () => {
        this.winInfo = null;
        App.daily = false;
        if (this.cfg.level < TOTAL_LEVELS) { App.level = this.cfg.level + 1; renderApp(); }
        else { App.level = null; renderApp(); }
      };
      col.appendChild(nextBtn);
      const row2 = el('div', 'row2');
      const retryBtn = el('button', 'btn btn-ghost');
      retryBtn.style.flex = '1';
      retryBtn.type = 'button';
      retryBtn.textContent = t('game.retry');
      retryBtn.onclick = () => { this.winInfo = null; this.attempt += 1; renderApp(); };
      row2.appendChild(retryBtn);
      const exitBtn = el('button', 'btn btn-ghost');
      exitBtn.style.flex = '1';
      exitBtn.type = 'button';
      exitBtn.textContent = t('game.exit');
      exitBtn.onclick = () => { this.winInfo = null; App.level = null; renderApp(); };
      row2.appendChild(exitBtn);
      col.appendChild(row2);
      modal.appendChild(col);
      over.appendChild(modal);
      box.appendChild(over);
      return;
    }

    if (this.loseOpen) {
      const over = el('div', 'modal-overlay');
      const modal = el('div', 'modal lose');
      modal.innerHTML = '<h2>' + t('game.lose') + '</h2>';
      if (this.lostStreak >= 2) {
        const sl = el('div');
        sl.style.cssText = 'background:rgba(244,63,94,.8);color:#fff;border-radius:999px;padding:3px 12px;font-size:12px;font-weight:700;margin:2px auto 0;display:inline-block;';
        sl.textContent = '💔 ' + t('streak.lost');
        modal.appendChild(sl);
      }
      const col = el('div', 'col');
      if (this.plus5Used < 2) {
        const p5 = el('button', 'btn btn-amber');
        p5.type = 'button';
        p5.textContent = t('game.plus5') + ' · 🪙 ' + BOOSTER_MAP.moves5.price + ' ' + t('game.buyAndUse').toLowerCase();
        p5.onclick = () => this.handlePlus5();
        col.appendChild(p5);
      }
      const retryBtn = el('button', 'btn btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = t('game.retry');
      retryBtn.onclick = () => { this.loseOpen = false; this.attempt += 1; renderApp(); };
      col.appendChild(retryBtn);
      const exitBtn = el('button', 'btn btn-ghost');
      exitBtn.type = 'button';
      exitBtn.textContent = t('game.exit');
      exitBtn.onclick = () => { this.loseOpen = false; App.level = null; renderApp(); };
      col.appendChild(exitBtn);
      modal.appendChild(col);
      over.appendChild(modal);
      box.appendChild(over);
      return;
    }

    if (this.buyBoosterId) {
      const id = this.buyBoosterId;
      const def = BOOSTER_MAP[id];
      const over = el('div', 'modal-overlay');
      const modal = el('div', 'modal light');
      modal.innerHTML = '<h2>' + def.icon + ' ' + def.name[App.player.lang] + '</h2>' +
        '<div class="sub" style="opacity:.7">' + def.desc[App.player.lang] + '</div>';
      const col = el('div', 'col');
      const buyBtn = el('button', 'btn btn-amber');
      buyBtn.type = 'button';
      buyBtn.textContent = '🪙 ' + def.price + ' · ' + t('game.buyAndUse');
      buyBtn.onclick = () => {
        if (id === 'moves5') {
          this.handlePlus5();
        } else if (store.buyBooster(id)) {
          sfx.coin();
          if (this.activeBooster === null && id !== 'shuffle' && id !== 'undo') {
            this.activeBooster = id;
          }
        } else {
          showToast(t('shop.notEnough'));
        }
        this.buyBoosterId = null;
        this.renderBoosters();
        this.updateHint();
        this.renderModals();
        this.updateHud();
      };
      col.appendChild(buyBtn);
      const cancelBtn = el('button', 'btn');
      cancelBtn.type = 'button';
      cancelBtn.style.cssText = 'background:#e2e8f0;color:#334155;';
      cancelBtn.textContent = t('game.cancel');
      cancelBtn.onclick = () => { this.buyBoosterId = null; this.renderModals(); };
      col.appendChild(cancelBtn);
      modal.appendChild(col);
      over.appendChild(modal);
      box.appendChild(over);
    }
  },
};

/* ============================================================
 * SHOP SCREEN
 * ============================================================ */
function renderShop(box) {
  const wrap = el('div', 'panel-wrap');
  const t = (k) => store.t(k);

  const head = el('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
  head.innerHTML = '<h1 class="panel-title bm-text-outline">' + t('shop.title') + '</h1>';
  head.appendChild(coinPill());
  wrap.appendChild(head);

  const tabs = ['boosters', 'bank', 'skins', 'avatars', 'frames', 'names', 'effects'];
  const tabsRow = el('div', 'tabs-row');
  for (const tab of tabs) {
    const b = el('button', 'tab-btn' + (App.shopTab === tab ? ' active' : ''));
    b.type = 'button';
    b.textContent = t('shop.tab.' + tab);
    b.onclick = () => { sfx.click(); App.shopTab = tab; renderApp(); };
    tabsRow.appendChild(b);
  }
  wrap.appendChild(tabsRow);

  const content = el('div');
  const lang = App.player.lang;
  const equipBtn = (kind, id, price, ownedNow) => {
    const equippedId = kind === 'skin' ? App.player.equipped.skin
      : kind === 'avatar' ? App.player.equipped.avatar
      : kind === 'frame' ? App.player.equipped.frame
      : kind === 'nameStyle' ? App.player.equipped.nameStyle
      : kind === 'tileEffect' ? App.player.equipped.tileEffect
      : kind === 'avatarEffect' ? App.player.equipped.avatarEffect
      : App.player.equipped.nameEffect;
    const owned = ownedNow !== undefined ? ownedNow : App.player.owned[
      { skin: 'skins', avatar: 'avatars', frame: 'frames', nameStyle: 'nameStyles', tileEffect: 'effects', avatarEffect: 'effects', nameEffect: 'effects' }[kind]
    ].includes(id);
    const btn = el('button', 'btn ' + (equippedId === id ? 'btn-dark' : 'btn-primary'));
    btn.type = 'button';
    btn.style.cssText = 'padding:7px 14px;font-size:12px;white-space:nowrap;';
    if (equippedId === id) { btn.textContent = '✓ ' + t('shop.equipped'); btn.onclick = () => {}; }
    else if (owned) {
      btn.textContent = t('shop.equip');
      btn.onclick = () => { sfx.click(); store.equip(kind, id); renderApp(); };
    } else {
      btn.innerHTML = '🪙 ' + price + ' · ' + t('shop.buy');
      btn.onclick = () => {
        if (store.buyCosmetic(
          { skin: 'skins', avatar: 'avatars', frame: 'frames', nameStyle: 'nameStyles', tileEffect: 'effects', avatarEffect: 'effects', nameEffect: 'effects' }[kind],
          id, price,
        )) { sfx.coin(); showToast(t('shop.purchased')); }
        else showToast(t('shop.notEnough'));
        renderApp();
      };
    }
    return btn;
  };

  /* Волна 4: сезонная коллекция — витрина определяется календарём */
  const season = seasonOn(new Date());
  const seasonDef = SEASON_DEFS[season];
  const bundle = seasonalBundleFor(season);
  const seasonalBox = el('div', 'seasonal-box');
  const seasonalHead = el('div', 'seasonal-head');
  seasonalHead.innerHTML = '<span class="seasonal-title bm-text-outline">' + t('shop.seasonal') + '</span>' +
    '<span class="seasonal-sub">' + t('shop.seasonalSub', { icon: seasonDef.icon, season: seasonDef.name[App.player.lang] }) + '</span>';
  seasonalBox.appendChild(seasonalHead);
  const seasonalGrid = el('div', 'seasonal-grid');
  const seasonItems = [
    { kind: 'skin', id: bundle.skin.id, name: bundle.skin.name[App.player.lang], preview: bundle.skin.glyphs ? bundle.skin.glyphs.slice(0, 2).join('') : '🎨', price: bundle.skin.price },
    ...bundle.avatars.map((a) => ({ kind: 'avatar', id: a.id, name: a.emoji, preview: a.emoji, price: a.price })),
    { kind: 'frame', id: bundle.frame.id, name: bundle.frame.name[App.player.lang], preview: '🖼️', price: bundle.frame.price },
    { kind: 'nameStyle', id: bundle.nameStyle.id, name: bundle.nameStyle.name[App.player.lang], preview: 'Aa', price: bundle.nameStyle.price },
    { kind: 'tileEffect', id: bundle.effect.id, name: bundle.effect.name[App.player.lang], preview: bundle.effect.visual, price: bundle.effect.price },
  ];
  for (const it of seasonItems) {
    const card = el('div', 'seasonal-card');
    const ic = el('div', 'seasonal-ico', it.preview);
    const mid = el('div', 'seasonal-mid');
    mid.innerHTML = '<div class="seasonal-name">' + it.name + '</div>';
    mid.appendChild(equipBtn(it.kind, it.id, it.price));
    card.appendChild(ic);
    card.appendChild(mid);
    seasonalGrid.appendChild(card);
  }
  seasonalBox.appendChild(seasonalGrid);
  wrap.appendChild(seasonalBox);

  if (App.shopTab === 'boosters') {
    for (const b of BOOSTERS) {
      const item = el('div', 'shop-item');
      item.innerHTML = '<span style="font-size:26px">' + b.icon + '</span>' +
        '<div class="info"><div class="nm">' + b.name[lang] + '</div><div class="ds">' + b.desc[lang] + '</div></div>' +
        '<div style="text-align:right"><div class="pr">🪙 ' + b.price + '</div><div class="ds">×' + (App.player.boosters[b.id] || 0) + '</div></div>';
      const buy = el('button', 'btn btn-amber');
      buy.type = 'button';
      buy.style.cssText = 'padding:7px 14px;font-size:12px;white-space:nowrap;';
      buy.textContent = t('shop.buy');
      buy.onclick = () => {
        if (store.buyBooster(b.id)) { sfx.coin(); showToast(t('shop.purchased')); }
        else showToast(t('shop.notEnough'));
        renderApp();
      };
      item.appendChild(buy);
      content.appendChild(item);
    }
  } else if (App.shopTab === 'bank') {
    const note = el('div', 'shop-item');
    note.innerHTML = '<span style="font-size:26px">🏦</span><div class="info"><div class="nm">' + t('shop.simulatePay') + '</div><div class="ds">' + t('shop.demoNote') + '</div></div>';
    content.appendChild(note);
    for (const pack of COIN_PACKS) {
      const item = el('div', 'shop-item');
      item.innerHTML = '<span style="font-size:26px">🪙</span>' +
        '<div class="info"><div class="nm">' + fmt(pack.coins) + ' ' + t('common.coins') + (pack.bonus ? ' <span style="color:#34d399">' + pack.bonus + '</span>' : '') + '</div></div>' +
        '<span class="pr">' + pack.priceLabel + '</span>';
      const buy = el('button', 'btn btn-primary');
      buy.type = 'button';
      buy.style.cssText = 'padding:7px 14px;font-size:12px;white-space:nowrap;';
      buy.textContent = t('shop.simulatePay');
      buy.onclick = () => { sfx.coin(); store.addCoins(pack.coins); showToast(t('shop.purchased')); renderApp(); };
      item.appendChild(buy);
      content.appendChild(item);
    }
  } else if (App.shopTab === 'skins') {
    const grid = el('div', 'skins-grid');
    for (const s of GEM_SKINS) {
      const card = el('div', 'skin-card' + (App.player.equipped.skin === s.id ? ' equipped' : ''));
      const prev = el('div', 'skin-preview');
      prev.innerHTML = ANCHORS.map((_, ci) => previewTileHtml(ci, s)).join('');
      card.appendChild(prev);
      card.innerHTML = card.innerHTML + '<div style="font-size:12px;font-weight:800">' + s.name[lang] + '</div>';
      card.appendChild(equipBtn('skin', s.id, s.price, App.player.owned.skins.includes(s.id)));
      grid.appendChild(card);
    }
    content.appendChild(grid);
  } else if (App.shopTab === 'avatars') {
    const grid = el('div', 'skins-grid');
    for (const a of AVATARS) {
      const card = el('div', 'skin-card' + (App.player.equipped.avatar === a.id ? ' equipped' : ''));
      const bubble = el('div', 'avatar-bubble');
      bubble.style.cssText += 'margin:0 auto 6px;width:44px;height:44px;font-size:24px;background:' + a.bg + ';box-shadow:' + (App.player.equipped.avatar === a.id ? '0 0 0 2px #fbbf24' : 'none') + ';';
      bubble.textContent = a.emoji;
      card.appendChild(bubble);
      card.appendChild(equipBtn('avatar', a.id, a.price, App.player.owned.avatars.includes(a.id)));
      grid.appendChild(card);
    }
    content.appendChild(grid);
  } else if (App.shopTab === 'frames') {
    for (const f of FRAMES) {
      const item = el('div', 'shop-item');
      const demo = el('div', 'avatar-bubble');
      demo.style.cssText = 'width:40px;height:40px;font-size:20px;background:linear-gradient(135deg,#dbeafe,#93c5fd);box-shadow:' + f.css + ';flex-shrink:0;';
      demo.textContent = '🌱';
      item.appendChild(demo);
      item.insertAdjacentHTML('beforeend', '<div class="info"><div class="nm">' + f.name[lang] + '</div></div>');
      item.appendChild(equipBtn('frame', f.id, f.price, App.player.owned.frames.includes(f.id)));
      content.appendChild(item);
    }
  } else if (App.shopTab === 'names') {
    for (const ns of NAME_STYLES) {
      const item = el('div', 'shop-item');
      const demo = el('div');
      demo.style.cssText = 'font-size:16px;width:110px;flex-shrink:0;' + ns.css;
      demo.textContent = App.player.name || 'Player';
      item.appendChild(demo);
      item.insertAdjacentHTML('beforeend', '<div class="info"><div class="nm">' + ns.name[lang] + '</div></div>');
      item.appendChild(equipBtn('nameStyle', ns.id, ns.price, App.player.owned.nameStyles.includes(ns.id)));
      content.appendChild(item);
    }
  } else {
    const groups = [
      { kind: 'tileEffect', title: t('shop.effectTile'), items: EFFECTS.filter((e) => e.kind === 'tile') },
      { kind: 'avatarEffect', title: t('shop.effectAvatar'), items: EFFECTS.filter((e) => e.kind === 'avatar') },
      { kind: 'nameEffect', title: t('shop.effectName'), items: EFFECTS.filter((e) => e.kind === 'name') },
    ];
    for (const g of groups) {
      const h = el('div');
      h.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:10px 0 6px;';
      h.textContent = g.title;
      content.appendChild(h);
      for (const e of g.items) {
        const item = el('div', 'shop-item');
        const visual = e.kind === 'tile' ? e.visual
          : e.kind === 'avatar' ? { glow: '✨', pulse: '💫', spin: '🌀', aurora: '🌈', flame: '🔥', galaxy: '🌌' }[e.visual]
          : { glow: '🌟', rainbow: '🏳️‍🌈', blink: '💡', wave: '〰️', fire: '🔥', starlight: '⭐' }[e.visual];
        item.innerHTML = '<span style="font-size:22px;width:30px;text-align:center">' + visual + '</span>' +
          '<div class="info"><div class="nm">' + e.name[lang] + '</div></div>' +
          '<span class="pr">🪙 ' + e.price + '</span>';
        item.appendChild(equipBtn(g.kind, e.id, e.price, App.player.owned.effects.includes(e.id)));
        content.appendChild(item);
      }
    }
  }

  wrap.appendChild(content);
  box.appendChild(wrap);
}

/* ============================================================
 * RANKS SCREEN
 * ============================================================ */
function renderRanks(box) {
  const wrap = el('div', 'panel-wrap');
  const t = (k, v) => store.t(k);

  wrap.innerHTML = '<h1 class="panel-title bm-text-outline">' + t('ranks.title') + '</h1>';

  const maxUnlocked = store.maxUnlocked();
  const cleared = Math.max(0, maxUnlocked - 1);
  const playerEntry = {
    id: 'player',
    name: App.player.name || 'Player',
    level: cleared,
    stars: store.totalStars(),
    avatarId: App.player.equipped.avatar,
    frameId: App.player.equipped.frame,
    nameStyleId: App.player.equipped.nameStyle,
    nameEffectId: App.player.equipped.nameEffect || null,
    isPlayer: true,
  };
  const all = [...App.bots, playerEntry].sort((x, y) =>
    y.level - x.level || y.stars - x.stars || (x.isPlayer ? -1 : 1));
  const pos = all.findIndex((e) => e.isPlayer) + 1;

  const info = el('div');
  info.style.cssText = 'font-size:13px;opacity:.85;';
  info.textContent = fmt(all.length) + ' ' + t('ranks.players') + ' · ' + t('ranks.youAre') + ' #' + pos;
  wrap.appendChild(info);

  const search = el('input', 'search-input');
  search.type = 'text';
  search.placeholder = t('ranks.search');
  search.value = App.ranksQuery;
  search.oninput = () => { App.ranksQuery = search.value; renderApp(); };
  wrap.appendChild(search);

  const q = App.ranksQuery.trim().toLowerCase();
  const filtered = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all;

  if (!q && filtered.length >= 3) {
    const podium = el('div', 'rank-podium');
    const medals = ['🥇', '🥈', '🥉'];
    const order = [1, 0, 2];
    for (const i of order) {
      const e = filtered[i];
      const pod = el('div', 'pod');
      pod.innerHTML = '<div class="em">' + medals[i] + '</div>' +
        '<div style="font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + e.name + '</div>' +
        '<div style="opacity:.75">' + t('ranks.level') + ' ' + fmt(e.level) + ' · ⭐ ' + fmt(e.stars) + '</div>';
      if (e.isPlayer) pod.style.boxShadow = '0 0 0 2px #fbbf24';
      podium.appendChild(pod);
    }
    wrap.appendChild(podium);
  }

  // list: top 30 + window around player
  const shown = [];
  const topN = q ? 60 : 30;
  const seen = new Set();
  filtered.slice(0, topN).forEach((e, i) => { shown.push({ e, p: i + 1 }); seen.add(e.id); });
  if (!q) {
    const around = 3;
    for (let i = Math.max(0, pos - around - 1); i <= Math.min(filtered.length - 1, pos + around - 1); i++) {
      if (!seen.has(filtered[i].id)) { shown.push({ e: filtered[i], p: i + 1 }); seen.add(filtered[i].id); }
    }
  }
  shown.sort((a, b) => a.p - b.p);
  let prevP = 0;
  for (const { e, p } of shown) {
    if (prevP && p - prevP > 1) {
      const dots = el('div');
      dots.style.cssText = 'text-align:center;opacity:.5;font-size:12px;margin:2px 0;';
      dots.textContent = '···';
      wrap.appendChild(dots);
    }
    prevP = p;
    const row = el('div', 'rank-row' + (e.isPlayer ? ' me' : ''));
    const av = AVATARS.find((a) => a.id === e.avatarId) || AVATARS[0];
    const fr = FRAMES.find((f) => f.id === e.frameId) || FRAMES[0];
    const ns = NAME_STYLES.find((s) => s.id === e.nameStyleId) || NAME_STYLES[0];
    const avBox = el('div', 'avatar-bubble');
    avBox.style.cssText = 'width:32px;height:32px;font-size:17px;background:' + av.bg + ';box-shadow:' + fr.css + ';flex-shrink:0;';
    avBox.textContent = av.emoji;
    row.appendChild(avBox);
    const nm = el('div', 'nm');
    nm.style.cssText += ns.css;
    if (e.isPlayer) nm.innerHTML = '<span>' + e.name + ' (' + t('ranks.you') + ')</span>';
    else nm.textContent = e.name;
    row.appendChild(nm);
    const lv = el('span');
    lv.style.cssText = 'font-weight:800;white-space:nowrap;';
    lv.textContent = t('ranks.level') + ' ' + fmt(e.level);
    row.appendChild(lv);
    const st = el('span');
    st.style.cssText = 'white-space:nowrap;';
    st.textContent = '⭐ ' + fmt(e.stars);
    row.appendChild(st);
    wrap.appendChild(row);
  }

  box.appendChild(wrap);
}

/* ============================================================
 * PROFILE SCREEN (+ settings)
 * ============================================================ */
function renderProfile(box) {
  const wrap = el('div', 'panel-wrap');
  const t = (k, v) => store.t(k, v);
  const lang = App.player.lang;

  const head = el('div', 'profile-head');
  const av = AVATARS.find((a) => a.id === App.player.equipped.avatar) || AVATARS[0];
  const fr = FRAMES.find((f) => f.id === App.player.equipped.frame) || FRAMES[0];
  const ns = NAME_STYLES.find((s) => s.id === App.player.equipped.nameStyle) || NAME_STYLES[0];
  const bubble = el('div', 'avatar-bubble');
  bubble.style.cssText = 'background:' + av.bg + ';box-shadow:' + fr.css + ';';
  bubble.textContent = av.emoji;
  head.appendChild(bubble);
  const nameBox = el('div');
  const nameTxt = el('div');
  nameTxt.style.cssText = 'font-size:20px;font-weight:900;' + ns.css;
  nameTxt.textContent = App.player.name || 'Player';
  nameBox.appendChild(nameTxt);
  const sub = el('div');
  sub.style.cssText = 'font-size:12px;opacity:.75;';
  sub.textContent = t('ranks.level') + ' ' + Math.max(0, store.maxUnlocked() - 1) + ' · ⭐ ' + store.totalStars() +
    ((App.player.streak || 0) >= 2 ? ' · 🔥 ×' + Math.min(5, App.player.streak) : '');
  nameBox.appendChild(sub);
  head.appendChild(nameBox);
  wrap.appendChild(head);

  // name form
  const form = el('div', 'card');
  form.style.cssText = 'padding:12px;display:flex;gap:8px;align-items:center;';
  const input = el('input', 'name-input');
  input.type = 'text';
  input.maxLength = 16;
  input.placeholder = t('profile.namePlaceholder');
  input.value = App.player.name;
  const saveBtn = el('button', 'btn btn-primary');
  saveBtn.type = 'button';
  saveBtn.style.cssText = 'padding:9px 16px;white-space:nowrap;';
  saveBtn.textContent = t('profile.save');
  saveBtn.onclick = () => {
    sfx.click();
    store.setName(input.value);
    App.savedFlash = true;
    renderApp();
    setTimeout(() => { App.savedFlash = false; }, 1500);
  };
  form.appendChild(input);
  form.appendChild(saveBtn);
  if (App.savedFlash) {
    const ok = el('div');
    ok.style.cssText = 'font-size:12px;color:#6ee7b7;margin-top:6px;';
    ok.textContent = '✓ ' + t('profile.saved');
    wrap.appendChild(ok);
  }
  wrap.appendChild(form);

  // stats
  const statsTitle = el('div');
  statsTitle.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:14px 0 4px;';
  statsTitle.textContent = t('profile.stats');
  wrap.appendChild(statsTitle);
  const grid = el('div', 'stat-grid');
  const levelsCleared = Object.keys(App.player.stars).length;
  const statsData = [
    [String(App.player.stats.wins), t('profile.stat.wins')],
    [String(levelsCleared), t('profile.stat.levels')],
    [String(store.totalStars()), t('profile.stat.stars')],
    ['x' + Math.max(0, App.player.stats.bestCascade), t('profile.stat.bestCascade')],
    [fmt(App.player.stats.totalScore), t('profile.stat.totalScore')],
    [fmt(App.player.stats.movesMade), t('profile.stat.moves')],
    [String(Math.max(0, App.player.stats.bestStreak || 0)), t('profile.stat.streak')],
  ];
  for (const [v, k] of statsData) {
    const card = el('div', 'stat-card');
    card.innerHTML = '<div class="v">' + v + '</div><div class="k">' + k + '</div>';
    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  /* Волна 2: аналитика + экспорт JSON */
  const anTitle = el('div');
  anTitle.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:14px 0 4px;';
  anTitle.textContent = t('profile.analytics');
  wrap.appendChild(anTitle);
  const anCard = el('div', 'card');
  anCard.style.cssText = 'padding:12px;';
  const sum = analyticsSummary();
  const anInfo = el('div');
  anInfo.style.cssText = 'font-size:12px;opacity:.75;margin-bottom:8px;';
  anInfo.textContent = t('profile.analyticsInfo', { n: sum.total, s: sum.sessions });
  anCard.appendChild(anInfo);
  const exportBtn = el('button', 'btn');
  exportBtn.type = 'button';
  exportBtn.style.cssText = 'background:#334155;color:#fff;width:100%;';
  exportBtn.textContent = '⬇️ ' + t('profile.export');
  exportBtn.onclick = () => {
    const ok = exportEventsJson({
      player: {
        level: store.maxUnlocked(), stars: store.totalStars(), coins: App.player.coins,
        streak: App.player.streak || 0, bestStreak: App.player.stats.bestStreak || 0, wins: App.player.stats.wins,
      },
    });
    if (ok) {
      sfx.coin();
      exportBtn.textContent = '✓ ' + t('profile.exportDone');
      setTimeout(() => { exportBtn.textContent = '⬇️ ' + t('profile.export'); }, 1500);
    }
  };
  anCard.appendChild(exportBtn);
  wrap.appendChild(anCard);

  // equipped
  const eqTitle = el('div');
  eqTitle.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:14px 0 0;';
  eqTitle.textContent = t('profile.equipped');
  wrap.appendChild(eqTitle);
  const eqList = el('div', 'eq-list');
  const eqData = [
    ['🎨', (GEM_SKINS.find((s) => s.id === App.player.equipped.skin) || GEM_SKINS[0]).name[lang]],
    [av.emoji, t('shop.tab.avatars')],
    ['🖼️', (FRAMES.find((f) => f.id === App.player.equipped.frame) || FRAMES[0]).name[lang]],
    ['✍️', ns.name[lang]],
  ];
  for (const [icon, label] of eqData) {
    const chip = el('span', 'chip');
    chip.textContent = icon + ' ' + label;
    eqList.appendChild(chip);
  }
  wrap.appendChild(eqList);

  // settings
  const settings = el('div', 'settings-block');
  settings.innerHTML = '<div style="font-size:14px;font-weight:900;margin-bottom:6px;">⚙️ ' + t('settings.title') + '</div>';
  const rowLang = el('div', 'settings-row');
  rowLang.innerHTML = '<span>' + t('settings.language') + '</span>';
  const segLang = el('div', 'seg');
  for (const l of ['ru', 'en']) {
    const b = el('button', App.player.lang === l ? 'on' : '', l.toUpperCase());
    b.type = 'button';
    b.onclick = () => { sfx.click(); store.setLang(l); renderApp(); };
    segLang.appendChild(b);
  }
  rowLang.appendChild(segLang);
  settings.appendChild(rowLang);

  const rowSound = el('div', 'settings-row');
  rowSound.innerHTML = '<span>' + t('settings.sound') + '</span>';
  const segSound = el('div', 'seg');
  for (const v of [true, false]) {
    const b = el('button', App.player.sound === v ? 'on' : '', v ? t('settings.on') : t('settings.off'));
    b.type = 'button';
    b.onclick = () => { store.setSound(v); sfx.click(); renderApp(); };
    segSound.appendChild(b);
  }
  rowSound.appendChild(segSound);
  settings.appendChild(rowSound);

  const resetBtn = el('button', 'btn');
  resetBtn.type = 'button';
  resetBtn.style.cssText = 'background:rgba(244,63,94,.85);color:#fff;width:100%;margin-top:8px;';
  resetBtn.textContent = '🗑️ ' + t('settings.reset');
  resetBtn.onclick = () => { renderResetConfirm(); };
  settings.appendChild(resetBtn);
  wrap.appendChild(settings);

  box.appendChild(wrap);

  function renderResetConfirm() {
    const over = el('div', 'modal-overlay');
    over.style.zIndex = '90';
    const modal = el('div', 'modal light');
    modal.innerHTML = '<h2>' + t('settings.reset') + '</h2><div class="sub">' + t('settings.resetConfirm') + '</div>';
    const col = el('div', 'col');
    const yes = el('button', 'btn');
    yes.type = 'button';
    yes.style.cssText = 'background:#e11d48;color:#fff;';
    yes.textContent = t('settings.resetYes');
    yes.onclick = () => { store.resetAll(); over.remove(); showToast(t('settings.resetDone')); renderApp(); };
    col.appendChild(yes);
    const no = el('button', 'btn');
    no.type = 'button';
    no.style.cssText = 'background:#e2e8f0;color:#334155;';
    no.textContent = t('settings.resetNo');
    no.onclick = () => over.remove();
    col.appendChild(no);
    modal.appendChild(col);
    over.appendChild(modal);
    document.body.appendChild(over);
  }
}

/* ---------------- boot ---------------- */
App.player = loadState();
setSoundEnabled(App.player.sound);
App.bots = generateBots();
logSessionStart();
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
if (document.readyState !== 'loading') renderApp();
