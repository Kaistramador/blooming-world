import { createBoard, mulberry32, trySwap } from '../src/lib/game/engine';
import { getLevelConfig } from '../src/lib/game/levels';

const lv = Number(process.argv[2] ?? 1);
const cfg = getLevelConfig(lv);
const mainRng = mulberry32(lv * 7919 + 13); // UI reuses ONE stream for createBoard + all swaps
let board = createBoard(cfg, mainRng);
const moves: string[] = [];
let score = 0;
const colors = [0, 0, 0, 0, 0, 0];
let items = 0, stones = 0;
for (let mv = 0; mv < cfg.moves; mv++) {
  let best: [number, number] | null = null;
  let bestScore = -1;
  for (let r = 0; r < cfg.h; r++)
    for (let c = 0; c < cfg.w; c++)
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= cfg.h || nc >= cfg.w) continue;
        const res = trySwap(board, r * cfg.w + c, nr * cfg.w + nc, cfg, mulberry32(7));
        if (res.valid && res.score > bestScore) { bestScore = res.score; best = [r * cfg.w + c, nr * cfg.w + nc]; }
      }
  if (!best) break;
  const res = trySwap(board, best[0], best[1], cfg, mainRng);
  if (!res.valid) break;
  board = res.frames[res.frames.length - 1].board;
  moves.push(`${Math.floor(best[0] / cfg.w)}-${best[0] % cfg.w},${Math.floor(best[1] / cfg.w)}-${best[1] % cfg.w}`);
  score += res.score;
  for (let i = 0; i < 6; i++) colors[i] += res.colorsCollected[i];
  items += res.itemsCollected; stones += res.stonesDestroyed;
  const met = cfg.goals.every(g =>
    g.type === 'score' ? score >= g.count : g.type === 'collect' ? colors[g.color] >= g.count : g.type === 'item' ? items >= g.count : stones >= g.count);
  if (met) { console.log(`WIN in ${mv + 1} moves, score ${score}`); console.log(moves.join(' ')); process.exit(0); }
}
console.log('NO WIN', score, JSON.stringify(cfg.goals), JSON.stringify(colors), items, stones);
