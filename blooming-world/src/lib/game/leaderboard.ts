/* ============================================================
 * Bloom Match — global leaderboard simulation.
 * Deterministic seed: every device sees the same world of
 * players. Bots carry levels, stars and cosmetics; the local
 * player is inserted by (level, stars, score).
 * Roadmap note: with a real backend the same interface can be
 * backed by a database — the UI layer does not change.
 * ============================================================ */

import { AVATARS, FRAMES, NAME_STYLES } from './shop';
import { mulberry32 } from './engine';
import { TOTAL_LEVELS } from './levels';

export interface RankEntry {
  id: string;
  name: string;
  level: number;
  stars: number;
  avatarId: string;
  frameId: string;
  nameStyleId: string;
  nameEffectId: string | null;
  isPlayer?: boolean;
}

const NAME_A = [
  'Ирина', 'Алекс', 'Мария', 'Дмитрий', 'Софья', 'Максим', 'Алиса', 'Егор',
  'Полина', 'Артём', 'Вика', 'Никита', 'Лиза', 'Кирилл', 'Настя', 'Роман',
  'Даша', 'Влад', 'Катя', 'Олег', 'Юля', 'Саша', 'Глеб', 'Мила',
  'Luna', 'Neo', 'Kate', 'Max', 'Emma', 'Leo', 'Mia', 'Dan',
];
const NAME_B = [
  '_pro', '_2026', 'XD', '_top', ' GG', '★', '_zai', '777', '_pro2', ' Jr',
  'Queen', 'King', '™', '_ru', '_ua', '_kz', '🌸', '⚡', '🔥', '🍀',
];

function botName(rng: () => number): string {
  const a = NAME_A[Math.floor(rng() * NAME_A.length)];
  const b = rng() < 0.55 ? NAME_B[Math.floor(rng() * NAME_B.length)] : '';
  const c = rng() < 0.3 ? String(Math.floor(rng() * 900) + 100) : '';
  return `${a}${b}${c}`;
}

/** Level distribution: many beginners, a long tail of veterans (up to ~10k). */
function botLevel(rng: () => number): number {
  const u = rng();
  if (u < 0.30) return 1 + Math.floor(rng() * 30);
  if (u < 0.55) return 30 + Math.floor(rng() * 120);
  if (u < 0.75) return 150 + Math.floor(rng() * 400);
  if (u < 0.88) return 550 + Math.floor(rng() * 900);
  if (u < 0.96) return 1450 + Math.floor(rng() * 2000);
  return 3450 + Math.floor(Math.pow(rng(), 2.2) * (TOTAL_LEVELS * 99)); // veterans far beyond MVP content
}

export function generateBots(count = 520): RankEntry[] {
  const rng = mulberry32(20261107);
  const bots: RankEntry[] = [];
  for (let i = 0; i < count; i++) {
    const level = botLevel(rng);
    const stars = Math.round(level * (1.6 + rng() * 1.3));
    const avatar = AVATARS[Math.floor(rng() * AVATARS.length)];
    const frame = FRAMES[Math.floor(rng() * FRAMES.length)];
    const style = NAME_STYLES[Math.floor(rng() * NAME_STYLES.length)];
    const nameFx = rng() < 0.3 ? ['ne-glow', 'ne-rainbow', 'ne-blink', 'ne-wave', 'ne-fire', 'ne-starlight'][Math.floor(rng() * 6)] : null;
    bots.push({
      id: `bot-${i}`,
      name: botName(rng),
      level,
      stars,
      avatarId: avatar.id,
      frameId: frame.id,
      nameStyleId: style.id,
      nameEffectId: nameFx,
    });
  }
  return bots.sort((x, y) => y.level - x.level || y.stars - x.stars);
}

export function playerRankEntry(
  name: string,
  level: number,
  stars: number,
  avatarId: string,
  frameId: string,
  nameStyleId: string,
  nameEffectId: string | null,
): RankEntry {
  return {
    id: 'player',
    name: name || 'Player',
    level,
    stars,
    avatarId,
    frameId,
    nameStyleId,
    nameEffectId,
    isPlayer: true,
  };
}

export interface LeaderboardResult {
  entries: RankEntry[];
  playerPosition: number; // 1-based
  total: number;
}

export function buildLeaderboard(bots: RankEntry[], player: RankEntry): LeaderboardResult {
  const all = [...bots, player].sort(
    (x, y) => y.level - x.level || y.stars - x.stars || (x.isPlayer ? -1 : 1),
  );
  const pos = all.findIndex((e) => e.isPlayer) + 1;
  return { entries: all, playerPosition: pos, total: all.length };
}
