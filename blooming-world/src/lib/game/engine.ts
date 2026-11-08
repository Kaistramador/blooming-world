/* ============================================================
 * Bloom Match — match-3 engine (pure TS, no DOM)
 * Supports: swap-matches, cascades, specials (rocket H/V, bomb,
 * rainbow), combo swaps, stone blockers, drop items, tap-mode
 * ("blast" levels) and booster actions.
 * ============================================================ */

import type {
  Board,
  BoardCell,
  Frame,
  LevelConfig,
  MoveResult,
  SpecialKind,
  Tile,
} from './types';
import { EMPTY_MOVE } from './types';

/* ---------------- RNG ---------------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- IDs ---------------- */

let nextId = 1;
export function resetIdCounter(): void {
  nextId = 1;
}
function newId(): number {
  return nextId++;
}

/* ---------------- Board helpers ---------------- */

export function cloneBoard(b: Board): Board {
  return {
    w: b.w,
    h: b.h,
    cells: b.cells.map((c) =>
      c
        ? {
            tile: c.tile ? { ...c.tile } : null,
            blocker: c.blocker ? { ...c.blocker } : null,
          }
        : null,
    ),
  };
}

export function idxOf(b: Board, r: number, c: number): number {
  return r * b.w + c;
}

export function cellAt(b: Board, r: number, c: number): BoardCell {
  if (r < 0 || r >= b.h || c < 0 || c >= b.w) return null;
  return b.cells[r * b.w + c];
}

function isOpen(b: Board, r: number, c: number): boolean {
  return cellAt(b, r, c) !== null;
}

/** Gem color at cell or -1 when absent / not matchable. */
function gemColor(b: Board, r: number, c: number): number {
  const cell = cellAt(b, r, c);
  if (!cell || !cell.tile) return -1;
  const t = cell.tile;
  if (t.kind !== 'gem' || t.color < 0) return -1;
  return t.color;
}

function tileAt(b: Board, r: number, c: number): Tile | null {
  return cellAt(b, r, c)?.tile ?? null;
}

export function isMovable(t: Tile | null): boolean {
  return !!t && t.kind === 'gem';
}

/* ---------------- Board creation ---------------- */

function findRuns(b: Board): { cells: number[]; dir: 'h' | 'v' }[] {
  const runs: { cells: number[]; dir: 'h' | 'v' }[] = [];
  for (let r = 0; r < b.h; r++) {
    let c = 0;
    while (c < b.w) {
      const col = gemColor(b, r, c);
      if (col < 0) {
        c++;
        continue;
      }
      let e = c + 1;
      while (e < b.w && gemColor(b, r, e) === col) e++;
      if (e - c >= 3) {
        const cells: number[] = [];
        for (let k = c; k < e; k++) cells.push(idxOf(b, r, k));
        runs.push({ cells, dir: 'h' });
      }
      c = e;
    }
  }
  for (let c = 0; c < b.w; c++) {
    let r = 0;
    while (r < b.h) {
      const col = gemColor(b, r, c);
      if (col < 0) {
        r++;
        continue;
      }
      let e = r + 1;
      while (e < b.h && gemColor(b, e, c) === col) e++;
      if (e - r >= 3) {
        const cells: number[] = [];
        for (let k = r; k < e; k++) cells.push(idxOf(b, k, c));
        runs.push({ cells, dir: 'v' });
      }
      r = e;
    }
  }
  return runs;
}

interface Group {
  cells: number[];
  maxH: number;
  maxV: number;
  hasH: boolean;
  hasV: boolean;
}

function groupify(runs: { cells: number[]; dir: 'h' | 'v' }[]): Group[] {
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let p = parent.get(x);
    if (p === undefined) {
      parent.set(x, x);
      p = x;
    }
    while (p !== parent.get(p)!) p = parent.get(p)!;
    return p;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const run of runs) {
    for (const cell of run.cells) find(cell);
    for (let i = 1; i < run.cells.length; i++) union(run.cells[i - 1], run.cells[i]);
  }
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      for (const a of runs[i].cells) {
        if (runs[j].cells.includes(a)) {
          union(runs[i].cells[0], runs[j].cells[0]);
          break;
        }
      }
    }
  }
  const groups = new Map<number, Group>();
  for (const run of runs) {
    for (const cell of run.cells) {
      const root = find(cell);
      let g = groups.get(root);
      if (!g) {
        g = { cells: [], maxH: 0, maxV: 0, hasH: false, hasV: false };
        groups.set(root, g);
      }
      if (!g.cells.includes(cell)) g.cells.push(cell);
      const len = run.cells.length;
      if (run.dir === 'h') {
        g.hasH = true;
        g.maxH = Math.max(g.maxH, len);
      } else {
        g.hasV = true;
        g.maxV = Math.max(g.maxV, len);
      }
    }
  }
  return [...groups.values()];
}

