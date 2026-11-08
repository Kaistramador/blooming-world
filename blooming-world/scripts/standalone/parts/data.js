/* ============================================================
 * Blooming World — data layer (port of i18n.ts, shapes.ts,
 * themes.ts, shop.ts, levels.ts, leaderboard.ts)
 * ============================================================ */

/* ---------------- i18n ---------------- */
const I18N_RU = {
  'app.title': 'Цветущий мир',
  'app.subtitle': 'Три-в-ряд: эволюция сада',
  'nav.map': 'Карта', 'nav.shop': 'Магазин', 'nav.ranks': 'Рейтинг', 'nav.profile': 'Профиль',
  'map.play': 'Играть', 'map.continue': 'Продолжить', 'map.level': 'Уровень',
  'map.chapter': 'Глава', 'map.locked': 'Закрыто', 'map.bloomed': 'Расцвело!',
  'map.nextChapter': 'Следующая глава через {n} ур.',
  'map.comingSoon': 'В планах: 10 000 уровней. Сейчас — первые 100!',
  'game.moves': 'Ходы', 'game.score': 'Очки', 'game.goal': 'Цель',
  'game.tapHint': 'Тапай группы из 2+ камней',
  'game.swapHint': 'Меняй камни местами: собирай 3+ в ряд',
  'game.bossLevel': 'ВЗРЫВНОЙ УРОВЕНЬ',
  'game.win': 'Победа!', 'game.lose': 'Ходы закончились',
  'game.next': 'Следующий уровень', 'game.retry': 'Ещё раз', 'game.exit': 'На карту',
  'game.cascade': 'Комбо x{n}!',
  'game.combo2': 'Здорово!', 'game.combo3': 'Великолепно!', 'game.combo4': 'Изумительно!', 'game.combo5': 'Невероятно!',
  'game.shuffled': 'Ходов больше нет — поле перемешано',
  'game.plus5': '+5 ходов', 'game.buyAndUse': 'Купить и применить', 'game.use': 'Применить',
  'game.boosters': 'Бусты', 'game.selectTarget': 'Выбери цель на поле', 'game.cancel': 'Отмена',
  'game.starReward': 'Награда', 'game.newStars': 'Новый рекорд звёзд!', 'game.firstWin': 'Первое прохождение!',
  'game.stoneGoal': 'Разбей камни', 'game.itemGoal': 'Собери бутоны',
  'game.collectGoal': 'Собери камни', 'game.scoreGoal': 'Набери очки',
  'streak.title': 'Серия побед', 'streak.next': 'До ×{m} — ещё {n}',
  'streak.max': 'Максимальный множитель!', 'streak.lost': 'Серия побед сброшена',
  'nav.garden': 'Сад',
  'garden.title': 'Сад', 'garden.subtitle': 'Восстанови сад за звёзды',
  'garden.lockedTitle': 'Сад пока спит', 'garden.lockedHint': 'Пройди главу 1 — и сад начнёт расцветать',
  'garden.zone0': 'У входа', 'garden.zone1': 'Сад', 'garden.zone2': 'Парк',
  'garden.zoneLocked': 'Откроется после главы {n}',
  'garden.restore': 'Восстановить · ⭐{n}', 'garden.restoredCount': '{n} из {m} восстановлено',
  'garden.bloom': 'Расцвет', 'garden.done': 'Сад полностью расцвёл!',
  'garden.needStars': 'Не хватает звёзд', 'garden.coinsBack': 'Награда: 🪙 +{n}',
  'garden.confirmTitle': 'Восстановить «{name}»?', 'garden.cancel': 'Позже',
  'piggy.title': 'Копилка', 'piggy.full': 'Копилка полна!', 'piggy.open': 'Открыть копилку',
  'piggy.collect': 'Забрать 🪙 {n}', 'piggy.progress': 'Побед до вскрытия: {n}',
  'piggy.deposit': '🐷 +{n} в копилку ({w}/{m})', 'piggy.ready': 'Копилка готова к вскрытию!',
  'piggy.hint': 'Каждая победа кладёт монеты в копилку',
  'shop.title': 'Магазин', 'shop.coins': 'Монеты',
  'shop.tab.boosters': 'Бусты', 'shop.tab.bank': 'Банк', 'shop.tab.skins': 'Скины',
  'shop.tab.avatars': 'Аватары', 'shop.tab.frames': 'Рамки', 'shop.tab.names': 'Имя', 'shop.tab.effects': 'Эффекты',
  'shop.buy': 'Купить', 'shop.equip': 'Надеть', 'shop.equipped': 'Надето', 'shop.owned': 'Куплено',
  'shop.notEnough': 'Недостаточно монет', 'shop.purchased': 'Покупка совершена!',
  'shop.demoNote': 'Демо-режим: оплата симулируется, монеты зачисляются бесплатно',
  'shop.simulatePay': 'Пополнить (демо)',
  'shop.effectTile': 'Эффекты камней', 'shop.effectAvatar': 'Эффекты аватара', 'shop.effectName': 'Эффекты имени',
  'shop.free': 'Бесплатно',
  'ranks.title': 'Глобальный рейтинг', 'ranks.players': 'игроков', 'ranks.youAre': 'Вы на месте',
  'ranks.level': 'Ур.', 'ranks.stars': 'Звёзды', 'ranks.you': 'ВЫ', 'ranks.search': 'Поиск игрока...', 'ranks.top3': 'Лидеры',
  'profile.title': 'Профиль', 'profile.name': 'Имя игрока', 'profile.namePlaceholder': 'Введите имя',
  'profile.save': 'Сохранить', 'profile.saved': 'Сохранено!', 'profile.stats': 'Статистика',
  'profile.stat.wins': 'Побед', 'profile.stat.levels': 'Уровней пройдено', 'profile.stat.stars': 'Звёзд собрано',
  'profile.stat.bestCascade': 'Лучшее комбо', 'profile.stat.totalScore': 'Всего очков', 'profile.stat.moves': 'Ходов сделано',
  'profile.stat.streak': 'Лучшая серия',
  'profile.analytics': 'Аналитика', 'profile.analyticsInfo': '{n} событий · сессий: {s}',
  'profile.export': 'Выгрузить статистику (JSON)', 'profile.exportDone': 'Файл выгружен!',
  'profile.equipped': 'Экипировка',
  'settings.title': 'Настройки', 'settings.language': 'Язык', 'settings.sound': 'Звук',
  'settings.on': 'Вкл', 'settings.off': 'Выкл',
  'settings.reset': 'Сбросить прогресс',
  'settings.resetConfirm': 'Точно сбросить весь прогресс? Это действие необратимо.',
  'settings.resetYes': 'Да, сбросить', 'settings.resetNo': 'Отмена', 'settings.resetDone': 'Прогресс сброшен',
  'common.coins': 'монет', 'common.close': 'Закрыть', 'common.ok': 'ОК', 'common.loading': 'Загрузка...',
  'goal.stone': 'Камни', 'goal.item': 'Бутоны', 'goal.moves': 'Ходы',
  'era.unlock': 'Глава {n}: {name} — {tag}',
};
const I18N_EN = {
  'app.title': 'Blooming World',
  'app.subtitle': 'Match-3: garden evolution',
  'nav.map': 'Map', 'nav.shop': 'Shop', 'nav.ranks': 'Ranks', 'nav.profile': 'Profile',
  'map.play': 'Play', 'map.continue': 'Continue', 'map.level': 'Level',
  'map.chapter': 'Chapter', 'map.locked': 'Locked', 'map.bloomed': 'Bloomed!',
  'map.nextChapter': 'Next chapter in {n} lv.',
  'map.comingSoon': 'Planned: 10,000 levels. Now the first 100!',
  'game.moves': 'Moves', 'game.score': 'Score', 'game.goal': 'Goal',
  'game.tapHint': 'Tap groups of 2+ gems',
  'game.swapHint': 'Swap gems: match 3+ in a row',
  'game.bossLevel': 'BLAST LEVEL',
  'game.win': 'Victory!', 'game.lose': 'Out of moves',
  'game.next': 'Next level', 'game.retry': 'Retry', 'game.exit': 'Map',
  'game.cascade': 'Combo x{n}!',
  'game.combo2': 'Great!', 'game.combo3': 'Superb!', 'game.combo4': 'Amazing!', 'game.combo5': 'Incredible!',
  'game.shuffled': 'No moves left — board shuffled',
  'game.plus5': '+5 moves', 'game.buyAndUse': 'Buy & use', 'game.use': 'Use',
  'game.boosters': 'Boosters', 'game.selectTarget': 'Pick a target on the board', 'game.cancel': 'Cancel',
  'game.starReward': 'Reward', 'game.newStars': 'New star record!', 'game.firstWin': 'First clear!',
  'game.stoneGoal': 'Break the stones', 'game.itemGoal': 'Collect the buds',
  'game.collectGoal': 'Collect gems', 'game.scoreGoal': 'Score points',
  'streak.title': 'Win streak', 'streak.next': '{n} more to ×{m}',
  'streak.max': 'Maximum multiplier!', 'streak.lost': 'Win streak reset',
  'nav.garden': 'Garden',
  'garden.title': 'Garden', 'garden.subtitle': 'Restore the garden with stars',
  'garden.lockedTitle': 'The garden is still asleep', 'garden.lockedHint': 'Clear chapter 1 — and the garden will start to bloom',
  'garden.zone0': 'Entrance', 'garden.zone1': 'Garden', 'garden.zone2': 'Park',
  'garden.zoneLocked': 'Opens after chapter {n}',
  'garden.restore': 'Restore · ⭐{n}', 'garden.restoredCount': '{n} of {m} restored',
  'garden.bloom': 'Bloom', 'garden.done': 'The garden is in full bloom!',
  'garden.needStars': 'Not enough stars', 'garden.coinsBack': 'Reward: 🪙 +{n}',
  'garden.confirmTitle': 'Restore “{name}”?', 'garden.cancel': 'Later',
  'piggy.title': 'Piggy bank', 'piggy.full': 'Piggy bank is full!', 'piggy.open': 'Open piggy bank',
  'piggy.collect': 'Collect 🪙 {n}', 'piggy.progress': 'Wins until opening: {n}',
  'piggy.deposit': '🐷 +{n} to the piggy bank ({w}/{m})', 'piggy.ready': 'Piggy bank is ready to open!',
  'piggy.hint': 'Every win drops coins into the piggy bank',
  'shop.title': 'Shop', 'shop.coins': 'Coins',
  'shop.tab.boosters': 'Boosters', 'shop.tab.bank': 'Bank', 'shop.tab.skins': 'Skins',
  'shop.tab.avatars': 'Avatars', 'shop.tab.frames': 'Frames', 'shop.tab.names': 'Name', 'shop.tab.effects': 'Effects',
  'shop.buy': 'Buy', 'shop.equip': 'Equip', 'shop.equipped': 'Equipped', 'shop.owned': 'Owned',
  'shop.notEnough': 'Not enough coins', 'shop.purchased': 'Purchase complete!',
  'shop.demoNote': 'Demo mode: payment is simulated, coins are added for free',
  'shop.simulatePay': 'Top up (demo)',
  'shop.effectTile': 'Gem effects', 'shop.effectAvatar': 'Avatar effects', 'shop.effectName': 'Name effects',
  'shop.free': 'Free',
  'ranks.title': 'Global leaderboard', 'ranks.players': 'players', 'ranks.youAre': 'You are #',
  'ranks.level': 'Lv', 'ranks.stars': 'Stars', 'ranks.you': 'YOU', 'ranks.search': 'Search player...', 'ranks.top3': 'Top players',
  'profile.title': 'Profile', 'profile.name': 'Player name', 'profile.namePlaceholder': 'Enter name',
  'profile.save': 'Save', 'profile.saved': 'Saved!', 'profile.stats': 'Statistics',
  'profile.stat.wins': 'Wins', 'profile.stat.levels': 'Levels cleared', 'profile.stat.stars': 'Stars earned',
  'profile.stat.bestCascade': 'Best combo', 'profile.stat.totalScore': 'Total score', 'profile.stat.moves': 'Moves made',
  'profile.stat.streak': 'Best streak',
  'profile.analytics': 'Analytics', 'profile.analyticsInfo': '{n} events · sessions: {s}',
  'profile.export': 'Export statistics (JSON)', 'profile.exportDone': 'File exported!',
  'profile.equipped': 'Equipment',
  'settings.title': 'Settings', 'settings.language': 'Language', 'settings.sound': 'Sound',
  'settings.on': 'On', 'settings.off': 'Off',
  'settings.reset': 'Reset progress',
  'settings.resetConfirm': 'Really reset all progress? This cannot be undone.',
  'settings.resetYes': 'Yes, reset', 'settings.resetNo': 'Cancel', 'settings.resetDone': 'Progress reset',
  'common.coins': 'coins', 'common.close': 'Close', 'common.ok': 'OK', 'common.loading': 'Loading...',
  'goal.stone': 'Stones', 'goal.item': 'Buds', 'goal.moves': 'Moves',
  'era.unlock': 'Chapter {n}: {name} — {tag}',
};
const DICTS = { ru: I18N_RU, en: I18N_EN };
function translate(lang, key, vars) {
  let s = (DICTS[lang] && DICTS[lang][key]) || DICTS.en[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', String(v));
  return s;
}

/* ---------------- shapes (colorblind-safe silhouettes) ---------------- */
const GEM_SHAPE_CLIP = [
  'polygon(50% 2%, 97% 91%, 3% 91%)',
  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)',
  null,
  'polygon(15% 15%, 85% 15%, 85% 85%, 15% 85%)',
  'polygon(50% 0%, 63% 34%, 98% 35%, 71% 57%, 82% 91%, 50% 71%, 18% 91%, 29% 57%, 2% 35%, 37% 34%)',
];
function gemShapeCss(color) {
  const i = Math.max(0, Math.min(GEM_SHAPE_CLIP.length - 1, color));
  const clip = GEM_SHAPE_CLIP[i];
  return clip ? { clipPath: clip, borderRadius: '4%' } : { borderRadius: '50%' };
}

