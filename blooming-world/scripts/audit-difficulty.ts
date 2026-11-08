/* ============================================================
 * Волна 2 — аудит сложности первых 15 уровней.
 * Критерий приёмки: win-rate ≥ 95% на уровнях 1–10
 * (симуляция «обычного игрока», смешанные навыки).
 *
 * Запуск: bun scripts/audit-difficulty.ts
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
import { getLevelConfig } from '../src/lib/game/levels';
import type { Board, LevelConfig } from '../src/lib/game/types';

const FIRST_N = 15;
const RUNS_PER_SKILL = 30;
const SKILLS = [0.35, 0.5, 0.65, 0.8]; // от слабого до сильного игрока

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
  if (rng() < 0.5) return matching[0]; // половина «случайных» ходов без оценки
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

function playLevel(lv: number, rng: () => number, skill: number): { win: boolean; movesLeft: number; score: number } {
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
      const pick = rng() < skill ? pickSwap(board, cfg, rng) : pickSwap(board, cfg, rng);
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
      return { win: true, movesLeft: cfg.moves - movesUsed, score };
    }
  }
  return { win: false, movesLeft: 0, score };
}

/* ---------------- main ---------------- */
const rows: { lv: number; goals: string; moves: number; rates: number[]; avg: number; minMovesLeft: number }[] = [];
let errors = 0;

for (let lv = 1; lv <= FIRST_N && errors === 0; lv++) {
  const cfg = getLevelConfig(lv);
  const goals = cfg.goals.map((g) => (g.type === 'collect' ? `${g.type}#${g.color}:${g.count}` : `${g.type}:${g.count}`)).join('+');
  const rates: number[] = [];
  let minMovesLeft = 999;
  try {
    for (const skill of SKILLS) {
      let wins = 0;
      for (let k = 0; k < RUNS_PER_SKILL; k++) {
        const rng = mulberry32(lv * 100003 + skill * 7919 + k * 31 + 7);
        const r = playLevel(lv, rng, skill);
        if (r.win) {
          wins++;
          minMovesLeft = Math.min(minMovesLeft, r.movesLeft);
        }
      }
      rates.push(wins / RUNS_PER_SKILL);
    }
  } catch (e) {
    errors++;
    console.log(`ERROR at level ${lv}:`, (e as Error).message);
    break;
  }
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  rows.push({ lv, goals, moves: cfg.moves, rates, avg, minMovesLeft: minMovesLeft === 999 ? -1 : minMovesLeft });
}

console.log('Аудит сложности: уровни 1–' + FIRST_N + ', по ' + RUNS_PER_SKILL + ' прогонов на навык ' + SKILLS.join('/'));
console.log('lv | ходы | цели                          | skill ' + SKILLS.join('  ') + ' | средний | запас ходов');
for (const r of rows) {
  const flag = r.lv <= 10 && r.avg < 0.95 ? '  ← НИЖЕ 95%!' : '';
  console.log(
    String(r.lv).padStart(2) + ' | ' + String(r.moves).padStart(4) + ' | ' + r.goals.padEnd(29) + ' | ' +
    r.rates.map((x) => (x * 100).toFixed(0).padStart(4) + '%').join('   ') + '    | ' +
    (r.avg * 100).toFixed(1).padStart(5) + '%' + flag,
  );
}
const first10 = rows.filter((r) => r.lv <= 10);
const worst10 = Math.min(...first10.map((r) => r.avg));
console.log('\nИтог: минимальный средний win-rate на уровнях 1–10: ' + (worst10 * 100).toFixed(1) + '% (критерий ≥95%)');
console.log(worst10 >= 0.95 ? '✓ АУДИТ ПРОЙДЕН — правка levels.ts не требуется' : '✗ ТРЕБУЕТСЯ ПРАВКА levels.ts');
