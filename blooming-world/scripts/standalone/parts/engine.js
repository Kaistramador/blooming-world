/* ============================================================
 * Bloom Match — match-3 engine (JS port of engine.ts, 1:1)
 * Swap-matches, cascades, specials (rocket H/V, bomb, rainbow),
 * combo swaps, stone blockers, drop items, tap-mode and boosters.
 * ============================================================ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 1;
function resetIdCounter() { nextId = 1; }
function newId() { return nextId++; }

const EMPTY_MOVE = {
  valid: false, frames: [], score: 0, colorsCollected: [],
  itemsCollected: 0, stonesDestroyed: 0, maxCascade: 0, shuffled: false,
};

function cloneBoard(b) {
  return {
    w: b.w, h: b.h,
    cells: b.cells.map((c) =>
      c ? { tile: c.tile ? Object.assign({}, c.tile) : null, blocker: c.blocker ? Object.assign({}, c.blocker) : null } : null),
  };
}
function idxOf(b, r, c) { return r * b.w + c; }
function cellAt(b, r, c) {
  if (r < 0 || r >= b.h || c < 0 || c >= b.w) return null;
  return b.cells[r * b.w + c];
}
function isOpen(b, r, c) { return cellAt(b, r, c) !== null; }
function gemColor(b, r, c) {
  const cell = cellAt(b, r, c);
  if (!cell || !cell.tile) return -1;
  const t = cell.tile;
  if (t.kind !== 'gem' || t.color < 0) return -1;
  return t.color;
}
function tileAt(b, r, c) { const cell = cellAt(b, r, c); return cell ? cell.tile : null; }
function isMovable(t) { return !!t && t.kind === 'gem'; }

function findRuns(b) {
  const runs = [];
  for (let r = 0; r < b.h; r++) {
    let c = 0;
    while (c < b.w) {
      const col = gemColor(b, r, c);
      if (col < 0) { c++; continue; }
      let e = c + 1;
      while (e < b.w && gemColor(b, r, e) === col) e++;
      if (e - c >= 3) {
        const cells = [];
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
      if (col < 0) { r++; continue; }
      let e = r + 1;
      while (e < b.h && gemColor(b, e, c) === col) e++;
      if (e - r >= 3) {
        const cells = [];
        for (let k = r; k < e; k++) cells.push(idxOf(b, k, c));
        runs.push({ cells, dir: 'v' });
      }
      r = e;
    }
  }
  return runs;
}

function groupify(runs) {
  const parent = new Map();
  const find = (x) => {
    let p = parent.get(x);
    if (p === undefined) { parent.set(x, x); p = x; }
    while (p !== parent.get(p)) p = parent.get(p);
    return p;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const run of runs) {
    for (const cell of run.cells) find(cell);
    for (let i = 1; i < run.cells.length; i++) union(run.cells[i - 1], run.cells[i]);
  }
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      for (const a of runs[i].cells) {
        if (runs[j].cells.includes(a)) { union(runs[i].cells[0], runs[j].cells[0]); break; }
      }
    }
  }
  const groups = new Map();
  for (const run of runs) {
    for (const cell of run.cells) {
      const root = find(cell);
      let g = groups.get(root);
      if (!g) { g = { cells: [], maxH: 0, maxV: 0, hasH: false, hasV: false }; groups.set(root, g); }
      if (!g.cells.includes(cell)) g.cells.push(cell);
      const len = run.cells.length;
      if (run.dir === 'h') { g.hasH = true; g.maxH = Math.max(g.maxH, len); }
      else { g.hasV = true; g.maxV = Math.max(g.maxV, len); }
    }
  }
  return [...groups.values()];
}

function specialForGroup(g) {
  if (g.maxH >= 5 || g.maxV >= 5) return 'rainbow';
  if (g.hasH && g.hasV) return 'bomb';
  if (g.maxH === 4) return 'rocketH';
  if (g.maxV === 4) return 'rocketV';
  return 'none';
}

function makeTile(color, special, kind) {
  return { id: newId(), color, special: special || 'none', kind: kind || 'gem' };
}

function createBoard(cfg, rng) {
  resetIdCounter();
  const total = cfg.w * cfg.h;
  const cells = [];
  for (let i = 0; i < total; i++) cells.push(cfg.voids.includes(i) ? null : { tile: null, blocker: null });
  for (const s of cfg.stones) {
    if (cells[s.idx]) cells[s.idx] = { tile: null, blocker: { type: 'stone', hp: s.hp } };
  }
  const board = { w: cfg.w, h: cfg.h, cells };
  for (let r = 0; r < cfg.h; r++) {
    for (let c = 0; c < cfg.w; c++) {
      const cell = cellAt(board, r, c);
      if (!cell || cell.blocker) continue;
      const forbidden = new Set();
      const l1 = gemColor(board, r, c - 1), l2 = gemColor(board, r, c - 2);
      if (l1 >= 0 && l1 === l2) forbidden.add(l1);
      const u1 = gemColor(board, r - 1, c), u2 = gemColor(board, r - 2, c);
      if (u1 >= 0 && u1 === u2) forbidden.add(u1);
      let col = Math.floor(rng() * cfg.colors);
      let guard = 0;
      while (forbidden.has(col) && guard++ < 20) col = Math.floor(rng() * cfg.colors);
      cell.tile = makeTile(col);
    }
  }
  let tries = 0;
  while (!hasAnyMove(board, cfg.mode) && tries++ < 25) shuffleGems(board, rng);
  return board;
}

function compactColumns(b) {
  for (let c = 0; c < b.w; c++) {
    let segRows = [];
    const flush = () => {
      if (segRows.length === 0) return;
      let write = segRows[0];
      for (const r of segRows) {
        const cell = cellAt(b, r, c);
        if (cell.tile && write !== r) {
          const dest = cellAt(b, write, c);
          dest.tile = cell.tile;
          cell.tile = null;
        }
        write--;
      }
      segRows = [];
    };
    for (let r = b.h - 1; r >= 0; r--) {
      const cell = cellAt(b, r, c);
      if (!cell || cell.blocker) { flush(); continue; }
      segRows.push(r);
    }
    flush();
  }
}

function diagonalSlides(b, maxPass) {
  for (let pass = 0; pass < (maxPass || 12); pass++) {
    let moved = false;
    for (let r = 1; r < b.h; r++) {
      for (let c = 0; c < b.w; c++) {
        const cell = cellAt(b, r, c);
        if (!cell || cell.blocker || cell.tile) continue;
        const belowOpen = (cc) => {
          const bc = cellAt(b, r, cc);
          return !!bc && !bc.blocker;
        };
        for (const dc of [-1, 1]) {
          const sc = c + dc;
          if (sc < 0 || sc >= b.w) continue;
          const src = cellAt(b, r - 1, sc);
          if (!src || !src.tile || !isMovable(src.tile)) continue;
          if (belowOpen(sc)) continue;
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

function applyGravity(b, cfg, rng, itemsLeft) {
  const spawnIds = [];
  const collectedIds = [];
  // 1) straight compaction inside segments
  compactColumns(b);
  // 2) diagonal slides
  diagonalSlides(b, 12);
  // 3) refill top empty stretches
  for (let c = 0; c < b.w; c++) {
    let filling = false;
    for (let r = 0; r < b.h; r++) {
      const cell = cellAt(b, r, c);
      if (!cell) continue;
      if (cell.blocker) { filling = false; continue; }
      if (!cell.tile) filling = true;
      if (filling && !cell.tile) {
        let tile;
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
      if (cell && cell.tile && cell.tile.kind === 'item') {
        collectedIds.push(cell.tile.id);
        cell.tile = null;
        collectedAny = true;
      }
    }
    if (collectedAny) {
      compactColumns(b);
      diagonalSlides(b, 6);
    }
  }
  return { spawnIds, collectedIds };
}

function mostCommonColor(b) {
  const counts = new Map();
  for (const cell of b.cells) {
    if (cell && cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0) {
      counts.set(cell.tile.color, (counts.get(cell.tile.color) || 0) + 1);
    }
  }
  let best = 0, bestN = -1;
  for (const [col, n] of counts) {
    if (n > bestN) { bestN = n; best = col; }
  }
  return best;
}

function blastCellsFor(b, i) {
  const tile = b.cells[i] ? b.cells[i].tile : null;
  if (!tile) return [];
  const r = Math.floor(i / b.w);
  const c = i % b.w;
  const out = [];
  const push = (rr, cc) => {
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
    default: break;
  }
  return out;
}

function runDetonations(b, st, queue, processed) {
  while (queue.length > 0) {
    const i = queue.pop();
    if (processed.has(i)) continue;
    processed.add(i);
    const tile = b.cells[i] ? b.cells[i].tile : null;
    if (!tile || tile.special === 'none') continue;
    st.detonations++;
    for (const j of blastCellsFor(b, i)) {
      const cell = b.cells[j];
      if (!cell) continue;
      if (cell.blocker) { st.stonesHit.add(j); continue; }
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

function emptyAcc(itemsTotal) {
  return {
    valid: true, frames: [], score: 0, colorsCollected: [0, 0, 0, 0, 0, 0],
    itemsCollected: 0, stonesDestroyed: 0, maxCascade: 0, shuffled: false,
    itemsLeft: { n: itemsTotal },
  };
}

function hitAdjacentStones(b, st, clearSet) {
  for (const i of clearSet) {
    const r = Math.floor(i / b.w);
    const c = i % b.w;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const n = cellAt(b, r + dr, c + dc);
      if (n && n.blocker) st.stonesHit.add(idxOf(b, r + dr, c + dc));
    }
  }
}

function resolveCascade(startBoard, cfg, rng, acc, preferCell) {
  let b = startBoard;
  let cascade = 1;
  for (;;) {
    const runs = findRuns(b);
    if (runs.length === 0) break;
    const groups = groupify(runs);
    const st = { clearSet: new Set(), stonesHit: new Set(), collectedIds: [], detonations: 0 };
    const queue = [];
    const born = [];
    for (const g of groups) {
      const kind = specialForGroup(g);
      let spawnCell = null;
      if (kind !== 'none') {
        if (preferCell !== null && preferCell !== undefined && g.cells.includes(preferCell)) spawnCell = preferCell;
        else spawnCell = g.cells[Math.floor(g.cells.length / 2)];
      }
      for (const cellIdx of g.cells) {
        const tile = b.cells[cellIdx].tile;
        if (spawnCell !== null && cellIdx === spawnCell) { born.push({ idx: cellIdx, kind }); continue; }
        st.clearSet.add(cellIdx);
        if (tile.special !== 'none') queue.push(cellIdx);
      }
    }
    runDetonations(b, st, queue, new Set());
    hitAdjacentStones(b, st, st.clearSet);
    const clearedGems = [...st.clearSet].filter((i) => {
      const t = b.cells[i] ? b.cells[i].tile : null;
      return !!t && t.kind === 'gem';
    }).length;
    const points = clearedGems * 10 * cascade + st.detonations * 40 + born.length * 60;
    const display = cloneBoard(b);
    for (const bornSpec of born) {
      const t = display.cells[bornSpec.idx].tile;
      t.special = bornSpec.kind;
    }
    acc.frames.push({
      board: display,
      clearingIds: [...st.clearSet].map((i) => b.cells[i].tile.id),
      bornIds: born.map((x) => x.idx),
      spawnIds: [],
      collectedIds: st.collectedIds,
      stonesHit: [...st.stonesHit],
      points, cascade,
    });
    for (const bornSpec of born) {
      const cell = b.cells[bornSpec.idx];
      cell.tile.special = bornSpec.kind;
    }
    for (const i of st.clearSet) {
      const cell = b.cells[i];
      if (cell.tile && cell.tile.kind === 'item') acc.itemsCollected++;
      else if (cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0) acc.colorsCollected[cell.tile.color]++;
      cell.tile = null;
    }
    for (const si of st.stonesHit) {
      const cell = b.cells[si];
      if (cell.blocker) {
        cell.blocker.hp--;
        if (cell.blocker.hp <= 0) { cell.blocker = null; acc.stonesDestroyed++; }
      }
    }
    acc.score += points;
    acc.maxCascade = Math.max(acc.maxCascade, cascade);
    const grav = applyGravity(b, cfg, rng, acc.itemsLeft);
    const itemPoints = grav.collectedIds.length * 100;
    acc.score += itemPoints;
    acc.itemsCollected += grav.collectedIds.length;
    acc.frames.push({
      board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: grav.spawnIds,
      collectedIds: grav.collectedIds, stonesHit: [], points: itemPoints, cascade,
    });
    preferCell = null;
    cascade++;
  }
  if (!hasAnyMove(b, cfg.mode)) {
    shuffleGems(b, rng);
    acc.shuffled = true;
    acc.frames.push({
      board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: [],
      collectedIds: [], stonesHit: [], points: 0, cascade: 0,
    });
  }
}

function applyBlastMove(board, cfg, rng, initialClear, initialQueue, basePoints, itemsTotal) {
  const acc = emptyAcc(itemsTotal);
  const b = board;
  const st = { clearSet: new Set(initialClear), stonesHit: new Set(), collectedIds: [], detonations: 0 };
  runDetonations(b, st, initialQueue, new Set());
  hitAdjacentStones(b, st, st.clearSet);
  const display = cloneBoard(b);
  acc.frames.push({
    board: display,
    clearingIds: [...st.clearSet].map((i) => b.cells[i].tile.id),
    bornIds: [], spawnIds: [], collectedIds: st.collectedIds,
    stonesHit: [...st.stonesHit], points: basePoints, cascade: 1,
  });
  for (const i of st.clearSet) {
    const cell = b.cells[i];
    if (cell.tile && cell.tile.kind === 'item') acc.itemsCollected++;
    else if (cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0) acc.colorsCollected[cell.tile.color]++;
    cell.tile = null;
  }
  for (const si of st.stonesHit) {
    const cell = b.cells[si];
    if (cell.blocker) {
      cell.blocker.hp--;
      if (cell.blocker.hp <= 0) { cell.blocker = null; acc.stonesDestroyed++; }
    }
  }
  acc.score += basePoints + st.detonations * 40 + st.collectedIds.length * 100;
  const grav = applyGravity(b, cfg, rng, acc.itemsLeft);
  acc.score += grav.collectedIds.length * 100;
  acc.itemsCollected += grav.collectedIds.length;
  acc.frames.push({
    board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: grav.spawnIds,
    collectedIds: grav.collectedIds, stonesHit: [], points: grav.collectedIds.length * 100, cascade: 1,
  });
  resolveCascade(b, cfg, rng, acc, null);
  return {
    valid: true, frames: acc.frames, score: acc.score, colorsCollected: acc.colorsCollected,
    itemsCollected: acc.itemsCollected, stonesDestroyed: acc.stonesDestroyed,
    maxCascade: Math.max(acc.maxCascade, 1), shuffled: acc.shuffled,
  };
}

function areAdjacent(b, a, d) {
  const ra = Math.floor(a / b.w), ca = a % b.w;
  const rd = Math.floor(d / b.w), cd = d % b.w;
  return Math.abs(ra - rd) + Math.abs(ca - cd) === 1;
}
function swapTiles(b, a, d) {
  const ca = b.cells[a], cd = b.cells[d];
  const t = ca.tile;
  ca.tile = cd.tile;
  cd.tile = t;
}
function createsMatchAfterSwap(board, a, d) {
  const b = cloneBoard(board);
  swapTiles(b, a, d);
  return findRuns(b).length > 0;
}
function swapCreatesMatch(board, a, d) { return createsMatchAfterSwap(board, a, d); }

function trySwap(board, a, d, cfg, rng) {
  if (!areAdjacent(board, a, d)) return EMPTY_MOVE;
  const ca = board.cells[a], cd = board.cells[d];
  if (!ca || !cd || !ca.tile || !cd.tile) return EMPTY_MOVE;
  if (!isMovable(ca.tile) || !isMovable(cd.tile)) return EMPTY_MOVE;

  const ta = ca.tile, td = cd.tile;
  const acc = emptyAcc(cfg.items);

  // rainbow combinations
  if (ta.special === 'rainbow' || td.special === 'rainbow') {
    const b = cloneBoard(board);
    swapTiles(b, a, d);
    acc.frames.push({ board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: [], collectedIds: [], stonesHit: [], points: 0, cascade: 0 });
    const rIdx = ta.special === 'rainbow' ? d : a;
    const otherIdx = ta.special === 'rainbow' ? a : d;
    const other = b.cells[otherIdx].tile;
    const st = { clearSet: new Set([rIdx, otherIdx]), stonesHit: new Set(), collectedIds: [], detonations: 0 };
    const queue = [];
    if (other.special === 'rainbow') {
      for (let i = 0; i < b.cells.length; i++) {
        const cell = b.cells[i];
        if (cell && cell.tile && cell.tile.kind === 'gem') {
          st.clearSet.add(i);
          if (cell.tile.special !== 'none') queue.push(i);
        }
      }
    } else if (other.special !== 'none') {
      for (const j of blastCellsFor(b, otherIdx)) st.clearSet.add(j);
      for (let i = 0; i < b.cells.length; i++) {
        const cell = b.cells[i];
        if (cell && cell.tile && cell.tile.kind === 'gem' && cell.tile.color === other.color) st.clearSet.add(i);
      }
      queue.push(otherIdx);
    } else {
      for (let i = 0; i < b.cells.length; i++) {
        const cell = b.cells[i];
        if (cell && cell.tile && cell.tile.kind === 'gem' && cell.tile.color === other.color) {
          st.clearSet.add(i);
          if (cell.tile.special !== 'none') queue.push(i);
        }
      }
    }
    runDetonations(b, st, queue, new Set());
    acc.frames.push({
      board: cloneBoard(b), clearingIds: [...st.clearSet].map((i) => b.cells[i].tile.id),
      bornIds: [], spawnIds: [], collectedIds: st.collectedIds, stonesHit: [...st.stonesHit],
      points: st.clearSet.size * 15, cascade: 1,
    });
    for (const i of st.clearSet) {
      const cell = b.cells[i];
      if (cell.tile && cell.tile.kind === 'item') acc.itemsCollected++;
      else if (cell.tile && cell.tile.kind === 'gem' && cell.tile.color >= 0) acc.colorsCollected[cell.tile.color]++;
      cell.tile = null;
    }
    for (const si of st.stonesHit) {
      const cell = b.cells[si];
      if (cell.blocker) {
        cell.blocker.hp--;
        if (cell.blocker.hp <= 0) { cell.blocker = null; acc.stonesDestroyed++; }
      }
    }
    acc.score += st.clearSet.size * 15;
    const grav = applyGravity(b, cfg, rng, acc.itemsLeft);
    acc.score += grav.collectedIds.length * 100;
    acc.itemsCollected += grav.collectedIds.length;
    acc.frames.push({
      board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: grav.spawnIds,
      collectedIds: grav.collectedIds, stonesHit: [], points: grav.collectedIds.length * 100, cascade: 1,
    });
    resolveCascade(b, cfg, rng, acc, null);
    acc.maxCascade = Math.max(acc.maxCascade, 1);
    return finalize(acc);
  }

  // special + special combos
  if (ta.special !== 'none' && td.special !== 'none') {
    const b = cloneBoard(board);
    const r = Math.floor(d / b.w);
    const c = d % b.w;
    const initialClear = [a, d];
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
      const t = b.cells[i] ? b.cells[i].tile : null;
      return !!t && t.special !== 'none' && i !== a && i !== d;
    });
    return applyBlastMove(b, cfg, rng, initialClear, queue, 200, cfg.items);
  }

  // normal swap
  if (!createsMatchAfterSwap(board, a, d)) return EMPTY_MOVE;
  const b = cloneBoard(board);
  swapTiles(b, a, d);
  acc.frames.push({ board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: [], collectedIds: [], stonesHit: [], points: 0, cascade: 0 });
  resolveCascade(b, cfg, rng, acc, d);
  return finalize(acc);
}

function finalize(acc) {
  return {
    valid: true, frames: acc.frames, score: acc.score, colorsCollected: acc.colorsCollected,
    itemsCollected: acc.itemsCollected, stonesDestroyed: acc.stonesDestroyed,
    maxCascade: acc.maxCascade, shuffled: acc.shuffled,
  };
}

function tryTap(board, r, c, cfg, rng) {
  const cell = cellAt(board, r, c);
  if (!cell || !cell.tile || cell.tile.kind !== 'gem') return EMPTY_MOVE;
  const color = cell.tile.color;
  if (color < 0) return EMPTY_MOVE;
  const group = [];
  const seen = new Set();
  const stack = [idxOf(board, r, c)];
  seen.add(idxOf(board, r, c));
  while (stack.length > 0) {
    const i = stack.pop();
    group.push(i);
    const rr = Math.floor(i / board.w), cc = i % board.w;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = rr + dr, nc = cc + dc;
      if (nr < 0 || nr >= board.h || nc < 0 || nc >= board.w) continue;
      const ni = idxOf(board, nr, nc);
      if (seen.has(ni)) continue;
      const nCell = board.cells[ni];
      if (nCell && nCell.tile && nCell.tile.kind === 'gem' && nCell.tile.color === color) {
        seen.add(ni);
        stack.push(ni);
      }
    }
  }
  if (group.length < 2) return EMPTY_MOVE;
  const b = cloneBoard(board);
  const initialClear = [...group];
  const queue = [];
  for (const i of group) {
    const t = b.cells[i].tile;
    if (t.special !== 'none') queue.push(i);
  }
  if (group.length >= 5) {
    const rr = Math.floor(group[0] / b.w), cc = group[0] % b.w;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = rr + dr, nc = cc + dc;
        if (nr < 0 || nr >= b.h || nc < 0 || nc >= b.w) continue;
        const ni = idxOf(b, nr, nc);
        if (!initialClear.includes(ni)) initialClear.push(ni);
        const t = b.cells[ni] ? b.cells[ni].tile : null;
        if (t && t.special !== 'none' && !queue.includes(ni)) queue.push(ni);
      }
  }
  const basePoints = group.length * 15 + (group.length >= 5 ? 100 : 0);
  return applyBlastMove(b, cfg, rng, initialClear, queue, basePoints, cfg.items);
}

/* ---------------- Boosters ---------------- */
function hammerHit(board, r, c, cfg, rng) {
  const cell = cellAt(board, r, c);
  if (!cell) return EMPTY_MOVE;
  if (cell.blocker) {
    const b = cloneBoard(board);
    const target = b.cells[idxOf(b, r, c)];
    target.blocker.hp--;
    let destroyed = false;
    if (target.blocker.hp <= 0) { target.blocker = null; destroyed = true; }
    const acc = emptyAcc(cfg.items);
    acc.frames.push({
      board: cloneBoard(b), clearingIds: [], bornIds: [], spawnIds: [],
      collectedIds: [], stonesHit: [idxOf(b, r, c)], points: 50, cascade: 1,
    });
    if (destroyed) acc.stonesDestroyed++;
    acc.score += 50;
    return finalize(acc);
  }
  if (!cell.tile) return EMPTY_MOVE;
  const b = cloneBoard(board);
  const i = idxOf(b, r, c);
  const t = b.cells[i].tile;
  if (t.special !== 'none') return applyBlastMove(b, cfg, rng, [], [i], 60, cfg.items);
  return applyBlastMove(b, cfg, rng, [i], [], 60, cfg.items);
}

