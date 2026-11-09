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
/* Волна 2: множитель награды за серию побед (поражение обнуляет) */
const STREAK_MAX_MULT = 5;
function streakMult(streak) { return Math.max(1, Math.min(STREAK_MAX_MULT, streak || 0)); }

/* ---------------- Волна 4: события (детерминированы по календарю) ---------------- */
function dateKeyOf(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
function dateSeed(dateKey) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const DAILY_REWARD_MULT = 2;
function dailyLevelFor(dateKey) {
  const rng = mulberry32(dateSeed(dateKey));
  return 1 + Math.floor(rng() * TOTAL_LEVELS);
}
const WEEKEND_EVENT_DEFS = {
  coins: { id: 'coins', icon: '🪙', name: { ru: 'Золотые выходные', en: 'Golden Weekend' }, desc: { ru: 'Все победы приносят ×2 монет — только сегодня!', en: 'All wins grant ×2 coins — today only!' } },
  cascade: { id: 'cascade', icon: '🌊', name: { ru: 'Каскадный уикенд', en: 'Cascade Weekend' }, desc: { ru: 'Каскады 3+ приносят бонусные монеты к награде!', en: 'Cascades of 3+ grant bonus coins on top of the reward!' } },
};
function weekendEventFor(dateKey) {
  const p = dateKey.split('-');
  const dow = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
  if (dow === 6) return 'coins';
  if (dow === 0) return 'cascade';
  return null;
}
const CASCADE_BONUS_FROM = 3;
function cascadeBonus(maxCascade) {
  const steps = Math.max(0, Math.min(maxCascade || 0, 8) - (CASCADE_BONUS_FROM - 1));
  return steps * 30;
}
const SEASON_DEFS = {
  autumn: { id: 'autumn', icon: '🍂', name: { ru: 'Осень', en: 'Autumn' } },
  winter: { id: 'winter', icon: '❄️', name: { ru: 'Зима', en: 'Winter' } },
  spring: { id: 'spring', icon: '🌷', name: { ru: 'Весна', en: 'Spring' } },
  summer: { id: 'summer', icon: '☀️', name: { ru: 'Лето', en: 'Summer' } },
};
function seasonOfMonth(month0) {
  const m = ((month0 % 12) + 12) % 12 + 1;
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}
function seasonOn(now) { return seasonOfMonth(now.getMonth()); }

/* ---------------- Волна 6: командный сундук (зеркало team.ts) ---------------- */
function isoWeekNum(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (d.getDay() + 6) % 7; // Пн=0..Вс=6
  d.setDate(d.getDate() - day + 3); // четверг текущей недели — его год и неделя по ISO
  const isoYear = d.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const monday1 = new Date(isoYear, 0, 4 - jan4Day);
  const week = Math.round((d.getTime() - monday1.getTime()) / (7 * 86400000)) + 1;
  return { year: isoYear, week: week };
}
function weekKeyOf(now) {
  const p = isoWeekNum(now);
  return p.year + '-W' + String(p.week).padStart(2, '0');
}
function dayIndexOf(now) { return (now.getDay() + 6) % 7; }
const TEAM_BOTS = 25;
const TEAM_CHESTS = [
  { need: 5000, reward: 150, icon: '📦', name: { ru: 'Деревянный', en: 'Wooden' } },
  { need: 15000, reward: 300, icon: '🎁', name: { ru: 'Серебряный', en: 'Silver' } },
  { need: 35000, reward: 600, icon: '🏆', name: { ru: 'Золотой', en: 'Golden' } },
  { need: 70000, reward: 1200, icon: '💎', name: { ru: 'Бриллиантовый', en: 'Diamond' } },
];
function chestReachedFor(pot) {
  let n = 0;
  for (const c of TEAM_CHESTS) if (pot >= c.need) n++;
  return n;
}
function chestRewardBetween(from, to) {
  let sum = 0;
  for (let i = Math.max(0, from); i < Math.min(to, TEAM_CHESTS.length); i++) sum += TEAM_CHESTS[i].reward;
  return sum;
}
const TEAM_BOT_NAMES = ['Ирина', 'Алекс', 'Мария', 'Дмитрий', 'Софья', 'Максим', 'Алиса', 'Егор', 'Полина', 'Артём', 'Вика', 'Никита', 'Лиза', 'Кирилл', 'Настя', 'Роман', 'Даша', 'Влад', 'Катя', 'Олег', 'Юля', 'Саша', 'Глеб', 'Мила', 'Тимур'];
function teamBots(weekKey) {
  const rng = mulberry32(dateSeed(weekKey + '#team'));
  const bots = [];
  for (let i = 0; i < TEAM_BOTS; i++) {
    const name = TEAM_BOT_NAMES[i % TEAM_BOT_NAMES.length] + (rng() < 0.4 ? ' ' + '🌼🌸🌻🌷🌺'[Math.floor(rng() * 5)] : '');
    /* день активен с шансом 0.55 → ~3.9 активных дня; БЕЗ sort со случайным
     * компаратором — число вызовов rng одинаково во всех движках (V8/JSC) */
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (let d = 0; d < 7; d++) {
      if (rng() < 0.55) perDay[d] = 100 + Math.floor(rng() * 251);
    }
    let total = 0;
    for (const v of perDay) total += v;
    bots.push({ name: name, perDay: perDay, total: total });
  }
  return bots;
}
function teamBotPotFor(weekKey, dayIdx) {
  let sum = 0;
  for (const b of teamBots(weekKey)) {
    for (let d = 0; d <= Math.min(dayIdx, 6); d++) sum += b.perDay[d];
  }
  return sum;
}
function teamSnapshot(weekKey, dayIdx, playerContrib) {
  const botPot = teamBotPotFor(weekKey, dayIdx);
  let botTotal = 0;
  for (const b of teamBots(weekKey)) botTotal += b.total;
  const pot = botPot + Math.max(0, playerContrib);
  return { week: weekKey, dayIdx: dayIdx, botPot: botPot, playerPot: Math.max(0, playerContrib), pot: pot, reached: chestReachedFor(pot), botTotal: botTotal };
}

function defaultState() {
  return {
    name: '', lang: 'ru', sound: true, coins: 300, stars: {}, scores: {},
    boosters: Object.assign({}, DEFAULT_BOOSTERS),
    owned: {
      skins: ['classic', 'stones'], avatars: ['av-seed', 'av-flower'],
      frames: ['fr-none'], nameStyles: ['ns-basic'], effects: [],
    },
    equipped: { skin: 'classic', avatar: 'av-seed', frame: 'fr-none', nameStyle: 'ns-basic', tileEffect: '', avatarEffect: '', nameEffect: '' },
    stats: { wins: 0, bestCascade: 0, totalScore: 0, movesMade: 0, bestStreak: 0 },
    streak: 0,
    /* Волна 3: сад + копилка (аддитивно, §5.4) */
    starsSpent: 0,
    garden: { restored: [] },
    piggy: { coins: 0, wins: 0 },
    /* Волна 4: уровень дня (фиксируется на сутки при первом открытии карты) */
    daily: { date: '', level: 1, done: false },
    /* Волна 6: командный сундук (аддитивно, §5.4) */
    team: { week: '', contributed: 0, claimed: 0 },
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
  /* Волна 3: аддитивная миграция сад/копилка */
  out.starsSpent = typeof (s && s.starsSpent) === 'number' ? s.starsSpent : 0;
  out.garden = { restored: Array.isArray(s && s.garden && s.garden.restored) ? s.garden.restored.slice() : [] };
  out.piggy = {
    coins: s && s.piggy && typeof s.piggy.coins === 'number' ? s.piggy.coins : 0,
    wins: s && s.piggy && typeof s.piggy.wins === 'number' ? s.piggy.wins : 0,
  };
  /* Волна 4: аддитивная миграция уровня дня */
  out.daily = {
    date: s && s.daily && typeof s.daily.date === 'string' ? s.daily.date : '',
    level: s && s.daily && typeof s.daily.level === 'number' ? s.daily.level : 1,
    done: !!(s && s.daily && s.daily.done),
  };
  /* Волна 6: аддитивная миграция командного сундука */
  out.team = {
    week: s && s.team && typeof s.team.week === 'string' ? s.team.week : '',
    contributed: s && s.team && typeof s.team.contributed === 'number' ? s.team.contributed : 0,
    claimed: s && s.team && typeof s.team.claimed === 'number' ? Math.max(0, Math.min(4, s.team.claimed)) : 0,
  };
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
  recordWin(level, stars, score, maxCascade, movesUsed, opts) {
    const s = App.player;
    const prevStars = s.stars[level] || 0;
    const firstClear = !(level in s.stars);
    const newStars = stars > prevStars;
    const chapter = chapterOfLevel(level);
    const base = firstClear ? 30 + stars * 10 + chapter * 5 : 10 + stars * 5;
    const streak = (s.streak || 0) + 1;
    const mult = streakMult(streak);
    /* Волна 4: события — уровень дня ×2, выходные ×2 монет / каскад-бонус */
    const isDaily = !!(opts && opts.daily);
    const weekend = weekendEventFor(dateKeyOf(new Date()));
    const cascadeCoins = weekend === 'cascade' ? cascadeBonus(maxCascade) : 0;
    const eventMult = (isDaily ? DAILY_REWARD_MULT : 1) * (weekend === 'coins' ? 2 : 1);
    const reward = base * mult * eventMult + cascadeCoins;
    s.stars[level] = Math.max(prevStars, stars);
    s.scores[level] = Math.max(s.scores[level] || 0, score);
    s.coins += reward;
    s.streak = streak;
    /* Волна 4: уровень дня отмечается пройденным только за свой день */
    const today = dateKeyOf(new Date());
    if (isDaily && s.daily && s.daily.date === today) { s.daily.done = true; }
    s.stats.wins += 1;
    s.stats.bestCascade = Math.max(s.stats.bestCascade || 0, maxCascade);
    s.stats.totalScore += score;
    s.stats.movesMade += movesUsed;
    s.stats.bestStreak = Math.max(s.stats.bestStreak || 0, streak);
    /* Волна 3: взнос победы в копилку */
    const deposit = piggyDeposit(level);
    const piggyWins = (s.piggy.wins || 0) + 1;
    const piggyCoins = (s.piggy.coins || 0) + deposit;
    s.piggy.coins = piggyCoins;
    s.piggy.wins = piggyWins % PIGGY_WINS_TARGET;
    /* Волна 6: очки победы летят в общий горшок команды */
    const wk = weekKeyOf(new Date());
    if (s.team && s.team.week === wk) {
      s.team.contributed = (s.team.contributed || 0) + score;
    } else {
      s.team = { week: wk, contributed: score, claimed: 0 };
    }
    saveState();
    return { firstClear, newStars, reward, base, streak, mult, piggy: { deposit, coins: piggyCoins, wins: piggyWins, ready: piggyWins >= PIGGY_WINS_TARGET }, event: { daily: isDaily, weekend: weekend, cascadeCoins: cascadeCoins, maxCascade: maxCascade } };
  },
  /* Волна 4: уровень дня фиксируется при первом открытии в сутки и живёт до 00:00 */
  ensureDaily() {
    const s = App.player;
    const today = dateKeyOf(new Date());
    if (s.daily && s.daily.date === today) return s.daily;
    const daily = { date: today, level: Math.min(dailyLevelFor(today), Math.max(1, this.maxUnlocked())), done: false };
    s.daily = daily;
    saveState();
    return daily;
  },
  /* Волна 6: командный сундук — перекат недели (из рендера карты) */
  ensureTeam() {
    const s = App.player;
    const week = weekKeyOf(new Date());
    if (s.team && s.team.week === week) return s.team;
    s.team = { week: week, contributed: 0, claimed: 0 };
    saveState();
    return s.team;
  },
  computeTeam() {
    const s = App.player;
    const now = new Date();
    const week = weekKeyOf(now);
    const dayIdx = dayIndexOf(now);
    const sameWeek = s.team && s.team.week === week;
    const contributed = sameWeek ? s.team.contributed : 0;
    const claimed = sameWeek ? s.team.claimed : 0;
    const snap = teamSnapshot(week, dayIdx, contributed);
    const nextChest = TEAM_CHESTS[snap.reached];
    return {
      week: week, dayIdx: dayIdx, contributed: contributed, claimed: claimed,
      botPot: snap.botPot, playerPot: snap.playerPot, pot: snap.pot, reached: snap.reached,
      nextNeed: nextChest ? nextChest.need : null,
    };
  },
  claimTeamChests() {
    const s = App.player;
    const week = weekKeyOf(new Date());
    if (!s.team || s.team.week !== week) return 0;
    const snap = teamSnapshot(week, dayIndexOf(new Date()), s.team.contributed);
    const reached = chestReachedFor(snap.pot);
    if (reached <= s.team.claimed) return 0;
    const coins = chestRewardBetween(s.team.claimed, reached);
    s.coins += coins;
    s.team.claimed = reached;
    saveState();
    return coins;
  },
  recordLoss() { if (App.player.streak) { App.player.streak = 0; saveState(); } },
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
  /* Волна 3: звёзды, доступные на траты в саду */
  starsAvailable() {
    return Math.max(0, this.totalStars() - (App.player.starsSpent || 0));
  },
  restoreGarden(id) {
    const s = App.player;
    const def = GARDEN_OBJECTS.find((o) => o.id === id);
    if (!def || s.garden.restored.includes(id)) return false;
    if (this.starsAvailable() < def.cost) return false;
    s.starsSpent += def.cost;
    s.coins += gardenCoinsBack(def.cost);
    s.garden.restored.push(id);
    saveState();
    return true;
  },
  openPiggy() {
    const s = App.player;
    if (!s.piggy.coins) return 0;
    const got = s.piggy.coins;
    s.coins += got;
    s.piggy.coins = 0;
    s.piggy.wins = 0;
    saveState();
    return got;
  },
  resetAll() {
    const keepLang = App.player.lang;
    App.player = normalizeState(defaultState());
    App.player.lang = keepLang;
    setSoundEnabled(App.player.sound);
    saveState();
  },
};

/* ---------------- лёгкая аналитика (Волна 2) ----------------
 * Кольцо событий в localStorage, без внешних сервисов (§5.6).
 * Выгрузка JSON — из профиля. Ключ ≠ сейв (§5.4).
 * ============================================================ */
const ANALYTICS_KEY = 'blooming-world-analytics-v1';
const ANALYTICS_CAP = 500;
let sessionLogged = false;
function analyticsRead() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x === 'object' && typeof x.e === 'string');
  } catch (e) { return []; }
}
function analyticsWrite(events) {
  try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-ANALYTICS_CAP))); }
  catch (e) { /* storage недоступен */ }
}
function logEvent(e, props) {
  try {
    const events = analyticsRead();
    const ev = Object.assign({ t: new Date().toISOString(), e: e }, props || {});
    events.push(ev);
    analyticsWrite(events);
  } catch (err) { /* noop */ }
}
function logSessionStart() {
  if (sessionLogged) return;
  sessionLogged = true;
  logEvent('session_start');
}
function analyticsCount() { return analyticsRead().length; }
function analyticsSummary() {
  const events = analyticsRead();
  const days = events.map((x) => String(x.t).slice(0, 10)).sort();
  return {
    total: events.length,
    sessions: events.filter((x) => x.e === 'session_start').length,
    wins: events.filter((x) => x.e === 'level_win').length,
    losses: events.filter((x) => x.e === 'level_lose').length,
    starts: events.filter((x) => x.e === 'level_start').length,
    firstDay: days[0] || null,
    lastDay: days[days.length - 1] || null,
  };
}
function exportEventsJson(extra) {
  try {
    const payload = Object.assign({
      game: 'Blooming World',
      exportedAt: new Date().toISOString(),
      summary: analyticsSummary(),
    }, extra || {}, { events: analyticsRead() });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blooming-world-stats-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) { return false; }
}

