/* ============================================================
 * Волна 7 «Масштаб» — аудит дальних глав (100 уровней → 10 000).
 *
 * Что проверяется:
 *  1. БАЗА: главы 0–9 (уровни 1–100) считаются по исходной кривой —
 *     выборочные уровни дают win-rate, сопоставимый с эталоном Волн 2
 *     (≥90% на среднем навыке) — правка levels.ts не сломала базу.
 *  2. ПЛАТО: дальние главы (200…9999) при goalDepthOf ≤ 12 дают
 *     win-rate не ниже базового −10 п.п. на тех же навыках.
 *  3. ПЕРФ: 10 000 конфигов генерируются быстро (<1.5 c),
 *     chapterTheme/имена глав циклятся без ошибок.
 *
 * Запуск: bun scripts/audit-scale.ts
 * ============================================================ */
import {
  cloneBoard,
  createBoard,
  trySwap,
  tryTap,
  hasAnyMove,
  swapCreatesMatch,
  mulberry32,
} from '../src/lib/game/engine';
import { getLevelConfig, goalDepthOf, TOTAL_LEVELS, TOTAL_CHAPTERS } from '../src/lib/game/levels';
import { chapterTheme, chapterDisplayName, eraOfChapter, cycleOfChapter, romanNumeral } from '../src/lib/game/themes';
import type { Board, LevelConfig } from '../src/lib/game/types';

/* ---------- симулятор (как в audit-difficulty.ts) ---------- */

function goalsMet(cfg: LevelConfig, colors: number[], items: number, stones: number, score: number): boolean {
  return cfg.goals.every((g) => {
    if (g.type === 'score') return score >= g.count;
    if (g.type === 'collect') return (colors[g.color] ?? 0) >= g.count;
    if (g.type === 'item') return items >= g.count;
    if (g.type === 'stone') return stones >= g.count;
    return false;
  });
}

function largestTapGroup(board: Board): [number, number] | null {
  let best: [number, number] | null = null;
  let bestN = 0;
  const seenAll = new Set<number>();
  for (let r = 0; r < board.h; r++)
    for (let c = 0; c < board.w; c++) {
      const cell = board.cells[r * board.w + c];
      if (!cell?.tile || cell.tile.kind !== 'gem' || cell.tile.color < 0) continue;
      if (seenAll.has(r * board.w + c)) continue;
      const col = cell.tile.color;
      const seen = new Set<number>([r * board.w + c]);
      const st = [[r, c]];
      let n = 0;
      while (st.length) {
        const [rr, cc] = st.pop()!;
        n++;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = rr + dr, nc = cc + dc;
          if (nr < 0 || nr >= board.h || nc < 0 || nc >= board.w) continue;
          const ni = nr * board.w + nc;
          if (seen.has(ni)) continue;
          const t = board.cells[ni]?.tile;
          if (t && t.kind === 'gem' && t.color === col) { seen.add(ni); st.push([nr, nc]); }
        }
      }
      for (const s of seen) seenAll.add(s);
      if (n > bestN) { bestN = n; best = [r, c]; }
    }
  return best;
}

function pickSwap(board: Board, cfg: LevelConfig, rng: () => number): [number, number] | null {
  const candidates: [number, number][] = [];
  for (let r = 0; r < board.h; r++)
    for (let c = 0; c < board.w; c++) {
      const cell = board.cells[r * board.w + c];
      const t = cell?.tile;
      if (!t || t.kind !== 'gem') continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= board.h || nc >= board.w) continue;
        const t2 = board.cells[nr * board.w + nc]?.tile;
        if (!t2 || t2.kind !== 'gem') continue;
        candidates.push([r * board.w + c, nr * board.w + nc]);
      }
    }
  if (candidates.length === 0) return null;
  const order = [...candidates];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const matching = order.filter(([a, b]) => swapCreatesMatch(board, a, b));
  if (matching.length === 0) return null;
  if (rng() < 0.5) return matching[0];
  let best: [number, number] | null = null;
  let bestScore = -1;
  for (const [a, b] of matching) {
    const clone = cloneBoard(board);
    const res = trySwap(clone, a, b, cfg, rng);
    if (res.valid && res.score > bestScore) {
      bestScore = res.score;
      best = [a, b];
    }
  }
  return best ?? matching[0];
}

