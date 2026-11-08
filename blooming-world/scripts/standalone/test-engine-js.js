/* Smoke test for the standalone JS engine port (node).
 * Mirrors scripts/test-engine.ts scenarios. */
require("./parts/data.js");
require("./parts/engine.js");

function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; }
  else console.log("ok:", msg);
}

// level 1 (swap, 4 colors, 7x7)
const cfg1 = getLevelConfig(1);
assert(cfg1.w === 7 && cfg1.h === 7 && cfg1.colors === 4, "L1 7x7 4 colors");
assert(cfg1.mode === "swap", "L1 swap mode");
assert(Array.isArray(cfg1.goals) && cfg1.goals.length >= 1, "L1 has goals");

const b1 = createBoard(cfg1, mulberry32(42));
assert(b1.cells.length === 49, "L1 board 49 cells");
assert(findRuns(b1).length === 0, "L1 board starts without runs");
assert(hasAnyMove(b1, "swap"), "L1 board has a move");

// find a valid swap & play it
let played = null;
outer:
for (let r = 0; r < b1.h; r++) {
  for (let c = 0; c < b1.w; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const i = idxOf(b1, r, c);
      const j = idxOf(b1, r + dr, c + dc);
      if (swapCreatesMatch(b1, i, j)) { played = [i, j]; break outer; }
    }
  }
}
assert(!!played, "found a match swap");
const res = trySwap(b1, played[0], played[1], cfg1, mulberry32(7));
assert(res.valid && res.frames.length >= 2, "swap valid with >=2 frames");
assert(res.score > 0, "swap scored > 0: " + res.score);
assert(findRuns(b1).length === 0, "board settled without runs after swap");

// tap mode boss (level 10)
const cfg10 = getLevelConfig(10);
assert(cfg10.mode === "tap", "L10 is tap boss");
const b10 = createBoard(cfg10, mulberry32(99));
let tapDone = false;
for (let r = 0; r < b10.h && !tapDone; r++) {
  for (let c = 0; c < b10.w && !tapDone; c++) {
    const cell = cellAt(b10, r, c);
    if (cell && cell.tile && cell.tile.kind === "gem") {
      const r2 = tryTap(b10, r, c, cfg10, mulberry32(5));
      if (r2.valid) tapDone = true;
    }
  }
}
assert(tapDone, "tap move valid on boss level");

// stones on level 25 (chapter 3)
const cfg25 = getLevelConfig(25);
assert(cfg25.stones.length > 0, "L25 has stones: " + cfg25.stones.length);
const b25 = createBoard(cfg25, mulberry32(11));
const stIdx = cfg25.stones[0].idx;
assert(b25.cells[stIdx].blocker && b25.cells[stIdx].blocker.hp >= 1, "stone blocker present");

// boosters
const bH = createBoard(cfg1, mulberry32(3));
const cell0 = bH.cells.findIndex((c) => c && c.tile && c.tile.kind === "gem");
const rr = Math.floor(cell0 / bH.w), cc = cell0 % bH.w;
const rH = hammerHit(bH, rr, cc, cfg1, mulberry32(1));
assert(rH.valid && rH.score >= 60, "hammer works: score " + rH.score);
const rC = crossBlast(bH, 3, 3, cfg1, mulberry32(2));
assert(rC.valid, "cross blast works");
const rB = bombBlast(bH, 3, 3, cfg1, mulberry32(4));
assert(rB.valid, "bomb blast works");
const rS = shuffleBoard(bH, cfg1, mulberry32(6));
assert(rS.valid && rS.frames.length === 1, "shuffle works");

// level configs sanity across all 100
let ok = true;
for (let lv = 1; lv <= 100; lv++) {
  const c = getLevelConfig(lv);
  if (!c.goals.length || c.moves < 22 || c.w < 7) ok = false;
  const total = c.w * c.h;
  for (const s of c.stones) if (s.idx < 0 || s.idx >= total) ok = false;
  for (const v of c.voids) if (v < 0 || v >= total) ok = false;
}
assert(ok, "all 100 level configs sane");

// determinism of level generator
const a = getLevelConfig(37), b = getLevelConfig(37);
assert(JSON.stringify(a) === JSON.stringify(b), "generator deterministic");

console.log(process.exitCode ? "TESTS FAILED" : "ALL TESTS PASSED");
