/* ============================================================
 * Волна 3: аудит экономики сада и копилки.
 *
 * Модель игрока: проходит уровни 1..100 подряд, побеждая с
 * распределением звёзд (параметризовано навыком). Копилка
 * вскрывается каждые PIGGY_WINS_TARGET побед. Сад: жадная
 * покупка самого дешёвого доступного объекта за звёзды с
 * учётом гейтов зон (после глав 1/3/6).
 *
 * Запуск: bun scripts/audit-economy.ts
 * Критерии приёмки:
 *   - сад открыт после главы 1 (уровень 10);
 *   - при среднем навыке (avg 2.4-2.6 ⭐) к 100 уровню
 *     восстановлено ≥ 85% объектов;
 *   - копилка вскрывается регулярно (~каждые 5 побед);
 *   - монет к концу игры достаточно для топовой косметики
 *     (≥ 1200 без демо-пополнений) — за счёт побед+сада+копилки.
 * ============================================================ */

import { getLevelConfig, chapterOfLevel, TOTAL_LEVELS } from '../src/lib/game/levels';
import {
  GARDEN_OBJECTS,
  GARDEN_ZONE_CHAPTER,
  gardenCoinsBack,
  piggyDeposit,
  PIGGY_WINS_TARGET,
} from '../src/lib/game/garden';

const STAR_TABLE: Record<string, number> = { low: 2.1, mid: 2.5, high: 2.9 };

function starsFor(skill: keyof typeof STAR_TABLE, level: number): number {
  // детерминированный «рандом» от seeds, чтобы прогон был воспроизводим
  const seed = skill.length * 7919 + level * 104729;
  const r = ((Math.sin(seed) + 1) / 2);
  const avg = STAR_TABLE[skill];
  // распределение вокруг среднего: 3⭐ чаще у хорошего игрока
  const p3 = (avg - 1) / 2; // вероятность 3⭐
  const r2 = ((Math.cos(seed * 1.7) + 1) / 2);
  if (r2 < p3) return 3;
  if (r < 0.75) return 2;
  return 1;
}

interface EconomyResult {
  skill: string;
  starsEarned: number;
  starsSpent: number;
  restored: number;
  restoredAt10: number;
  restoredAt30: number;
  restoredAt60: number;
  coinsWins: number;
  coinsPiggy: number;
  coinsGarden: number;
  piggyOpens: number;
  coinsTotal: number;
}

function simulate(skill: keyof typeof STAR_TABLE): EconomyResult {
  let starsEarned = 0;
  let starsSpent = 0;
  let coins = 0;
  let coinsWins = 0;
  let coinsPiggy = 0;
  let coinsGarden = 0;
  let piggyCoins = 0;
  let piggyWins = 0;
  let piggyOpens = 0;
  const restored = new Set<string>();
  const restoredAt = { 10: 0, 30: 0, 60: 0 } as Record<number, number>;
  let lastLevel = 0;

  const available = () => starsEarned - starsSpent;
  // гейт как в приложении: зона открыта, когда пройден уровень gardenZoneUnlockLevel
  // (после завершения уровня N игра разрешает N+1 → lastLevel >= gate)
  const zoneOpen = (zone: number) => lastLevel >= GARDEN_ZONE_CHAPTER[zone as 0 | 1 | 2] * 10;

  const tryBuyGarden = () => {
    let bought = true;
    while (bought) {
      bought = false;
      const candidates = GARDEN_OBJECTS
        .filter((o) => !restored.has(o.id) && o.cost <= available())
        .sort((a, b) => a.cost - b.cost);
      // зоны открываются по главам: покупаем только открытые зоны
      const open = candidates.filter((o) => zoneOpen(o.zone));
      if (open.length > 0) {
        const obj = open[0];
        restored.add(obj.id);
        starsSpent += obj.cost;
        const back = gardenCoinsBack(obj.cost);
        coins += back;
        coinsGarden += back;
        bought = true;
      }
    }
  };

  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const stars = starsFor(skill, level);
    starsEarned += stars;
    const chapter = chapterOfLevel(level);
    // награда победы (первое прохождение), streak в среднем ≈ ×2.2 по кривой серий
    coinsWins += (30 + stars * 10 + chapter * 5) * 2.2;
    // копилка
    piggyCoins += piggyDeposit(level);
    piggyWins += 1;
    if (piggyWins >= PIGGY_WINS_TARGET) {
      coins += piggyCoins;
      coinsPiggy += piggyCoins;
      piggyCoins = 0;
      piggyWins = 0;
      piggyOpens += 1;
    }
    lastLevel = level;
    tryBuyGarden();
    if (level === 10) restoredAt[10] = restored.size;
    if (level === 30) restoredAt[30] = restored.size;
    if (level === 60) restoredAt[60] = restored.size;
  }

  return {
    skill,
    starsEarned,
    starsSpent,
    restored: restored.size,
    restoredAt10: restoredAt[10],
    restoredAt30: restoredAt[30],
    restoredAt60: restoredAt[60],
    coinsWins: Math.round(coinsWins),
    coinsPiggy: Math.round(coinsPiggy),
    coinsGarden: Math.round(coinsGarden),
    piggyOpens,
    coinsTotal: Math.round(coinsWins + coinsPiggy + coinsGarden),
  };
}

/* ---------------- прогон ---------------- */
console.log('=== Волна 3: аудит экономики сада и копилки ===');
console.log(`Объектов сада: ${GARDEN_OBJECTS.length}, суммарная цена: ${GARDEN_OBJECTS.reduce((a, o) => a + o.cost, 0)}⭐ (макс звёзд: ${TOTAL_LEVELS * 3})`);
console.log(`Копилка: вскрытие каждые ${PIGGY_WINS_TARGET} побед, взнос 10+min(level,30)*2 монет`);
console.log('');

const rows = (['low', 'mid', 'high'] as const).map(simulate);
console.table(rows);

const mid = rows[1];
const checks: [string, boolean][] = [
  ['mid: к 100-му уровню восстановлено ≥85% сада', mid.restored / GARDEN_OBJECTS.length >= 0.85],
  ['mid: сад прогрессирует по зонам (10/30/60)', mid.restoredAt10 > 0 && mid.restoredAt30 > mid.restoredAt10 && mid.restoredAt60 > mid.restoredAt30],
  ['mid: копилка вскрылась ≥18 раз (100 побед / 5)', mid.piggyOpens >= 18],
  ['mid: монет ≥1200 к концу (топ-косметика достижима)', mid.coinsTotal >= 1200],
  ['low: игрок тоже украшает сад (≥12 объектов)', rows[0].restored >= 12],
];
let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? '\nALL CHECKS PASSED' : '\nCHECKS FAILED — нужно перебалансировать цены');
process.exit(ok ? 0 : 1);