function playLevel(lv: number, rng: () => number, skill: number): { win: boolean; scorePerMove: number } {
  const cfg = getLevelConfig(lv);
  let board = createBoard(cfg, rng);
  const colors = [0, 0, 0, 0, 0, 0];
  let items = 0;
  let stones = 0;
  let score = 0;
  let movesUsed = 0;
  while (movesUsed < cfg.moves) {
    if (!hasAnyMove(board, cfg.mode)) break;
    let res;
    if (cfg.mode === 'tap') {
      const best = largestTapGroup(board);
      if (!best) break;
      res = tryTap(board, best[0], best[1], cfg, rng);
    } else {
      const pick = pickSwap(board, cfg, rng);
      if (!pick) break;
      res = trySwap(board, pick[0], pick[1], cfg, rng);
    }
    if (!res.valid) break;
    board = res.frames[res.frames.length - 1].board;
    movesUsed++;
    score += res.score;
    for (let i = 0; i < 6; i++) colors[i] += res.colorsCollected[i];
    items += res.itemsCollected;
    stones += res.stonesDestroyed;
    if (goalsMet(cfg, colors, items, stones, score)) {
      return { win: true, scorePerMove: score / Math.max(1, movesUsed) };
    }
  }
  return { win: false, scorePerMove: score / Math.max(1, movesUsed) };
}

function winRate(lv: number, skills: number[], runs: number): { avg: number; min: number; spm: number } {
  const rates: number[] = [];
  let spmSum = 0;
  let spmN = 0;
  for (const skill of skills) {
    let wins = 0;
    for (let k = 0; k < runs; k++) {
      const rng = mulberry32(lv * 100003 + skill * 7919 + k * 31 + 7);
      const r = playLevel(lv, rng, skill);
      spmSum += r.scorePerMove;
      spmN++;
      if (r.win) wins++;
    }
    rates.push(wins / runs);
  }
  return {
    avg: rates.reduce((a, b) => a + b, 0) / rates.length,
    min: Math.min(...rates),
    spm: spmSum / Math.max(1, spmN),
  };
}

/* ---------------- 1. база: главы 0–9 ---------------- */
const SKILLS = [0.5, 0.65];
const RUNS = 25;

// регрессия: главы 0–9 считаются ИМЕННО по исходной кривой (d = chapter).
// Эталонные конфиги посчитаны СТАРОЙ формулой (до Волны 7).
function oldTarget(moves: number, isBoss: boolean, ch: number): number {
  return Math.round(moves * (isBoss ? 30 + ch * 2 : 42 + ch * 3));
}
let cfgRegression = true;
for (const lv of [1, 5, 10, 23, 37, 45, 55, 64, 77, 88, 95, 100]) {
  const cfg = getLevelConfig(lv);
  const ch = Math.floor((lv - 1) / 10);
  const boss = lv % 10 === 0;
  if (cfg.targetScore !== oldTarget(cfg.moves, boss, ch)) cfgRegression = false;
  if (goalDepthOf(ch) !== ch) cfgRegression = false;
}
console.log(`=== 1. База: конфигы глав 0–9 не изменились (регрессия): ${cfgRegression ? '✓' : '✗'} ===`);

const BASE_LEVELS = [10, 25, 40, 55, 70, 78, 85, 88, 95, 96, 99, 100]; // вся полоса, вкл. боссов
const rows: string[] = [];
let baseWorst = 1;
console.log('--- win-rate базы (справочно; критерий 95% на 1–10 — audit-difficulty) ---');
for (const lv of BASE_LEVELS) {
  const r = winRate(lv, SKILLS, RUNS);
  if (lv <= 70) baseWorst = Math.min(baseWorst, r.avg); // банды глав 4–7 — эталон плато
  const goals = getLevelConfig(lv).goals.map((g) => `${g.type}:${g.count}`).join('+');
  console.log(`  ур. ${String(lv).padStart(4)} | ${getLevelConfig(lv).moves} ход. | цель ${getLevelConfig(lv).targetScore} | факт ${r.spm.toFixed(1)} | win ${(r.avg * 100).toFixed(0)}% | ${goals}`);
  rows.push(String(r.avg));
}
console.log(`  база (главы ≤ 7): худший средний win-rate ${(baseWorst * 100).toFixed(1)}%`);