function specialForGroup(g: Group): SpecialKind {
  if (g.maxH >= 5 || g.maxV >= 5) return 'rainbow';
  if (g.hasH && g.hasV) return 'bomb';
  if (g.maxH === 4) return 'rocketH';
  if (g.maxV === 4) return 'rocketV';
  return 'none';
}

export function createBoard(cfg: LevelConfig, rng: () => number): Board {
  resetIdCounter();
  const total = cfg.w * cfg.h;
  const cells: BoardCell[] = [];
  for (let i = 0; i < total; i++) cells.push(cfg.voids.includes(i) ? null : { tile: null, blocker: null });
  for (const s of cfg.stones) {
    if (cells[s.idx]) {
      cells[s.idx] = { tile: null, blocker: { type: 'stone', hp: s.hp } };
    }
  }
  const board: Board = { w: cfg.w, h: cfg.h, cells };
  // fill with gems avoiding immediate runs
  for (let r = 0; r < cfg.h; r++) {
    for (let c = 0; c < cfg.w; c++) {
      const cell = cellAt(board, r, c);
      if (!cell || cell.blocker) continue;
      const forbidden = new Set<number>();
      const l1 = gemColor(board, r, c - 1);
      const l2 = gemColor(board, r, c - 2);
      if (l1 >= 0 && l1 === l2) forbidden.add(l1);
      const u1 = gemColor(board, r - 1, c);
      const u2 = gemColor(board, r - 2, c);
      if (u1 >= 0 && u1 === u2) forbidden.add(u1);
      let col = Math.floor(rng() * cfg.colors);
      let guard = 0;
      while (forbidden.has(col) && guard++ < 20) col = Math.floor(rng() * cfg.colors);
      cell.tile = makeTile(col);
    }
  }
  // guarantee a playable opening
  let tries = 0;
  while (!hasAnyMove(board, cfg.mode) && tries++ < 25) {
    shuffleGems(board, rng);
  }
  return board;
}

function makeTile(color: number, special: SpecialKind = 'none', kind: 'gem' | 'item' = 'gem'): Tile {
  return { id: newId(), color, special, kind };
}

/* ---------------- Gravity / refill ---------------- */

interface GravityOut {
  spawnIds: number[];
  collectedIds: number[];
}

