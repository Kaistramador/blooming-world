/* ============================================================
 * Bloom Match — core game types (pure TS, no DOM deps)
 * Portable to React Native later: keep this layer framework-free.
 * ============================================================ */

export type SpecialKind = 'none' | 'rocketH' | 'rocketV' | 'bomb' | 'rainbow';
export type TileKind = 'gem' | 'item';

export interface Tile {
  id: number;
  /** 0..5 = gem color index; -1 = rainbow (colorless); -3 = drop item */
  color: number;
  special: SpecialKind;
  kind: TileKind;
}

export interface Blocker {
  type: 'stone';
  hp: number;
}

export interface Cell {
  tile: Tile | null;
  blocker: Blocker | null;
}

/** null cell = void (outside the playfield) */
export type BoardCell = Cell | null;

export interface Board {
  w: number;
  h: number;
  cells: BoardCell[];
}

export type Goal =
  | { type: 'score'; count: number }
  | { type: 'collect'; color: number; count: number }
  | { type: 'item'; count: number }
  | { type: 'stone'; count: number };

export interface LevelConfig {
  level: number;          // 1-based
  chapter: number;        // 0..9
  w: number;
  h: number;
  colors: number;
  moves: number;
  mode: 'swap' | 'tap';
  goals: Goal[];
  stones: { idx: number; hp: number }[];
  voids: number[];
  items: number;          // total drop items to spawn (0 = none)
  targetScore: number;
  star2: number;
  star3: number;
}

/** One animation frame of a move resolution. UI plays frames in order. */
export interface Frame {
  board: Board;
  clearingIds: number[];    // tiles that pop (still present on board)
  bornIds: number[];        // specials just created
  spawnIds: number[];       // newly refilled tiles (fall-in animation)
  collectedIds: number[];   // drop items collected (fly-out)
  stonesHit: number[];      // cell indices of stones damaged
  points: number;
  cascade: number;
}

export interface MoveResult {
  valid: boolean;
  frames: Frame[];
  score: number;
  colorsCollected: number[]; // index by color
  itemsCollected: number;
  stonesDestroyed: number;
  maxCascade: number;
  shuffled: boolean;
}

export const EMPTY_MOVE: MoveResult = {
  valid: false,
  frames: [],
  score: 0,
  colorsCollected: [],
  itemsCollected: 0,
  stonesDestroyed: 0,
  maxCascade: 0,
  shuffled: false,
};
