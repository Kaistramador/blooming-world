/* ============================================================
 * Bloom Match — deterministic level generator (100 levels / 10
 * chapters). Fully formula-driven: raising TOTAL_LEVELS scales
 * the whole game (roadmap: 10 000 levels).
 * ============================================================ */

import type { Goal, LevelConfig } from './types';
import { mulberry32 } from './engine';

export const TOTAL_LEVELS = 100;
export const CHAPTER_SIZE = 10;
export const TOTAL_CHAPTERS = TOTAL_LEVELS / CHAPTER_SIZE;

export function chapterOfLevel(level: number): number {
  return Math.min(TOTAL_CHAPTERS - 1, Math.floor((level - 1) / CHAPTER_SIZE));
}

interface StoneSpec {
  idx: number;
  hp: number;
}

function generateStones(
  rng: () => number,
  w: number,
  h: number,
  count: number,
  maxHp: number,
  avoidBottomRows: number,
): StoneSpec[] {
  const stones: StoneSpec[] = [];
  const used = new Set<number>();
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

export function getLevelConfig(level: number): LevelConfig {
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

  // stones: appear from chapter 3 (levels 21+), scale up
  let stones: StoneSpec[] = [];
  if (!isBoss && chapter >= 2) {
    const base = Math.min(18, 4 + (chapter - 2) * 3);
    const extra = lv % 7 === 0 ? 6 : 0;
    const maxHp = lv >= 45 ? 2 : 1;
    stones = generateStones(rng, w, h, base + extra, maxHp, 2);
  } else if (isBoss && chapter >= 4) {
    stones = generateStones(rng, w, h, Math.min(10, chapter - 2), 1, 2);
  }

  // drop items ("blossom buds") from chapter 4, every ~8th level
  const isItemLevel = !isBoss && chapter >= 3 && lv % 8 === 5;
  const items = isItemLevel ? 2 + Math.floor(chapter / 2) : 0;
  if (isItemLevel) {
    // keep the bottom clear so items can be collected
    stones = stones.filter((s) => Math.floor(s.idx / w) < h - 1);
  }

  // small voids for flavour from chapter 5 (never in bosses)
  const voids: number[] = [];
  if (!isBoss && chapter >= 4) {
    const voidCount = Math.min(8, 2 + (chapter - 4));
    let guard = 0;
    while (voids.length < voidCount && guard++ < 100) {
      const r = Math.floor(rng() * h);
      const c = Math.floor(rng() * w);
      // keep corners playable-ish: avoid outer ring? just avoid bottom row
      if (r === h - 1) continue;
      const i = r * w + c;
      if (stones.some((s) => s.idx === i)) continue;
      if (!voids.includes(i)) voids.push(i);
    }
  }

  // goals
  const goals: Goal[] = [];
  // calibrated against greedy-bot simulation: score/move falls with
  // board complexity, so per-move target grows slowly (42 + ch*3)
  const targetScore = Math.round(
    moves * (isBoss ? 30 + chapter * 2 : 42 + chapter * 3),
  );
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

  return {
    level: lv,
    chapter,
    w,
    h,
    colors,
    moves,
    mode: isBoss ? 'tap' : 'swap',
    goals,
    stones,
    voids,
    items,
    targetScore,
    star2: target2,
    star3: target3,
  };
}
