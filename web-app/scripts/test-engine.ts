/* Engine smoke test: simulate greedy bot play across all 100 levels. */
import {
  cloneBoard,
  createBoard,
  trySwap,
  tryTap,
  hasAnyMove,
  swapCreatesMatch,
  mulberry32,
  hammerHit,
} from '../src/lib/game/engine';
import { getLevelConfig, TOTAL_LEVELS } from '../src/lib/game/levels';
import type { Board, LevelConfig } from '../src/lib/game/types';

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
  // shuffle candidate order, evaluate in greedy passes
  const order = [...candidates];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const matching = order.filter(([a, b]) => swapCreatesMatch(board, a, b));
  if (matching.length === 0) return null;
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

function playLevel(lv: number, rng: () => number, skill: number): { win: boolean; score: number; cascades: number; movesUsed: number } {
  const cfg = getLevelConfig(lv);
  let board = createBoard(cfg, rng);
  const colors = [0, 0, 0, 0, 0, 0];
  let items = 0;
  let stones = 0;
  let score = 0;
  let movesUsed = 0;
  let maxCascade = 0;

  while (movesUsed < cfg.moves) {
    if (!hasAnyMove(board, cfg.mode)) break;
    let res;
    if (cfg.mode === 'tap') {
      const best = largestTapGroup(board);
      if (!best) break;
      res = tryTap(board, best[0], best[1], cfg, rng);
    } else {
      // with probability (1-skill) pick a random matching swap instead of best
      const pick = rng() < skill ? pickSwap(board, cfg, rng) : (() => {
        const shuffled = pickSwap(board, cfg, rng);
        return shuffled;
      })();
      if (!pick) break;
      res = trySwap(board, pick[0], pick[1], cfg, rng);
    }
    if (!res.valid) break;
    board = res.frames[res.frames.length - 1].board;
    movesUsed++;
    score += res.score;
    maxCascade = Math.max(maxCascade, res.maxCascade);
    for (let i = 0; i < 6; i++) colors[i] += res.colorsCollected[i];
    items += res.itemsCollected;
    stones += res.stonesDestroyed;
    if (goalsMet(cfg, colors, items, stones, score)) {
      return { win: true, score, cascades: maxCascade, movesUsed };
    }
  }
  return { win: false, score, cascades: maxCascade, movesUsed };
}

function runBatch(label: string, skill: number): void {
  let wins = 0;
  const byChapter: number[][] = [];
  let errors = 0;
  let totalCascades = 0;
  for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
    const rng = mulberry32(lv * 31 + 7);
    try {
      const r = playLevel(lv, rng, skill);
      const ch = Math.floor((lv - 1) / 10);
      byChapter[ch] = byChapter[ch] || [0, 0];
      byChapter[ch][0]++;
      if (r.win) {
        wins++;
        byChapter[ch][1]++;
      }
      totalCascades += r.cascades;
    } catch (e) {
      errors++;
      console.log(`ERROR at level ${lv}:`, (e as Error).message);
      console.log((e as Error).stack);
      break;
    }
  }
  console.log(`[${label}] skill=${skill} Wins: ${wins}/${TOTAL_LEVELS} (${((wins / TOTAL_LEVELS) * 100).toFixed(0)}%)`);
  console.log('  per chapter:', byChapter.map(([t, w], i) => `ch${i + 1}: ${w}/${t}`).join(' '));
  console.log(`  avg max cascade: ${(totalCascades / TOTAL_LEVELS).toFixed(2)} errors: ${errors}`);
}

runBatch('casual', 0.55);
runBatch('good', 0.85);

// specials sanity
const cfg30 = getLevelConfig(30);
const board30 = createBoard(cfg30, mulberry32(999));
let specialsSeen = 0;
for (const cell of board30.cells) if (cell?.tile?.special && cell.tile.special !== 'none') specialsSeen++;
console.log('Initial specials on fresh board (should be 0):', specialsSeen);

// hammer on stone
const lv70 = getLevelConfig(70);
if (lv70.stones.length > 0) {
  const b70 = createBoard(lv70, mulberry32(5));
  const s = lv70.stones[0];
  const r70 = hammerHit(b70, Math.floor(s.idx / lv70.w), s.idx % lv70.w, lv70, mulberry32(6));
  console.log('Hammer on stone valid:', r70.valid, 'stonesDestroyed:', r70.stonesDestroyed);
}
console.log('OK');