function applyGravity(
  b: Board,
  cfg: LevelConfig,
  rng: () => number,
  itemsLeft: { n: number },
): GravityOut {
  const spawnIds: number[] = [];
  const collectedIds: number[] = [];

  // 1) straight compaction inside segments (voids/stones split columns)
  for (let c = 0; c < b.w; c++) {
    let segBottom = -1;
    let segRows: number[] = [];
    const flush = () => {
      segBottom = -1;
      if (segRows.length === 0) return;
      let write = segRows[0];
      for (const r of segRows) {
        const cell = cellAt(b, r, c)!;
        if (cell.tile && write !== r) {
          const dest = cellAt(b, write, c)!;
          dest.tile = cell.tile;
          cell.tile = null;
        }
        write--;
      }
      segRows = [];
    };
    for (let r = b.h - 1; r >= 0; r--) {
      const cell = cellAt(b, r, c);
      if (!cell || cell.blocker) {
        flush();
        continue;
      }
      if (segBottom < 0) segBottom = r;
      segRows.push(r);
    }
    flush();
  }

  // 2) diagonal slides (resolve pockets under stones)
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let r = 1; r < b.h; r++) {
      for (let c = 0; c < b.w; c++) {
        const cell = cellAt(b, r, c);
        if (!cell || cell.blocker || cell.tile) continue;
        const belowOpen = (cc: number) => {
          const bc = cellAt(b, r, cc);
          return !!bc && !bc.blocker;
        };
        for (const dc of [-1, 1]) {
          const sc = c + dc;
          if (sc < 0 || sc >= b.w) continue;
          const src = cellAt(b, r - 1, sc);
          if (!src || !src.tile || !isMovable(src.tile)) continue;
          if (belowOpen(sc)) continue; // it can still fall straight
          cell.tile = src.tile;
          src.tile = null;
          moved = true;
          break;
        }
      }
    }
    if (!moved) break;
  }

  // 3) refill top empty stretches of every column segment
  for (let c = 0; c < b.w; c++) {
    let filling = false;
    for (let r = 0; r < b.h; r++) {
      const cell = cellAt(b, r, c);
      if (!cell) continue;
      if (cell.blocker) {
        filling = false;
        continue;
      }
      if (!cell.tile) filling = true;
      if (filling && !cell.tile) {
        let tile: Tile;
        if (itemsLeft.n > 0 && rng() < 0.45) {
          tile = makeTile(-3, 'none', 'item');
          itemsLeft.n--;
        } else {
          tile = makeTile(Math.floor(rng() * cfg.colors));
        }
        cell.tile = tile;
        spawnIds.push(tile.id);
      }
    }
  }

  // 4) collect drop items reaching the bottom row
  let guard = 0;
  let collectedAny = true;
  while (collectedAny && guard++ < 8) {
    collectedAny = false;
    for (let c = 0; c < b.w; c++) {
      const cell = cellAt(b, b.h - 1, c);
      if (cell?.tile?.kind === 'item') {
        collectedIds.push(cell.tile.id);
        cell.tile = null;
        collectedAny = true;
      }
    }
    if (collectedAny) {
      // settle again (straight + diagonal)
      for (let c = 0; c < b.w; c++) {
        let segBottom = -1;
        let segRows: number[] = [];
        const flush = () => {
          segBottom = -1;
          if (segRows.length === 0) return;
          let write = segRows[0];
          for (const r of segRows) {
            const cell = cellAt(b, r, c)!;
            if (cell.tile && write !== r) {
              const dest = cellAt(b, write, c)!;
              dest.tile = cell.tile;
              cell.tile = null;
            }
            write--;
          }
          segRows = [];
        };
        for (let r = b.h - 1; r >= 0; r--) {
          const cell = cellAt(b, r, c);
          if (!cell || cell.blocker) {
            flush();
            continue;
          }
          if (segBottom < 0) segBottom = r;
          segRows.push(r);
        }
        flush();
      }
      for (let pass = 0; pass < 6; pass++) {
        let moved = false;
        for (let r = 1; r < b.h; r++) {
          for (let c = 0; c < b.w; c++) {
            const cell = cellAt(b, r, c);
            if (!cell || cell.blocker || cell.tile) continue;
            for (const dc of [-1, 1]) {
              const sc = c + dc;
              if (sc < 0 || sc >= b.w) continue;
              const src = cellAt(b, r - 1, sc);
              if (!src || !src.tile || !isMovable(src.tile)) continue;
              const straightDst = cellAt(b, r, sc);
              if (straightDst && !straightDst.blocker) continue;
              cell.tile = src.tile;
              src.tile = null;
              moved = true;
              break;
            }
          }
        }
        if (!moved) break;
      }
    }
  }
  return { spawnIds, collectedIds };
}

/* ---------------- Detonation processing ---------------- */

function mostCommonColor(b: Board): number {
  const counts = new Map<number, number>();
  for (const cell of b.cells) {
    if (cell?.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0) {
      counts.set(cell.tile.color, (counts.get(cell.tile.color) ?? 0) + 1);
    }
  }
  let best = 0;
  let bestN = -1;
  for (const [col, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = col;
    }
  }
  return best;
}

function blastCellsFor(b: Board, i: number, rng: () => number): number[] {
  const tile = b.cells[i]?.tile;
  if (!tile) return [];
  const r = Math.floor(i / b.w);
  const c = i % b.w;
  const out: number[] = [];
  const push = (rr: number, cc: number) => {
    const cell = cellAt(b, rr, cc);
    if (cell) out.push(idxOf(b, rr, cc));
  };
  switch (tile.special) {
    case 'rocketH':
      for (let cc = 0; cc < b.w; cc++) push(r, cc);
      break;
    case 'rocketV':
      for (let rr = 0; rr < b.h; rr++) push(rr, c);
      break;
    case 'bomb':
      for (let rr = r - 1; rr <= r + 1; rr++)
        for (let cc = c - 1; cc <= c + 1; cc++) push(rr, cc);
      break;
    case 'rainbow': {
      const col = mostCommonColor(b);
      for (let rr = 0; rr < b.h; rr++)
        for (let cc = 0; cc < b.w; cc++)
          if (gemColor(b, rr, cc) === col) push(rr, cc);
      break;
    }
    default:
      break;
  }
  return out;
}

interface BlastState {
  clearSet: Set<number>;
  stonesHit: Set<number>;
  collectedIds: number[];
  detonations: number;
}