/* ---------------- themes: colorblind-safe palette engine ---------------- */
function hexToHsl(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255, g = parseInt(n.slice(2, 4), 16) / 255, b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToHex(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(94, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh * 6) % 2) - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if (hh < 1 / 6) { r = c; g = x; }
  else if (hh < 2 / 6) { r = x; g = c; }
  else if (hh < 3 / 6) { g = c; b = x; }
  else if (hh < 4 / 6) { g = x; b = c; }
  else if (hh < 5 / 6) { r = x; b = c; }
  else { r = c; }
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}
function tint(hex, sMul, lAdd) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s * sMul, l + lAdd);
}
const ANCHORS = ['#c74134', '#f6e04b', '#2ea56d', '#3d9be0', '#b06fc9', '#ef8f2a'];
function eraPal(sMul, lAdd, darkL) {
  return {
    p: ANCHORS.map((c) => tint(c, sMul, lAdd)),
    d: ANCHORS.map((c) => tint(c, sMul * 0.92, lAdd + darkL)),
  };
}
const PAL = [
  eraPal(0.55, -3, -14), eraPal(0.72, 2, -16), eraPal(0.88, 1, -18), eraPal(1.0, 2, -18),
  eraPal(0.92, 7, -14), eraPal(0.9, 8, -12), eraPal(1.18, 6, -10), eraPal(0.82, 10, -16),
  eraPal(0.98, 8, -14), eraPal(1.04, 10, -14),
];
const CHAPTERS = [
  { id: 0, name: { ru: 'Пустошь', en: 'The Barrens' }, tagline: { ru: 'Всё начинается с простых камней', en: 'It all starts with simple stones' },
    palette: PAL[0].p, paletteDark: PAL[0].d, uiAccent: '#8a7a68',
    tile: { rim: 'rgba(40,34,28,.55)', rimWidth: 0.05, flat: true, gradient: false, gloss: false, pixelShadow: false, softShadow: false, glow: false, glass: false, shine: false, wobble: false, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#9b978e 0%,#b5b0a6 60%,#8d8779 100%)', ground: 'linear-gradient(180deg,#8d8271 0%,#6e6657 100%)', hillFar: '#a19a8c', hillNear: '#847c6c', dark: false, clouds: 0, sun: false, stars: false, trees: 0, bushes: 0, flowers: 0, butterflies: 0, petals: 0, fireflies: 0, sparkles: 0, rays: false } },
  { id: 1, name: { ru: 'Первые ростки', en: 'First Sprouts' }, tagline: { ru: 'Пиксельная жизнь пробивается сквозь камень', en: 'Pixel life breaks through the stone' },
    palette: PAL[1].p, paletteDark: PAL[1].d, uiAccent: '#7ac96a',
    tile: { rim: 'rgba(30,26,20,.5)', rimWidth: 0.045, flat: true, gradient: false, gloss: false, pixelShadow: true, softShadow: false, glow: false, glass: false, shine: false, wobble: false, pattern: 'pixel' },
    bg: { sky: 'linear-gradient(180deg,#8fb8c9 0%,#b5d6c9 60%,#8fb894 100%)', ground: 'linear-gradient(180deg,#7aa86a 0%,#568a4c 100%)', hillFar: '#9bc98e', hillNear: '#6fae62', dark: false, clouds: 1, sun: false, stars: false, trees: 1, bushes: 0, flowers: 1, butterflies: 0, petals: 0, fireflies: 0, sparkles: 0, rays: false } },
  { id: 2, name: { ru: 'Зелёный берег', en: 'Green Shore' }, tagline: { ru: '16 цветов вместо четырёх', en: 'Sixteen colors instead of four' },
    palette: PAL[2].p, paletteDark: PAL[2].d, uiAccent: '#3d9be0',
    tile: { rim: 'rgba(28,32,40,.45)', rimWidth: 0.04, flat: false, gradient: true, gloss: false, pixelShadow: true, softShadow: false, glow: false, glass: false, shine: false, wobble: false, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#7ec3e8 0%,#a8dff0 55%,#cfe8c9 100%)', ground: 'linear-gradient(180deg,#7ab86a 0%,#4c8a44 100%)', hillFar: '#93cc85', hillNear: '#63a855', dark: false, clouds: 2, sun: true, stars: false, trees: 2, bushes: 1, flowers: 3, butterflies: 0, petals: 0, fireflies: 0, sparkles: 0, rays: false } },
  { id: 3, name: { ru: 'Роща', en: 'The Grove' }, tagline: { ru: 'Глянец и глубина', en: 'Gloss and depth' },
    palette: PAL[3].p, paletteDark: PAL[3].d, uiAccent: '#ef8f2a',
    tile: { rim: 'rgba(30,26,40,.4)', rimWidth: 0.035, flat: false, gradient: true, gloss: true, pixelShadow: false, softShadow: true, glow: false, glass: false, shine: false, wobble: false, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#6fc0f0 0%,#9fd8f5 50%,#d4ecc0 100%)', ground: 'linear-gradient(180deg,#82c46e 0%,#4c9440 100%)', hillFar: '#9cd48a', hillNear: '#68b458', dark: false, clouds: 2, sun: true, stars: false, trees: 3, bushes: 2, flowers: 5, butterflies: 1, petals: 0, fireflies: 0, sparkles: 0, rays: false } },
  { id: 4, name: { ru: 'Луг цветов', en: 'Flower Meadow' }, tagline: { ru: 'Флэт, чистота и свет', en: 'Flat, clean and light' },
    palette: PAL[4].p, paletteDark: PAL[4].d, uiAccent: '#2ea56d',
    tile: { rim: 'rgba(30,26,40,.35)', rimWidth: 0.03, flat: true, gradient: false, gloss: false, pixelShadow: false, softShadow: true, glow: false, glass: false, shine: false, wobble: true, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#87d0f5 0%,#bce6fa 50%,#dff2cf 100%)', ground: 'linear-gradient(180deg,#8cc978 0%,#57a04a 100%)', hillFar: '#a5dc92', hillNear: '#74bc62', dark: false, clouds: 3, sun: true, stars: false, trees: 3, bushes: 3, flowers: 8, butterflies: 1, petals: 2, fireflies: 0, sparkles: 2, rays: false } },
  { id: 5, name: { ru: 'Светлый лес', en: 'Bright Forest' }, tagline: { ru: 'Мягкие граденты оживают', en: 'Soft gradients come alive' },
    palette: PAL[5].p, paletteDark: PAL[5].d, uiAccent: '#3d9be0',
    tile: { rim: 'rgba(30,26,40,.35)', rimWidth: 0.03, flat: false, gradient: true, gloss: false, pixelShadow: false, softShadow: true, glow: false, glass: false, shine: false, wobble: true, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#9adcf8 0%,#c8ecfa 45%,#e8f6d8 100%)', ground: 'linear-gradient(180deg,#95d482 0%,#5ea84e 100%)', hillFar: '#b0e09c', hillNear: '#80c86c', dark: false, clouds: 3, sun: true, stars: false, trees: 4, bushes: 4, flowers: 10, butterflies: 2, petals: 3, fireflies: 0, sparkles: 3, rays: false } },
  { id: 6, name: { ru: 'Волшебный сад', en: 'Enchanted Garden' }, tagline: { ru: 'Неон зажигает сад', en: 'Neon lights up the garden' },
    palette: PAL[6].p, paletteDark: PAL[6].d, uiAccent: '#22e0ff',
    tile: { rim: 'rgba(235,240,255,.7)', rimWidth: 0.035, flat: false, gradient: true, gloss: false, pixelShadow: false, softShadow: false, glow: true, glass: false, shine: false, wobble: true, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#1a1030 0%,#31195c 55%,#183248 100%)', ground: 'linear-gradient(180deg,#1e4a3a 0%,#12332a 100%)', hillFar: '#24405c', hillNear: '#1a2f46', dark: true, clouds: 0, sun: false, stars: true, trees: 3, bushes: 2, flowers: 6, butterflies: 0, petals: 0, fireflies: 5, sparkles: 5, rays: false } },
  { id: 7, name: { ru: 'Сумеречные поляны', en: 'Twilight Glades' }, tagline: { ru: 'Сад становится стеклянным', en: 'The garden turns to glass' },
    palette: PAL[7].p, paletteDark: PAL[7].d, uiAccent: '#3d9be0',
    tile: { rim: 'rgba(240,244,255,.6)', rimWidth: 0.04, flat: false, gradient: true, gloss: true, pixelShadow: false, softShadow: true, glow: false, glass: true, shine: false, wobble: true, pattern: 'none' },
    bg: { sky: 'linear-gradient(180deg,#3a2a6a 0%,#8a5aa8 45%,#e88a5a 100%)', ground: 'linear-gradient(180deg,#5a7a4a 0%,#3a5232 100%)', hillFar: '#7a5a98', hillNear: '#553f70', dark: true, clouds: 1, sun: false, stars: true, trees: 4, bushes: 3, flowers: 9, butterflies: 1, petals: 4, fireflies: 3, sparkles: 4, rays: false } },
  { id: 8, name: { ru: 'Радужная долина', en: 'Rainbow Valley' }, tagline: { ru: 'Мир наполняется жизнью', en: 'The world fills with life' },
    palette: PAL[8].p, paletteDark: PAL[8].d, uiAccent: '#ef8f2a',
    tile: { rim: 'rgba(110,70,24,.4)', rimWidth: 0.03, flat: false, gradient: true, gloss: true, pixelShadow: false, softShadow: true, glow: false, glass: false, shine: true, wobble: true, pattern: 'rays' },
    bg: { sky: 'linear-gradient(180deg,#8ad4ff 0%,#c0e8ff 40%,#ffe0b0 100%)', ground: 'linear-gradient(180deg,#9ade84 0%,#64b452 100%)', hillFar: '#b5e8a0', hillNear: '#88cc70', dark: false, clouds: 4, sun: true, stars: false, trees: 5, bushes: 5, flowers: 12, butterflies: 2, petals: 6, fireflies: 0, sparkles: 6, rays: true } },
  { id: 9, name: { ru: 'Золотой сад', en: 'Golden Garden' }, tagline: { ru: 'Вершина расцвета', en: 'The peak of bloom' },
    palette: PAL[9].p, paletteDark: PAL[9].d, uiAccent: '#f6e04b',
    tile: { rim: 'rgba(110,70,24,.45)', rimWidth: 0.035, flat: false, gradient: true, gloss: true, pixelShadow: false, softShadow: true, glow: true, glass: false, shine: true, wobble: true, pattern: 'rays' },
    bg: { sky: 'linear-gradient(180deg,#ffca7a 0%,#ffb0c8 45%,#ffe9c0 100%)', ground: 'linear-gradient(180deg,#a8e890 0%,#70c05c 100%)', hillFar: '#c8f0b0', hillNear: '#98d880', dark: false, clouds: 4, sun: true, stars: false, trees: 5, bushes: 5, flowers: 14, butterflies: 3, petals: 8, fireflies: 0, sparkles: 8, rays: true } },
];
function chapterTheme(chapter) {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, chapter))];
}

/* ---------------- shop catalog ---------------- */
const BOOSTERS = [
  { id: 'hammer', icon: '🔨', price: 40, name: { ru: 'Молоток', en: 'Hammer' }, desc: { ru: 'Убрать один камень с поля', en: 'Remove a single gem' } },
  { id: 'bomb', icon: '💣', price: 60, name: { ru: 'Бомба', en: 'Bomb' }, desc: { ru: 'Взрыв 3×3 в выбранной точке', en: 'Blast a 3×3 area' } },
  { id: 'cross', icon: '⚡', price: 80, name: { ru: 'Молния', en: 'Lightning' }, desc: { ru: 'Очистить ряд и столбец крестом', en: 'Clear a row and column' } },
  { id: 'shuffle', icon: '🔀', price: 50, name: { ru: 'Перемешать', en: 'Shuffle' }, desc: { ru: 'Перемешать все камни на поле', en: 'Reshuffle all gems' } },
  { id: 'undo', icon: '↩️', price: 30, name: { ru: 'Отмена хода', en: 'Undo' }, desc: { ru: 'Отменить последний своп', en: 'Undo your last swap' } },
  { id: 'moves5', icon: '➕5', price: 100, name: { ru: '+5 ходов', en: '+5 Moves' }, desc: { ru: 'Дополнительные 5 ходов в уровне', en: 'Five extra moves in a level' } },
];
const BOOSTER_MAP = Object.fromEntries(BOOSTERS.map((b) => [b.id, b]));
const COIN_PACKS = [
  { id: 'p1', coins: 500, priceLabel: '$0.99' },
  { id: 'p2', coins: 1200, priceLabel: '$1.99', bonus: '+10%' },
  { id: 'p3', coins: 3500, priceLabel: '$4.99', bonus: '+25%' },
  { id: 'p4', coins: 8000, priceLabel: '$9.99', bonus: '+40%' },
  { id: 'p5', coins: 20000, priceLabel: '$19.99', bonus: '+60%' },
];
const GEM_SKINS = [
  { id: 'classic', name: { ru: 'Классика', en: 'Classic' }, price: 0 },
  { id: 'stones', name: { ru: 'Камни', en: 'Stones' }, price: 0, ring: true },
  { id: 'fruits', name: { ru: 'Фрукты', en: 'Fruits' }, price: 300, glyphs: ['🍓', '🍋', '🍏', '🫐', '🍇', '🍊'] },
  { id: 'sweets', name: { ru: 'Сладости', en: 'Sweets' }, price: 400, glyphs: ['🍬', '🍭', '🍩', '🧊', '🧁', '🍫'] },
  { id: 'flowers', name: { ru: 'Цветы', en: 'Flowers' }, price: 500, glyphs: ['🌹', '🌻', '🍀', '🪻', '🌸', '🌷'] },
  { id: 'planets', name: { ru: 'Планеты', en: 'Planets' }, price: 600, glyphs: ['🔴', '🪐', '🌍', '🌑', '💫', '⭐'] },
  { id: 'runes', name: { ru: 'Руны', en: 'Runes' }, price: 700, glyphs: ['🔥', '⚡', '🌿', '🌊', '🔮', '☀️'] },
  { id: 'ocean', name: { ru: 'Океан', en: 'Ocean' }, price: 800, glyphs: ['🐠', '🐟', '🐙', '🦐', '🐡', '🦑'] },
  { id: 'animals', name: { ru: 'Зверята', en: 'Critters' }, price: 900, glyphs: ['🐭', '🐤', '🐸', '🦋', '🐹', '🦊'] },
  { id: 'cosmos', name: { ru: 'Космос', en: 'Cosmos' }, price: 1200, glyphs: ['🚀', '🛸', '☄️', '🌌', '🔭', '👾'] },
];
const AVATARS = [
  { id: 'av-seed', emoji: '🌱', bg: 'linear-gradient(135deg,#b8e0a0,#7ac96a)', price: 0 },
  { id: 'av-flower', emoji: '🌼', bg: 'linear-gradient(135deg,#ffe9a0,#ffd166)', price: 0 },
  { id: 'av-cat', emoji: '🐱', bg: 'linear-gradient(135deg,#ffd8b0,#ffb35e)', price: 50 },
  { id: 'av-fox', emoji: '🦊', bg: 'linear-gradient(135deg,#ffc8a0,#ff8a2a)', price: 50 },
  { id: 'av-panda', emoji: '🐼', bg: 'linear-gradient(135deg,#e8e8e8,#a8a8b8)', price: 50 },
  { id: 'av-frog', emoji: '🐸', bg: 'linear-gradient(135deg,#c0f0a8,#4fd05c)', price: 80 },
  { id: 'av-owl', emoji: '🦉', bg: 'linear-gradient(135deg,#d8c8a8,#9a7a5a)', price: 80 },
  { id: 'av-bee', emoji: '🐝', bg: 'linear-gradient(135deg,#ffe66a,#ffb300)', price: 80 },
  { id: 'av-butterfly', emoji: '🦋', bg: 'linear-gradient(135deg,#c8e0ff,#5ac8ff)', price: 120 },
  { id: 'av-ladybug', emoji: '🐞', bg: 'linear-gradient(135deg,#ffc0c0,#ff5a5a)', price: 120 },
  { id: 'av-unicorn', emoji: '🦄', bg: 'linear-gradient(135deg,#ffd0f0,#c084ff)', price: 200 },
  { id: 'av-dragon', emoji: '🐲', bg: 'linear-gradient(135deg,#c0f0d0,#2fd0c6)', price: 200 },
  { id: 'av-mushroom', emoji: '🍄', bg: 'linear-gradient(135deg,#ffc8c8,#e04470)', price: 150 },
  { id: 'av-sun', emoji: '☀️', bg: 'linear-gradient(135deg,#fff0b0,#ffb300)', price: 150 },
  { id: 'av-moon', emoji: '🌙', bg: 'linear-gradient(135deg,#d0d8ff,#8a9ad6)', price: 150 },
  { id: 'av-star', emoji: '⭐', bg: 'linear-gradient(135deg,#fff8c0,#ffd21f)', price: 150 },
  { id: 'av-gem', emoji: '💎', bg: 'linear-gradient(135deg,#c8f0ff,#5ac8ff)', price: 250 },
  { id: 'av-fire', emoji: '🔥', bg: 'linear-gradient(135deg,#ffd0a0,#ff5a1f)', price: 250 },
  { id: 'av-rocket', emoji: '🚀', bg: 'linear-gradient(135deg,#d0e0ff,#7e2fc2)', price: 300 },
  { id: 'av-robot', emoji: '🤖', bg: 'linear-gradient(135deg,#d8e8e8,#6aa8a4)', price: 300 },
  { id: 'av-queen', emoji: '👑', bg: 'linear-gradient(135deg,#fff0a0,#e0a81f)', price: 400 },
  { id: 'av-mage', emoji: '🧙', bg: 'linear-gradient(135deg,#d8c0ff,#7426a8)', price: 400 },
  { id: 'av-phoenix', emoji: '🦅', bg: 'linear-gradient(135deg,#ffd8a0,#ff7a1f)', price: 500 },
  { id: 'av-rainbow', emoji: '🌈', bg: 'linear-gradient(135deg,#ff9ab8,#ffd83d,#6bff8f,#6be5ff,#d18bff)', price: 600 },
];
const FRAMES = [
  { id: 'fr-none', name: { ru: 'Без рамки', en: 'None' }, price: 0, css: 'none' },
  { id: 'fr-wood', name: { ru: 'Дерево', en: 'Wood' }, price: 60, css: '0 0 0 3px #8a5f40, 0 2px 6px rgba(0,0,0,.3)' },
  { id: 'fr-leaf', name: { ru: 'Листья', en: 'Leaves' }, price: 100, css: '0 0 0 3px #4fd05c, 0 0 8px rgba(79,208,92,.5)' },
  { id: 'fr-sun', name: { ru: 'Солнце', en: 'Sun' }, price: 120, css: '0 0 0 3px #ffb300, 0 0 12px rgba(255,179,0,.6)' },
  { id: 'fr-ice', name: { ru: 'Лёд', en: 'Ice' }, price: 150, css: '0 0 0 3px #6be5ff, 0 0 10px rgba(107,229,255,.6)' },
  { id: 'fr-rose', name: { ru: 'Роза', en: 'Rose' }, price: 180, css: '0 0 0 3px #ff7799, 0 0 10px rgba(255,119,153,.6)' },
  { id: 'fr-gold', name: { ru: 'Золото', en: 'Gold' }, price: 300, css: '0 0 0 4px #ffd83d, 0 0 14px rgba(255,216,61,.7)' },
  { id: 'fr-emerald', name: { ru: 'Изумруд', en: 'Emerald' }, price: 300, css: '0 0 0 4px #6bff8f, 0 0 14px rgba(107,255,143,.7)' },
  { id: 'fr-amethyst', name: { ru: 'Аметист', en: 'Amethyst' }, price: 350, css: '0 0 0 4px #d18bff, 0 0 14px rgba(209,139,255,.7)' },
  { id: 'fr-royal', name: { ru: 'Королевский', en: 'Royal' }, price: 500, css: '0 0 0 4px #fff, 0 0 0 7px #ffd83d, 0 0 18px rgba(255,216,61,.8)' },
  { id: 'fr-neon', name: { ru: 'Неон', en: 'Neon' }, price: 500, css: '0 0 0 3px #22e0ff, 0 0 18px #22e0ff, 0 0 30px rgba(34,224,255,.5)' },
  { id: 'fr-rainbow', name: { ru: 'Радуга', en: 'Rainbow' }, price: 800, css: '0 0 0 4px transparent, 0 0 16px #ff9ab8, 0 0 24px #ffd83d, 0 0 32px #6bff8f' },
];
const NAME_STYLES = [
  { id: 'ns-basic', name: { ru: 'Обычный', en: 'Basic' }, price: 0, css: 'color:#ffffff;font-weight:700' },
  { id: 'ns-fire', name: { ru: 'Огонь', en: 'Fire' }, price: 100, css: 'color:#ff7a1f;font-weight:900;text-shadow:0 0 8px rgba(255,122,31,.8)' },
  { id: 'ns-ice', name: { ru: 'Лёд', en: 'Ice' }, price: 100, css: 'color:#9be8ff;font-weight:700;text-shadow:0 1px 0 #2a9ad6,0 0 8px rgba(107,229,255,.6)' },
  { id: 'ns-gold', name: { ru: 'Золото', en: 'Gold' }, price: 200, css: 'color:#ffd83d;font-weight:900;text-shadow:0 1px 0 #a68a00,0 0 10px rgba(255,216,61,.7)' },
  { id: 'ns-emerald', name: { ru: 'Изумруд', en: 'Emerald' }, price: 150, css: 'color:#8fffa8;font-weight:800;text-shadow:0 0 8px rgba(107,255,143,.6)' },
  { id: 'ns-rose', name: { ru: 'Роза', en: 'Rose' }, price: 150, css: 'color:#ffb8c8;font-weight:800;text-shadow:0 0 8px rgba(255,119,153,.7)' },
  { id: 'ns-royal', name: { ru: 'Роял', en: 'Royal' }, price: 300, css: 'color:#fff;font-weight:900;letter-spacing:.06em;text-shadow:0 0 4px #ffd83d,0 0 12px #e0a81f' },
  { id: 'ns-neon', name: { ru: 'Неон', en: 'Neon' }, price: 350, css: 'color:#22e0ff;font-weight:900;text-shadow:0 0 6px #22e0ff,0 0 14px rgba(34,224,255,.8)' },
  { id: 'ns-shadow', name: { ru: 'Тень', en: 'Shadow' }, price: 200, css: 'color:#3a3a4a;font-weight:900;text-shadow:0 2px 0 rgba(255,255,255,.25)' },
  { id: 'ns-magic', name: { ru: 'Магия', en: 'Magic' }, price: 400, css: 'color:#e8ccff;font-weight:900;font-style:italic;text-shadow:0 0 8px #c44dff,0 0 16px rgba(196,77,255,.6)' },
];
const EFFECTS = [
  { id: 'fx-sparkle', kind: 'tile', visual: '✦', price: 150, name: { ru: 'Искры', en: 'Sparks' } },
  { id: 'fx-petals', kind: 'tile', visual: '🌸', price: 200, name: { ru: 'Лепестки', en: 'Petals' } },
  { id: 'fx-stars', kind: 'tile', visual: '⭐', price: 250, name: { ru: 'Звёзды', en: 'Stars' } },
  { id: 'fx-leaves', kind: 'tile', visual: '🍃', price: 250, name: { ru: 'Листья', en: 'Leaves' } },
  { id: 'fx-hearts', kind: 'tile', visual: '💚', price: 300, name: { ru: 'Сердечки', en: 'Hearts' } },
  { id: 'fx-rainbow', kind: 'tile', visual: '🌈', price: 500, name: { ru: 'Радуга', en: 'Rainbow' } },
  { id: 'ae-glow', kind: 'avatar', visual: 'glow', price: 100, name: { ru: 'Свечение', en: 'Glow' } },
  { id: 'ae-pulse', kind: 'avatar', visual: 'pulse', price: 150, name: { ru: 'Пульс', en: 'Pulse' } },
  { id: 'ae-spin', kind: 'avatar', visual: 'spin', price: 250, name: { ru: 'Вращение', en: 'Spin' } },
  { id: 'ae-aurora', kind: 'avatar', visual: 'aurora', price: 350, name: { ru: 'Аврора', en: 'Aurora' } },
  { id: 'ae-flame', kind: 'avatar', visual: 'flame', price: 350, name: { ru: 'Пламя', en: 'Flame' } },
  { id: 'ae-galaxy', kind: 'avatar', visual: 'galaxy', price: 500, name: { ru: 'Галактика', en: 'Galaxy' } },
  { id: 'ne-glow', kind: 'name', visual: 'glow', price: 100, name: { ru: 'Сияние', en: 'Radiance' } },
  { id: 'ne-rainbow', kind: 'name', visual: 'rainbow', price: 250, name: { ru: 'Радуга', en: 'Rainbow' } },
  { id: 'ne-blink', kind: 'name', visual: 'blink', price: 150, name: { ru: 'Мерцание', en: 'Blink' } },
  { id: 'ne-wave', kind: 'name', visual: 'wave', price: 300, name: { ru: 'Волна', en: 'Wave' } },
  { id: 'ne-fire', kind: 'name', visual: 'fire', price: 300, name: { ru: 'Пламя', en: 'Flame' } },
  { id: 'ne-starlight', kind: 'name', visual: 'starlight', price: 450, name: { ru: 'Звёздный свет', en: 'Starlight' } },
];
const TILE_EFFECTS = EFFECTS.filter((e) => e.kind === 'tile');

/* ---------------- level generator (100 levels / 10 chapters) ---------------- */
const TOTAL_LEVELS = 100;
const CHAPTER_SIZE = 10;
const TOTAL_CHAPTERS = TOTAL_LEVELS / CHAPTER_SIZE;
function chapterOfLevel(level) {
  return Math.min(TOTAL_CHAPTERS - 1, Math.floor((level - 1) / CHAPTER_SIZE));
}
function generateStones(rng, w, h, count, maxHp, avoidBottomRows) {
  const stones = [];
  const used = new Set();
  let guard = 0;
  while (stones.length < count && guard++ < 200) {
    const r = Math.floor(rng() * (h - avoidBottomRows));
    const c = Math.floor(rng() * w);
    const i = r * w + c;
    if (used.has(i)) continue;
    used.add(i);
    const hp = maxHp <= 1 ? 1 : 1 + Math.floor(rng() * maxHp);
    stones.push({ idx: i, hp: Math.min(hp, maxHp) });
  }
  return stones;
}
function getLevelConfig(level) {
  const lv = Math.max(1, Math.min(TOTAL_LEVELS, level));
  const chapter = chapterOfLevel(lv);
  const rng = mulberry32(lv * 9176 + 11);
  const isBoss = lv % CHAPTER_SIZE === 0;
  const w = lv <= 3 ? 7 : 8;
  const h = lv <= 3 ? 7 : 8;
  const colors = lv <= 5 ? 4 : lv <= 20 ? 5 : 6;
  const moves = isBoss
    ? 26 + (rng() < 0.5 ? 0 : 1)
    : Math.max(22, 30 - Math.round(chapter * 0.8) - (rng() < 0.3 ? 1 : 0));
  let stones = [];
  if (!isBoss && chapter >= 2) {
    const base = Math.min(18, 4 + (chapter - 2) * 3);
    const extra = lv % 7 === 0 ? 6 : 0;
    const maxHp = lv >= 45 ? 2 : 1;
    stones = generateStones(rng, w, h, base + extra, maxHp, 2);
  } else if (isBoss && chapter >= 4) {
    stones = generateStones(rng, w, h, Math.min(10, chapter - 2), 1, 2);
  }
  const isItemLevel = !isBoss && chapter >= 3 && lv % 8 === 5;
  const items = isItemLevel ? 2 + Math.floor(chapter / 2) : 0;
  if (isItemLevel) stones = stones.filter((s) => Math.floor(s.idx / w) < h - 1);
  const voids = [];
  if (!isBoss && chapter >= 4) {
    const voidCount = Math.min(8, 2 + (chapter - 4));
    let guard = 0;
    while (voids.length < voidCount && guard++ < 100) {
      const r = Math.floor(rng() * h);
      const c = Math.floor(rng() * w);
      if (r === h - 1) continue;
      const i = r * w + c;
      if (stones.some((s) => s.idx === i)) continue;
      if (!voids.includes(i)) voids.push(i);
    }
  }
  const goals = [];
  const targetScore = Math.round(moves * (isBoss ? 30 + chapter * 2 : 42 + chapter * 3));
  const target2 = Math.round(targetScore * 1.6);
  const target3 = Math.round(targetScore * 2.4);
  const colorCount = Math.max(8, Math.round(moves * (0.5 + chapter * 0.03)));
  if (isBoss) {
    goals.push({ type: 'score', count: targetScore });
  } else if (lv <= 5) {
    goals.push({ type: 'collect', color: Math.floor(rng() * colors), count: Math.max(6, Math.round(colorCount * 0.6)) });
  } else if (lv % 7 === 0 && chapter >= 2) {
    goals.push({ type: 'stone', count: stones.length });
    goals.push({ type: 'score', count: Math.round(targetScore * 0.7) });
  } else if (isItemLevel) {
    goals.push({ type: 'item', count: items });
  } else if (lv % 9 === 4) {
    goals.push({ type: 'score', count: targetScore });
  } else if (chapter >= 2 && lv % 3 === 0) {
    const c1 = Math.floor(rng() * colors);
    let c2 = Math.floor(rng() * colors);
    if (c2 === c1) c2 = (c1 + 3) % colors;
    goals.push({ type: 'collect', color: c1, count: colorCount });
    goals.push({ type: 'collect', color: c2, count: Math.round(colorCount * 0.75) });
  } else {
    goals.push({ type: 'collect', color: Math.floor(rng() * colors), count: colorCount });
    goals.push({ type: 'score', count: Math.round(targetScore * 0.75) });
  }
  return { level: lv, chapter, w, h, colors, moves, mode: isBoss ? 'tap' : 'swap', goals, stones, voids, items, targetScore, star2: target2, star3: target3 };
}

/* ---------------- leaderboard bots (deterministic) ---------------- */
const NAME_A = ['Ирина', 'Алекс', 'Мария', 'Дмитрий', 'Софья', 'Максим', 'Алиса', 'Егор', 'Полина', 'Артём', 'Вика', 'Никита', 'Лиза', 'Кирилл', 'Настя', 'Роман', 'Даша', 'Влад', 'Катя', 'Олег', 'Юля', 'Саша', 'Глеб', 'Мила', 'Luna', 'Neo', 'Kate', 'Max', 'Emma', 'Leo', 'Mia', 'Dan'];
const NAME_B = ['_pro', '_2026', 'XD', '_top', ' GG', '★', '_zai', '777', '_pro2', ' Jr', 'Queen', 'King', '™', '_ru', '_ua', '_kz', '🌸', '⚡', '🔥', '🍀'];
function botName(rng) {
  const a = NAME_A[Math.floor(rng() * NAME_A.length)];
  const b = rng() < 0.55 ? NAME_B[Math.floor(rng() * NAME_B.length)] : '';
  const c = rng() < 0.3 ? String(Math.floor(rng() * 900) + 100) : '';
  return a + b + c;
}
function botLevel(rng) {
  const u = rng();
  if (u < 0.30) return 1 + Math.floor(rng() * 30);
  if (u < 0.55) return 30 + Math.floor(rng() * 120);
  if (u < 0.75) return 150 + Math.floor(rng() * 400);
  if (u < 0.88) return 550 + Math.floor(rng() * 900);
  if (u < 0.96) return 1450 + Math.floor(rng() * 2000);
  return 3450 + Math.floor(Math.pow(rng(), 2.2) * (TOTAL_LEVELS * 99));
}
function generateBots(count) {
  const n = count || 520;
  const rng = mulberry32(20261107);
  const bots = [];
  for (let i = 0; i < n; i++) {
    const level = botLevel(rng);
    const stars = Math.round(level * (1.6 + rng() * 1.3));
    const avatar = AVATARS[Math.floor(rng() * AVATARS.length)];
    const frame = FRAMES[Math.floor(rng() * FRAMES.length)];
    const style = NAME_STYLES[Math.floor(rng() * NAME_STYLES.length)];
    const nameFx = rng() < 0.3 ? ['ne-glow', 'ne-rainbow', 'ne-blink', 'ne-wave', 'ne-fire', 'ne-starlight'][Math.floor(rng() * 6)] : null;
    bots.push({ id: 'bot-' + i, name: botName(rng), level, stars, avatarId: avatar.id, frameId: frame.id, nameStyleId: style.id, nameEffectId: nameFx, isPlayer: false });
  }
  return bots.sort((x, y) => y.level - x.level || y.stars - x.stars);
}

/* ---------------- Волна 3: сад + копилка ----------------
 * Звёзды ТРАТЯТСЯ на объекты сада (available = earned - spent);
 * рейтинг и профиль считают заработанные. Копилка: взнос за
 * победу, вскрытие каждые PIGGY_WINS_TARGET побед, бесплатно.
 * ============================================================ */
const GARDEN_ZONE_CHAPTER = { 0: 1, 1: 3, 2: 6 };
function gardenZoneUnlockLevel(zone) { return GARDEN_ZONE_CHAPTER[zone] * CHAPTER_SIZE; }
function gardenCoinsBack(cost) { return 10 + cost * 2; }
const PIGGY_WINS_TARGET = 5;
function piggyDeposit(level) { return 10 + Math.min(Math.max(level, 1), 30) * 2; }
const GARDEN_OBJECTS = [
  { id: 'g-grass',     name: { ru: 'Газон',            en: 'Lawn' },            emoji: '🌿', cost: 2,  zone: 0, x: 12, y: 28, size: 1.0 },
  { id: 'g-path',      name: { ru: 'Тропинка',         en: 'Garden path' },     emoji: '🛣️', cost: 2,  zone: 0, x: 35, y: 25, size: 1.05 },
  { id: 'g-daisy',     name: { ru: 'Ромашки',          en: 'Daisies' },         emoji: '🌼', cost: 3,  zone: 0, x: 58, y: 28, size: 0.9 },
  { id: 'g-bush',      name: { ru: 'Кустарник',        en: 'Bush' },            emoji: '🪴', cost: 3,  zone: 0, x: 81, y: 26, size: 1.05 },
  { id: 'g-pot',       name: { ru: 'Кашпо',            en: 'Planter' },         emoji: '🏺', cost: 4,  zone: 0, x: 12, y: 11, size: 0.95 },
  { id: 'g-tulip',     name: { ru: 'Тюльпаны',         en: 'Tulips' },          emoji: '🌷', cost: 5,  zone: 0, x: 35, y: 9,  size: 0.95 },
  { id: 'g-lamp',      name: { ru: 'Фонарь',           en: 'Lantern' },         emoji: '🏮', cost: 5,  zone: 0, x: 58, y: 11, size: 1.0 },
  { id: 'g-mushroom',  name: { ru: 'Грибочки',         en: 'Mushrooms' },       emoji: '🍄', cost: 6,  zone: 0, x: 81, y: 10, size: 0.9 },
  { id: 'g-flowerbed', name: { ru: 'Клумба',           en: 'Flowerbed' },       emoji: '💐', cost: 5,  zone: 1, x: 10, y: 59, size: 1.0 },
  { id: 'g-apple',     name: { ru: 'Яблоня',           en: 'Apple tree' },      emoji: '🌳', cost: 6,  zone: 1, x: 29, y: 55, size: 1.35 },
  { id: 'g-birdhouse', name: { ru: 'Скворечник',       en: 'Birdhouse' },       emoji: '🐦', cost: 7,  zone: 1, x: 49, y: 59, size: 0.95 },
  { id: 'g-bench',     name: { ru: 'Скамейка',         en: 'Bench' },           emoji: '🪑', cost: 7,  zone: 1, x: 69, y: 57, size: 1.05 },
  { id: 'g-bee',       name: { ru: 'Улей',             en: 'Beehive' },         emoji: '🐝', cost: 8,  zone: 1, x: 89, y: 59, size: 0.95 },
  { id: 'g-greenhouse',name: { ru: 'Теплица',          en: 'Greenhouse' },      emoji: '🏡', cost: 8,  zone: 1, x: 76, y: 40, size: 1.3 },
  { id: 'g-sprinkler', name: { ru: 'Поливалка',        en: 'Sprinkler' },       emoji: '💦', cost: 9,  zone: 1, x: 16, y: 50, size: 0.9 },
  { id: 'g-swing',     name: { ru: 'Качели',           en: 'Swing set' },       emoji: '🛝', cost: 9,  zone: 1, x: 38, y: 47, size: 1.2 },
  { id: 'g-hedge',     name: { ru: 'Живая изгородь',   en: 'Hedge' },           emoji: '🌲', cost: 9,  zone: 1, x: 60, y: 49, size: 1.2 },
  { id: 'g-pond',      name: { ru: 'Пруд с лилиями',   en: 'Lily pond' },       emoji: '🪷', cost: 10, zone: 1, x: 82, y: 48, size: 1.1 },
  { id: 'g-berries',   name: { ru: 'Ягодные кусты',    en: 'Berry bushes' },    emoji: '🫐', cost: 10, zone: 1, x: 26, y: 37, size: 0.95 },
  { id: 'g-sunflower', name: { ru: 'Подсолнухи',       en: 'Sunflowers' },      emoji: '🌻', cost: 10, zone: 1, x: 52, y: 36, size: 1.0 },
  { id: 'g-arbor',     name: { ru: 'Виноградная арка', en: 'Grape arbor' },     emoji: '🍇', cost: 8,  zone: 1, x: 8,  y: 39, size: 1.0 },
  { id: 'g-statue',    name: { ru: 'Статуя',           en: 'Statue' },          emoji: '🗿', cost: 6,  zone: 2, x: 12, y: 91, size: 1.0 },
  { id: 'g-clock',     name: { ru: 'Солнечные часы',   en: 'Sundial' },         emoji: '🕗', cost: 7,  zone: 2, x: 33, y: 89, size: 1.0 },
  { id: 'g-maze',      name: { ru: 'Лабиринт',         en: 'Hedge maze' },      emoji: '🌀', cost: 7,  zone: 2, x: 54, y: 91, size: 1.0 },
  { id: 'g-rose',      name: { ru: 'Розарий',          en: 'Rose garden' },     emoji: '🌹', cost: 8,  zone: 2, x: 75, y: 89, size: 0.95 },
  { id: 'g-sakura',    name: { ru: 'Сакура',           en: 'Sakura tree' },     emoji: '🌸', cost: 8,  zone: 2, x: 92, y: 91, size: 1.1 },
  { id: 'g-swans',     name: { ru: 'Лебединое озеро',  en: 'Swan lake' },       emoji: '🦢', cost: 9,  zone: 2, x: 12, y: 81, size: 1.05 },
  { id: 'g-peacock',   name: { ru: 'Павлин',           en: 'Peacock' },         emoji: '🦚', cost: 10, zone: 2, x: 35, y: 79, size: 1.05 },
  { id: 'g-gazebo',    name: { ru: 'Беседка',          en: 'Gazebo' },          emoji: '🛖', cost: 11, zone: 2, x: 58, y: 81, size: 1.25 },
  { id: 'g-balloon',   name: { ru: 'Воздушный шар',    en: 'Hot-air balloon' }, emoji: '🎈', cost: 12, zone: 2, x: 81, y: 79, size: 1.15 },
  { id: 'g-arch',      name: { ru: 'Мраморная арка',   en: 'Marble arch' },     emoji: '🏛️', cost: 13, zone: 2, x: 14, y: 70, size: 1.2 },
  { id: 'g-carousel',  name: { ru: 'Карусель',         en: 'Carousel' },        emoji: '🎠', cost: 14, zone: 2, x: 40, y: 68, size: 1.3 },
  { id: 'g-stage',     name: { ru: 'Летняя сцена',     en: 'Summer stage' },    emoji: '🎪', cost: 14, zone: 2, x: 65, y: 70, size: 1.3 },
  { id: 'g-fountain',  name: { ru: 'Фонтан',           en: 'Fountain' },        emoji: '⛲', cost: 16, zone: 2, x: 88, y: 70, size: 1.3 },
];