function crossBlast(board, r, c, cfg, rng) {
  const b = cloneBoard(board);
  const initialClear = [];
  for (let cc = 0; cc < b.w; cc++) initialClear.push(idxOf(b, r, cc));
  for (let rr = 0; rr < b.h; rr++) initialClear.push(idxOf(b, rr, c));
  const queue = initialClear.filter((i) => {
    const t = b.cells[i] ? b.cells[i].tile : null;
    return !!t && t.special !== 'none';
  });
  return applyBlastMove(b, cfg, rng, initialClear, queue, 120, cfg.items);
}

function bombBlast(board, r, c, cfg, rng) {
  const b = cloneBoard(board);
  const initialClear = [];
  for (let rr = r - 1; rr <= r + 1; rr++)
    for (let cc = c - 1; cc <= c + 1; cc++) {
      if (rr < 0 || rr >= b.h || cc < 0 || cc >= b.w) continue;
      initialClear.push(idxOf(b, rr, cc));
    }
  const queue = initialClear.filter((i) => {
    const t = b.cells[i] ? b.cells[i].tile : null;
    return !!t && t.special !== 'none';
  });
  return applyBlastMove(b, cfg, rng, initialClear, queue, 120, cfg.items);
}

function shuffleBoard(board, cfg, rng) {
  const b = cloneBoard(board);
  shuffleGems(b, rng);
  const acc = emptyAcc(cfg.items);
  acc.frames.push({ board: b, clearingIds: [], bornIds: [], spawnIds: [], collectedIds: [], stonesHit: [], points: 0, cascade: 0 });
  return finalize(acc);
}

/* ---------------- Move availability / shuffle ---------------- */
function hasAnyMove(board, mode) {
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
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const n = tileAt(board, r + dr, c + dc);
          if (n && isMovable(n)) return true;
        }
        continue;
      }
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr, nc = c + dc;
        const nt = tileAt(board, nr, nc);
        if (!nt || !isMovable(nt)) continue;
        if (nt.special === 'rainbow') return true;
        if (createsMatchAfterSwap(board, i, idxOf(board, nr, nc))) return true;
      }
    }
  }
  return false;
}

function shuffleGems(board, rng) {
  const positions = [];
  const tiles = [];
  for (let i = 0; i < board.cells.length; i++) {
    const cell = board.cells[i];
    if (cell && cell.tile && cell.tile.kind === 'gem') {
      positions.push(i);
      tiles.push(cell.tile);
    }
  }
  if (positions.length < 2) return;
  let best = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const order = [...tiles];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    positions.forEach((p, k) => { board.cells[p].tile = order[k]; });
    const runs = findRuns(board).length;
    const moves = hasAnyMove(board, 'swap');
    if (runs === 0 && moves) return;
    if (best === null) best = order;
  }
  if (best) {
    positions.forEach((p, k) => { board.cells[p].tile = best[k]; });
  }
}