function runDetonations(
  b: Board,
  st: BlastState,
  queue: number[],
  processed: Set<number>,
  rng: () => number,
): void {
  while (queue.length > 0) {
    const i = queue.pop()!;
    if (processed.has(i)) continue;
    processed.add(i);
    const tile = b.cells[i]?.tile;
    if (!tile || tile.special === 'none') continue;
    st.detonations++;
    for (const j of blastCellsFor(b, i, rng)) {
      const cell = b.cells[j];
      if (!cell) continue;
      if (cell.blocker) {
        st.stonesHit.add(j);
        continue;
      }
      if (!cell.tile) continue;
      if (cell.tile.kind === 'item') {
        if (!st.collectedIds.includes(cell.tile.id)) st.collectedIds.push(cell.tile.id);
        st.clearSet.add(j);
        continue;
      }
      st.clearSet.add(j);
      if (cell.tile.special !== 'none') queue.push(j);
    }
  }
}

/* ---------------- Cascade resolution ---------------- */

interface CascadeAcc extends MoveResult {
  itemsLeft: { n: number };
}

function emptyAcc(itemsTotal: number): CascadeAcc {
  return {
    valid: true,
    frames: [],
    score: 0,
    colorsCollected: [0, 0, 0, 0, 0, 0],
    itemsCollected: 0,
    stonesDestroyed: 0,
    maxCascade: 0,
    shuffled: false,
    itemsLeft: { n: itemsTotal },
  };
}

function resolveCascade(
  startBoard: Board,
  cfg: LevelConfig,
  rng: () => number,
  acc: CascadeAcc,
  preferCell: number | null,
): void {
  let b = startBoard;
  let cascade = 1;
  for (;;) {
    const runs = findRuns(b);
    if (runs.length === 0) break;
    const groups = groupify(runs);
    const st: BlastState = {
      clearSet: new Set(),
      stonesHit: new Set(),
      collectedIds: [],
      detonations: 0,
    };
    const queue: number[] = [];
    const born: { idx: number; kind: SpecialKind }[] = [];

    for (const g of groups) {
      const kind = specialForGroup(g);
      let spawnCell: number | null = null;
      if (kind !== 'none') {
        if (preferCell !== null && g.cells.includes(preferCell)) {
          spawnCell = preferCell;
        } else {
          spawnCell = g.cells[Math.floor(g.cells.length / 2)];
        }
      }
      for (const cellIdx of g.cells) {
        const tile = b.cells[cellIdx]!.tile!;
        if (spawnCell !== null && cellIdx === spawnCell) {
          born.push({ idx: cellIdx, kind });
          continue;
        }
        st.clearSet.add(cellIdx);
        if (tile.special !== 'none') queue.push(cellIdx);
      }
    }
    runDetonations(b, st, queue, new Set(), rng);
    // matches adjacent to stones damage them
    for (const i of st.clearSet) {
      const r = Math.floor(i / b.w);
      const c = i % b.w;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const n = cellAt(b, r + dr, c + dc);
        if (n?.blocker) st.stonesHit.add(idxOf(b, r + dr, c + dc));
      }
    }

    const clearedGems = [...st.clearSet].filter((i) => {
      const t = b.cells[i]?.tile;
      return !!t && t.kind === 'gem';
    }).length;
    const points =
      clearedGems * 10 * cascade + st.detonations * 40 + born.length * 60;

    // snapshot for clear frame: specials born, others still visible
    const display = cloneBoard(b);
    for (const bornSpec of born) {
      const t = display.cells[bornSpec.idx]!.tile!;
      t.special = bornSpec.kind;
    }
    acc.frames.push({
      board: display,
      clearingIds: [...st.clearSet].map((i) => b.cells[i]!.tile!.id),
      bornIds: born.map((x) => x.idx),
      spawnIds: [],
      collectedIds: st.collectedIds,
      stonesHit: [...st.stonesHit],
      points,
      cascade,
    });

    // apply mutations on working board
    for (const bornSpec of born) {
      const cell = b.cells[bornSpec.idx]!;
      const t = cell.tile!;
      t.special = bornSpec.kind;
    }
    for (const i of st.clearSet) {
      const cell = b.cells[i]!;
      if (cell.tile?.kind === 'item') {
        acc.itemsCollected++;
      } else if (cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0) {
        acc.colorsCollected[cell.tile.color]++;
      }
      cell.tile = null;
    }
    for (const si of st.stonesHit) {
      const cell = b.cells[si]!;
      if (cell.blocker) {
        cell.blocker.hp--;
        if (cell.blocker.hp <= 0) {
          cell.blocker = null;
          acc.stonesDestroyed++;
        }
      }
    }
    acc.score += points;
    acc.maxCascade = Math.max(acc.maxCascade, cascade);

    // gravity frame
    const grav = applyGravity(b, cfg, rng, acc.itemsLeft);
    const itemPoints = grav.collectedIds.length * 100;
    acc.score += itemPoints;
    acc.itemsCollected += grav.collectedIds.length;
    acc.frames.push({
      board: cloneBoard(b),
      clearingIds: [],
      bornIds: [],
      spawnIds: grav.spawnIds,
      collectedIds: grav.collectedIds,
      stonesHit: [],
      points: itemPoints,
      cascade,
    });
    preferCell = null;
    cascade++;
  }

  // dead board → free shuffle
  if (!hasAnyMove(b, cfg.mode)) {
    shuffleGems(b, rng);
    acc.shuffled = true;
    acc.frames.push({
      board: cloneBoard(b),
      clearingIds: [],
      bornIds: [],
      spawnIds: [],
      collectedIds: [],
      stonesHit: [],
      points: 0,
      cascade: 0,
    });
  }
}