/* ---------------- Волна 5: платформы (Yandex Games SDK) ----------------
 * Абстракция площадки: веб (по умолчанию) или Yandex Games SDK v2
 * (LoadingAPI / GameplayAPI / лидерборды). Любая ошибка = тихий
 * фолбэк в веб. Загрузчик SDK инъекцируется для тестов.
 * ============================================================ */
const LEADERBOARD_ID = 'levels';
const SDK_TIMEOUT_MS = 4000;
/* Относительный путь — официальный способ: на хостинге Яндекса /sdk.js
 * всегда существует; на чужих хостах — мгновенный 404 → тихий фолбэк
 * в веб (CDN-заглушка вне фрейма Яндекса всё равно не даёт API). */
let SDK_CANDIDATES = ['/sdk.js'];
let sdkLoaderOverride = null;
let platformYsdk = null;
let platformInitPromise = null;
let gameplayActive = false;
let lastSubmittedLevel = 0;

function setSdkCandidates(list) { SDK_CANDIDATES = list.slice(); }
function setSdkLoader(loader) { sdkLoaderOverride = loader; }
function resetPlatformForTests() {
  platformInitPromise = null;
  platformYsdk = null;
  gameplayActive = false;
  lastSubmittedLevel = 0;
  sdkLoaderOverride = null;
  SDK_CANDIDATES = ['/sdk.js'];
}
function loadSdkScript(src) {
  if (sdkLoaderOverride) return sdkLoaderOverride(src);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error('sdk timeout: ' + src)); }
    }, SDK_TIMEOUT_MS);
    script.src = src;
    script.onload = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
    script.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error('sdk load error: ' + src)); } };
    document.head.appendChild(script);
  });
}
async function loadFirstAvailableSdk() {
  for (const src of SDK_CANDIDATES) {
    try {
      await loadSdkScript(src);
      if (window.YaGames) return window.YaGames;
    } catch (e) { /* следующий кандидат */ }
  }
  return null;
}
/* Инициализация площадки (идемпотентно, никогда не бросает). */
function initPlatform() {
  if (platformInitPromise) return platformInitPromise;
  platformInitPromise = (async () => {
    if (typeof window === 'undefined') return 'web';
    try {
      if (window.ysdk) platformYsdk = window.ysdk;
      else if (window.YaGames) platformYsdk = await window.YaGames.init();
      else {
        const ya = await loadFirstAvailableSdk();
        if (ya) platformYsdk = await ya.init();
      }
    } catch (e) { platformYsdk = null; }
    if (platformYsdk) {
      try { if (platformYsdk.features && platformYsdk.features.LoadingAPI) platformYsdk.features.LoadingAPI.ready(); } catch (e) {}
      return 'yandex';
    }
    return 'web';
  })();
  return platformInitPromise;
}
function currentPlatform() { return platformYsdk ? 'yandex' : 'web'; }
function platformGameplayStart() {
  if (!platformYsdk || gameplayActive) return;
  gameplayActive = true;
  try { if (platformYsdk.features && platformYsdk.features.GameplayAPI) platformYsdk.features.GameplayAPI.start(); } catch (e) {}
}
function platformGameplayStop() {
  if (!platformYsdk || !gameplayActive) return;
  gameplayActive = false;
  try { if (platformYsdk.features && platformYsdk.features.GameplayAPI) platformYsdk.features.GameplayAPI.stop(); } catch (e) {}
}
/* Лучший уровень в лидерборд площадки (сабмиты меньшего уровня отбрасываются локально). */
function submitScoreToLeaderboard(level) {
  if (!platformYsdk || !isFinite(level)) return;
  if (level <= lastSubmittedLevel) return;
  lastSubmittedLevel = level;
  try {
    if (platformYsdk.leaderboards && platformYsdk.leaderboards.setLeaderboardScore) {
      const res = platformYsdk.leaderboards.setLeaderboardScore(LEADERBOARD_ID, level);
      if (res && typeof res.catch === 'function') res.catch(() => {});
    }
  } catch (e) { /* noop */ }
}