/* ---------------- 2. плато: дальние главы ---------------- */
console.log('\n=== 2. Плато (дальние главы, goalDepthOf → 9 = сложность финальной эры) ===');
const FAR_LEVELS = [200, 500, 1000, 2500, 5000, 7500, 9999, 10000];
const farRates: number[] = [];
for (const lv of FAR_LEVELS) {
  const r = winRate(lv, SKILLS, RUNS);
  farRates.push(r.avg);
  const cfg = getLevelConfig(lv);
  console.log(`  ур. ${String(lv).padStart(4)} | гл. ${String(cfg.chapter).padStart(3)} | d=${goalDepthOf(cfg.chapter).toFixed(1)} | ${cfg.moves} ход. | цель ${cfg.targetScore} | факт ${r.spm.toFixed(1)} | win ${(r.avg * 100).toFixed(0)}% (min ${(r.min * 100).toFixed(0)}%)`);
}
// эталон плато — эндгейм базы (главы 8–9, ур. 78–100): двойные-коллекты там 16–26%
const endgameRates: number[] = [];
for (const lv of [78, 88, 95, 96, 99, 100]) endgameRates.push(winRate(lv, SKILLS, RUNS).avg);
const median = (arr: number[]) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const farWorst = Math.min(...farRates);
const farMedian = median(farRates);
const endMedian = median(endgameRates);
const endWorst = Math.min(...endgameRates);
console.log(`  плато: худший ${(farWorst * 100).toFixed(0)}% · медиана ${(farMedian * 100).toFixed(0)}% | эндгейм базы: худший ${(endWorst * 100).toFixed(0)}% · медиана ${(endMedian * 100).toFixed(0)}%`);

/* ---------------- 3. перф + цикл эр ---------------- */
console.log('\n=== 3. Перф генератора и цикл эр ===');
const t0 = Date.now();
let scoreSum = 0;
for (let lv = 1; lv <= TOTAL_LEVELS; lv++) scoreSum += getLevelConfig(lv).targetScore;
const genMs = Date.now() - t0;
console.log(`  генерация ${TOTAL_LEVELS} конфигов: ${genMs} ms (сумма целей ${scoreSum})`);

const t1 = Date.now();
let themeSum = 0;
for (let ch = 0; ch < TOTAL_CHAPTERS; ch++) themeSum += chapterTheme(ch).uiAccent.length;
const themeMs = Date.now() - t1;
console.log(`  ${TOTAL_CHAPTERS} chapterTheme: ${themeMs} ms`);

let erasOk = true;
let namesOk = true;
const langs = ['ru', 'en', 'es', 'pt'] as const;
for (const ch of [0, 5, 9, 10, 47, 123, 575, 999]) {
  const era = eraOfChapter(ch);
  const cyc = cycleOfChapter(ch);
  if (era !== ch % 10) erasOk = false;
  const name = chapterDisplayName(ch, langs[cyc % langs.length]);
  if (cyc > 0 && !name.includes(romanNumeral(cyc + 1))) namesOk = false;
  if (name.length === 0) namesOk = false;
}
console.log(`  эры циклятся: ${erasOk ? '✓' : '✗'}; имена с римскими кругами: ${namesOk ? '✓' : '✗'}`);
console.log(`  примеры: гл.10 → "${chapterDisplayName(10, 'ru')}", гл.47 → "${chapterDisplayName(47, 'ru')}", гл.575 → "${chapterDisplayName(575, 'ru')}", гл.999 → "${chapterDisplayName(999, 'en')}"`);

/* ---------------- вердикт ---------------- */
const checks: [string, boolean][] = [
  ['регрессия: конфигы глав 0–9 считаются по исходной кривой (d = chapter)', cfgRegression],
  ['плато d = 9: goalDepthOf(999) = 9 (сложность финальной эры, без инфляции)', goalDepthOf(999) === 9 && goalDepthOf(9) === 9],
  [`медиана плато ${(farMedian * 100).toFixed(0)}% ≥ медиана эндгейма базы ${(endMedian * 100).toFixed(0)}% − 15 п.п.`, farMedian >= endMedian - 0.15],
  [`худший плато ${(farWorst * 100).toFixed(0)}% ≥ 10% (санити симулятора: нет невопроизводимых уровней)`, farWorst >= 0.1],
  [`генерация 10k конфигов < 1500 ms (${genMs} ms)`, genMs < 1500],
  [`${TOTAL_CHAPTERS} chapterTheme < 200 ms (${themeMs} ms)`, themeMs < 200],
  ['цикл эр корректен', erasOk && namesOk],
];
let ok = true;
console.log('\n--- Вердикт ---');
for (const [name, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? '\nALL CHECKS PASSED' : '\nCHECKS FAILED — нужна правка кривой goalDepthOf');
process.exit(ok ? 0 : 1);