/* ---------------- Moves ---------------- */

function snapshotFrames(acc: CascadeAcc): void {
  void acc;
}

function applyBlastMove(
  board: Board,
  cfg: LevelConfig,
  rng: () => number,
  initialClear: number[],
  initialQueue: number[],
  basePoints: number,
  itemsTotal: number,
): MoveResult {
  const acc = emptyAcc(itemsTotal);
  const b = board;
  const st: BlastState = {
    clearSet: new Set(initialClear),
    stonesHit: new Set(),
    collectedIds: [],
    detonations: 0,
  };
  runDetonations(b, st, initialQueue, new Set(), rng);
  // adjacency damage for stones
  for (const i of st.clearSet) {
    const r = Math.floor(i / b.w);
    const c = i % b.w;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const n = cellAt(b, r + dr, c + dc);
      if (n?.blocker) st.stonesHit.add(idxOf(b, r + dr, c + dc));
    }
  }
  const display = cloneBoard(b);
  acc.frames.push({
    board: display,
    clearingIds: [...st.clearSet].map((i) => b.cells[i]!.tile!.id),
    bornIds: [],
    spawnIds: [],
    collectedIds: st.collectedIds,
    stonesHit: [...st.stonesHit],
    points: basePoints,
    cascade: 1,
  });
  for (const i of st.clearSet) {
    const cell = b.cells[i]!;
    if (cell.tile?.kind === 'item') acc.itemsCollected++;
    else if (cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0)
      acc.colorsCollected[cell.tile.color]++;
    cell.tile = null;
  }
  for (const si of st.stonesHit) {
    const cell = b.cells[si]!;
    if (cell.blocker) {
      cell.blocker.hp--;
      if (cell.blocker.hp <= 0) {
        cell.blocker = null;
        acc.stonesDestroyed++;
      }
    }
  }
  acc.score += basePoints + st.detonations * 40 + st.collectedIds.length * 100;
  const grav = applyGravity(b, cfg, rng, acc.itemsLeft);
  acc.score += grav.collectedIds.length * 100;
  acc.itemsCollected += grav.collectedIds.length;
  acc.frames.push({
    board: cloneBoard(b),
    clearingIds: [],
    bornIds: [],
    spawnIds: grav.spawnIds,
    collectedIds: grav.collectedIds,
    stonesHit: [],
    points: grav.collectedIds.length * 100,
    cascade: 1,
  });
  resolveCascade(b, cfg, rng, acc, null);
  snapshotFrames(acc);
  return {
    valid: true,
    frames: acc.frames,
    score: acc.score,
    colorsCollected: acc.colorsCollected,
    itemsCollected: acc.itemsCollected,
    stonesDestroyed: acc.stonesDestroyed,
    maxCascade: Math.max(acc.maxCascade, 1),
    shuffled: acc.shuffled,
  };
}

function areAdjacent(b: Board, a: number, d: number): boolean {
  const ra = Math.floor(a / b.w);
  const ca = a % b.w;
  const rd = Math.floor(d / b.w);
  const cd = d % b.w;
  return Math.abs(ra - rd) + Math.abs(ca - cd) === 1;
}

function swapTiles(b: Board, a: number, d: number): void {
  const ca = b.cells[a]!;
  const cd = b.cells[d]!;
  const t = ca.tile;
  ca.tile = cd.tile;
  cd.tile = t;
}

