import { createBoard, mulberry32, trySwap } from '../src/lib/game/engine';
import { getLevelConfig } from '../src/lib/game/levels';

const lv = Number(process.argv[2] ?? 1);
const cfg = getLevelConfig(lv);
const board = createBoard(cfg, mulberry32(lv * 7919 + 13));
for (let r = 0; r < cfg.h; r++)
  for (let c = 0; c < cfg.w; c++)
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= cfg.h || nc >= cfg.w) continue;
      const res = trySwap(board, r * cfg.w + c, nr * cfg.w + nc, cfg, mulberry32(1));
      if (res.valid) {
        console.log(`${r}-${c} ${nr}-${nc}`);
        process.exit(0);
      }
    }
console.log('none');