/* ---------------- Волна 5: PWA (установка на домашний экран) ----------------
 * beforeinstallprompt перехватывается; кнопка в профиле — только когда
 * приглашение доступно и игра не запущена как установленная.
 * ============================================================ */
let pwaDeferredPrompt = null;
const pwaListeners = [];
function pwaEmit() { for (const fn of pwaListeners) fn(); }
function pwaInstallAvailable() { return pwaDeferredPrompt !== null; }
function pwaIsStandalone() {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}
function pwaSubscribe(fn) { pwaListeners.push(fn); return () => { const i = pwaListeners.indexOf(fn); if (i >= 0) pwaListeners.splice(i, 1); }; }
function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwaDeferredPrompt = e;
    pwaEmit();
  });
  window.addEventListener('appinstalled', () => {
    pwaDeferredPrompt = null;
    pwaEmit();
    logEvent('pwa_install');
  });
}
async function promptInstall() {
  if (!pwaDeferredPrompt) return false;
  const ev = pwaDeferredPrompt;
  pwaDeferredPrompt = null;
  pwaEmit();
  try {
    await ev.prompt();
    const choice = await ev.userChoice;
    logEvent('pwa_install_prompt', { outcome: choice.outcome });
    return choice.outcome === 'accepted';
  } catch (e) { return false; }
}

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
  /* premium 3D depth: light on top, shade on bottom (era-strength) */
  const bodyShadow = (st.gloss || st.gradient)
    ? 'inset 0 0.05em 0.1em rgba(255,255,255,.45), inset 0 -0.09em 0.16em rgba(0,0,0,.32)'
    : 'inset 0 0.04em 0.06em rgba(255,255,255,.24), inset 0 -0.05em 0.09em rgba(0,0,0,.2)';

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
    'box-shadow:' + bodyShadow + ';' +
    (st.glass ? 'backdrop-filter:blur(2px);opacity:.9;' : '') +
    (fillFilters.length ? 'filter:' + fillFilters.join(', ') + ';' : '') + '">';
  if (st.pattern === 'pixel') inner += '<div class="bm-pixel-pattern"></div>';
  if (st.pattern === 'rays') inner += '<div style="position:absolute;inset:0;background:repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 8deg, transparent 8deg 16deg)"></div>';
  if (st.gloss) inner += '<div style="position:absolute;left:10%;right:10%;top:6%;height:38%;background:linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.06))"></div>';
  if (st.gloss) inner += '<div style="position:absolute;left:16%;top:12%;width:16%;height:11%;border-radius:50%;background:rgba(255,255,255,.9);filter:blur(1px)"></div>';
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
function buildBackground(bg, seed, asRoot, eraId) {
  const layer = el('div', 'bg-layer' + (asRoot ? ' as-root' : ''));
  const rng = mulberry32Public((seed || 1) * 7919 + 13);
  const rand = (min, max) => min + rng() * (max - min);

  const sky = el('div');
  sky.style.cssText = 'position:absolute;inset:0;background:' + bg.sky;
  layer.appendChild(sky);

  // authored era photo scene (Волна 1)
  if (typeof ERA_IMGS !== 'undefined' && ERA_IMGS[eraId]) {
    const photo = el('div', 'bg-photo');
    photo.style.backgroundImage = 'url(' + ERA_IMGS[eraId] + ')';
    layer.appendChild(photo);
  }

  // readability: vignette + HUD scrims
  layer.appendChild(el('div', 'bg-vignette'));
  layer.appendChild(el('div', 'bg-scrim-top'));
  layer.appendChild(el('div', 'bg-scrim-bottom'));

  if (bg.dark) {
    // moon + stars instead of sun
    layer.appendChild(el('div', 'bg-moon'));
  } else if (bg.sun) {
    if (bg.rays) layer.appendChild(el('div', 'bg-rays'));
    layer.appendChild(el('div', 'bg-sun'));
  }
  if (bg.stars) {
    for (let i = 0; i < 30; i++) {
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
    if (bg.dark) c.style.opacity = '0.2';
    layer.appendChild(c);
  }
  const FLW = ['#ff8ab0', '#ffd166', '#c084fc', '#7dd3fc', '#fda4af', '#fef08a'];
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