function createsMatchAfterSwap(board: Board, a: number, d: number): boolean {
  const b = cloneBoard(board);
  swapTiles(b, a, d);
  return findRuns(b).length > 0;
}

/** Cheap check used by UI hints and bots. */
export function swapCreatesMatch(board: Board, a: number, d: number): boolean {
  return createsMatchAfterSwap(board, a, d);
}

export function trySwap(
  board: Board,
  a: number,
  d: number,
  cfg: LevelConfig,
  rng: () => number,
): MoveResult {
  if (!areAdjacent(board, a, d)) return EMPTY_MOVE;
  const ca = board.cells[a];
  const cd = board.cells[d];
  if (!ca || !cd || !ca.tile || !cd.tile) return EMPTY_MOVE;
  if (!isMovable(ca.tile) || !isMovable(cd.tile)) return EMPTY_MOVE;

  const ta = ca.tile;
  const td = cd.tile;
  const acc = emptyAcc(cfg.items);

  // rainbow combinations
  if (ta.special === 'rainbow' || td.special === 'rainbow') {
    const b = cloneBoard(board);
    swapTiles(b, a, d);
    acc.frames.push({
      board: cloneBoard(b),
      clearingIds: [],
      bornIds: [],
      spawnIds: [],
      collectedIds: [],
      stonesHit: [],
      points: 0,
      cascade: 0,
    });
    const rIdx = ta.special === 'rainbow' ? d : a;
    const otherIdx = ta.special === 'rainbow' ? a : d;
    const other = b.cells[otherIdx]!.tile!;
    const st: BlastState = {
      clearSet: new Set([rIdx, otherIdx]),
      stonesHit: new Set(),
      collectedIds: [],
      detonations: 0,
    };
    const queue: number[] = [];
    if (other.special === 'rainbow') {
      for (let i = 0; i < b.cells.length; i++) {
        const cell = b.cells[i];
        if (cell?.tile?.kind === 'gem') {
          st.clearSet.add(i);
          if (cell.tile.special !== 'none') queue.push(i);
        }
      }
    } else if (other.special !== 'none') {
      for (const j of blastCellsFor(b, rIdx === otherIdx ? rIdx : otherIdx, rng)) {
        st.clearSet.add(j);
      }
      for (let i = 0; i < b.cells.length; i++) {
        const cell = b.cells[i];
        if (cell?.tile && cell.tile.kind === 'gem' && cell.tile.color === other.color) {
          st.clearSet.add(i);
        }
      }
      queue.push(otherIdx);
    } else {
      for (let i = 0; i < b.cells.length; i++) {
        const cell = b.cells[i];
        if (cell?.tile && cell.tile.kind === 'gem' && cell.tile.color === other.color) {
          st.clearSet.add(i);
          if (cell.tile.special !== 'none') queue.push(i);
        }
      }
    }
    runDetonations(b, st, queue, new Set(), rng);
    acc.frames.push({
      board: cloneBoard(b),
      clearingIds: [...st.clearSet].map((i) => b.cells[i]!.tile!.id),
      bornIds: [],
      spawnIds: [],
      collectedIds: st.collectedIds,
      stonesHit: [...st.stonesHit],
      points: st.clearSet.size * 15,
      cascade: 1,
    });
    for (const i of st.clearSet) {
      const cell = b.cells[i]!;
      if (cell.tile?.kind === 'item') acc.itemsCollected++;
      else if (cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0)
        acc.colorsCollected[cell.tile.color]++;
      cell.tile = null;
    }
    for (const si of st.stonesHit) {
      const cell = b.cells[si]!;
      if (cell.blocker) {
        cell.blocker.hp--;
        if (cell.blocker.hp <= 0) {
          cell.blocker = null;
          acc.stonesDestroyed++;
        }
      }
    }
    acc.score += st.clearSet.size * 15;
    const grav = applyGravity(b, cfg, rng, acc.itemsLeft);
    acc.score += grav.collectedIds.length * 100;
    acc.itemsCollected += grav.collectedIds.length;
    acc.frames.push({
      board: cloneBoard(b),
      clearingIds: [],
      bornIds: [],
      spawnIds: grav.spawnIds,
      collectedIds: grav.collectedIds,
      stonesHit: [],
      points: grav.collectedIds.length * 100,
      cascade: 1,
    });
    resolveCascade(b, cfg, rng, acc, null);
    acc.maxCascade = Math.max(acc.maxCascade, 1);
    return finalize(acc);
  }

  // special + special combos (rocket/bomb)
  if (ta.special !== 'none' && td.special !== 'none') {
    const b = cloneBoard(board);
    const r = Math.floor(d / b.w);
    const c = d % b.w;
    const initialClear: number[] = [a, d];
    if (ta.special === 'rocketH' && td.special === 'rocketH') {
      for (let cc = 0; cc < b.w; cc++) initialClear.push(idxOf(b, r, cc));
      for (let rr = 0; rr < b.h; rr++) initialClear.push(idxOf(b, rr, c));
    } else {
      for (let rr = r - 2; rr <= r + 2; rr++)
        for (let cc = c - 2; cc <= c + 2; cc++) {
          if (rr < 0 || rr >= b.h || cc < 0 || cc >= b.w) continue;
          initialClear.push(idxOf(b, rr, cc));
        }
    }
    const queue = initialClear.filter((i) => {
      const t = b.cells[i]?.tile;
      return !!t && t.special !== 'none' && i !== a && i !== d;
    });
    return applyBlastMove(b, cfg, rng, initialClear, queue, 200, cfg.items);
  }

  // normal swap
  if (!createsMatchAfterSwap(board, a, d)) return EMPTY_MOVE;
  const b = cloneBoard(board);
  swapTiles(b, a, d);
  acc.frames.push({
    board: cloneBoard(b),
    clearingIds: [],
    bornIds: [],
    spawnIds: [],
    collectedIds: [],
    stonesHit: [],
    points: 0,
    cascade: 0,
  });
  resolveCascade(b, cfg, rng, acc, d);
  return finalize(acc);
}

function finalize(acc: CascadeAcc): MoveResult {
  return {
    valid: true,
    frames: acc.frames,
    score: acc.score,
    colorsCollected: acc.colorsCollected,
    itemsCollected: acc.itemsCollected,
    stonesDestroyed: acc.stonesDestroyed,
    maxCascade: acc.maxCascade,
    shuffled: acc.shuffled,
  };
}

export function tryTap(
  board: Board,
  r: number,
  c: number,
  cfg: LevelConfig,
  rng: () => number,
): MoveResult {
  const cell = cellAt(board, r, c);
  if (!cell || !cell.tile || cell.tile.kind !== 'gem') return EMPTY_MOVE;
  const color = cell.tile.color;
  if (color < 0) return EMPTY_MOVE;
  // BFS same-color group
  const group: number[] = [];
  const seen = new Set<number>();
  const stack = [idxOf(board, r, c)];
  seen.add(idxOf(board, r, c));
  while (stack.length > 0) {
    const i = stack.pop()!;
    group.push(i);
    const rr = Math.floor(i / board.w);
    const cc = i % board.w;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = rr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= board.h || nc < 0 || nc >= board.w) continue;
      const ni = idxOf(board, nr, nc);
      if (seen.has(ni)) continue;
      const ncCell = board.cells[ni];
      if (ncCell?.tile && ncCell.tile.kind === 'gem' && ncCell.tile.color === color) {
        seen.add(ni);
        stack.push(ni);
      }
    }
  }
  if (group.length < 2) return EMPTY_MOVE;
  const b = cloneBoard(board);
  const initialClear = [...group];
  const queue: number[] = [];
  for (const i of group) {
    const t = b.cells[i]!.tile!;
    if (t.special !== 'none') queue.push(i);
  }
  if (group.length >= 5) {
    const rr = Math.floor(group[0] / b.w);
    const cc = group[0] % b.w;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = rr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= b.h || nc < 0 || nc >= b.w) continue;
        const ni = idxOf(b, nr, nc);
        if (!initialClear.includes(ni)) initialClear.push(ni);
        const t = b.cells[ni]?.tile;
        if (t && t.special !== 'none' && !queue.includes(ni)) queue.push(ni);
      }
  }
  const basePoints = group.length * 15 + (group.length >= 5 ? 100 : 0);
  return applyBlastMove(b, cfg, rng, initialClear, queue, basePoints, cfg.items);
}

/* ---------------- Boosters ---------------- */

export function hammerHit(
  board: Board,
  r: number,
  c: number,
  cfg: LevelConfig,
  rng: () => number,
): MoveResult {
  const cell = cellAt(board, r, c);
  if (!cell) return EMPTY_MOVE;
  if (cell.blocker) {
    const b = cloneBoard(board);
    const target = b.cells[idxOf(b, r, c)]!;
    target.blocker!.hp--;
    let destroyed = false;
    if (target.blocker!.hp <= 0) {
      target.blocker = null;
      destroyed = true;
    }
    const acc = emptyAcc(cfg.items);
    acc.frames.push({
      board: cloneBoard(b),
      clearingIds: [],
      bornIds: [],
      spawnIds: [],
      collectedIds: [],
      stonesHit: [idxOf(b, r, c)],
      points: 50,
      cascade: 1,
    });
    if (destroyed) acc.stonesDestroyed++;
    acc.score += 50;
    return finalize(acc);
  }
  if (!cell.tile) return EMPTY_MOVE;
  const b = cloneBoard(board);
  const i = idxOf(b, r, c);
  const t = b.cells[i]!.tile!;
  if (t.special !== 'none') {
    return applyBlastMove(b, cfg, rng, [], [i], 60, cfg.items);
  }
  return applyBlastMove(b, cfg, rng, [i], [], 60, cfg.items);
}

export function crossBlast(
  board: Board,
  r: number,
  c: number,
  cfg: LevelConfig,
  rng: () => number,
): MoveResult {
  const b = cloneBoard(board);
  const initialClear: number[] = [];
  for (let cc = 0; cc < b.w; cc++) initialClear.push(idxOf(b, r, cc));
  for (let rr = 0; rr < b.h; rr++) initialClear.push(idxOf(b, rr, c));
  const queue = initialClear.filter((i) => b.cells[i]?.tile?.special && b.cells[i]!.tile!.special !== 'none');
  return applyBlastMove(b, cfg, rng, initialClear, queue, 120, cfg.items);
}

export function bombBlast(
  board: Board,
  r: number,
  c: number,
  cfg: LevelConfig,
  rng: () => number,
): MoveResult {
  const b = cloneBoard(board);
  const initialClear: number[] = [];
  for (let rr = r - 1; rr <= r + 1; rr++)
    for (let cc = c - 1; cc <= c + 1; cc++) {
      if (rr < 0 || rr >= b.h || cc < 0 || cc >= b.w) continue;
      initialClear.push(idxOf(b, rr, cc));
    }
  const queue = initialClear.filter((i) => b.cells[i]?.tile?.special && b.cells[i]!.tile!.special !== 'none');
  return applyBlastMove(b, cfg, rng, initialClear, queue, 120, cfg.items);
}

export function shuffleBoard(
  board: Board,
  cfg: LevelConfig,
  rng: () => number,
): MoveResult {
  const b = cloneBoard(board);
  shuffleGems(b, rng);
  const acc = emptyAcc(cfg.items);
  acc.frames.push({
    board: b,
    clearingIds: [],
    bornIds: [],
    spawnIds: [],
    collectedIds: [],
    stonesHit: [],
    points: 0,
    cascade: 0,
  });
  return finalize(acc);
}

/* ---------------- Move availability / shuffle ---------------- */

export function hasAnyMove(board: Board, mode: 'swap' | 'tap'): boolean {
  if (mode === 'tap') {
    for (let r = 0; r < board.h; r++) {
      for (let c = 0; c < board.w; c++) {
        const col = gemColor(board, r, c);
        if (col < 0) continue;
        if (gemColor(board, r + 1, c) === col || gemColor(board, r, c + 1) === col) return true;
      }
    }
    return false;
  }
  for (let r = 0; r < board.h; r++) {
    for (let c = 0; c < board.w; c++) {
      const i = idxOf(board, r, c);
      const t = tileAt(board, r, c);
      if (!t || !isMovable(t)) continue;
      if (t.special === 'rainbow') {
        // any adjacent movable gem makes it usable
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const n = tileAt(board, r + dr, c + dc);
          if (n && isMovable(n)) return true;
        }
        continue;
      }
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        const nt = tileAt(board, nr, nc);
        if (!nt || !isMovable(nt)) continue;
        if (nt.special === 'rainbow') return true;
        if (createsMatchAfterSwap(board, i, idxOf(board, nr, nc))) return true;
      }
    }
  }
  return false;
}

export function shuffleGems(board: Board, rng: () => number): void {
  const positions: number[] = [];
  const tiles: Tile[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    const cell = board.cells[i];
    if (cell?.tile && cell.tile.kind === 'gem') {
      positions.push(i);
      tiles.push(cell.tile);
    }
  }
  if (positions.length < 2) return;
  let best: Tile[] | null = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const order = [...tiles];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    positions.forEach((p, k) => {
      board.cells[p]!.tile = order[k];
    });
    const runs = findRuns(board).length;
    const moves = hasAnyMove(board, 'swap');
    if (runs === 0 && moves) return;
    if (best === null) best = order;
  }
  if (best) {
    positions.forEach((p, k) => {
      board.cells[p]!.tile = best![k];
    });
  }
}
