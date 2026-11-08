/* ============================================================
 * Bloom Match — global player state (zustand + localStorage).
 * ============================================================ */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '@/lib/i18n';
import { translate } from '@/lib/i18n';
import type { BoosterId } from '@/lib/game/shop';
import { BOOSTER_MAP } from '@/lib/game/shop';
import { setSoundEnabled } from '@/lib/game/sound';
import { chapterOfLevel, TOTAL_LEVELS } from '@/lib/game/levels';

export interface Owned {
  skins: string[];
  avatars: string[];
  frames: string[];
  nameStyles: string[];
  effects: string[];
}

export interface Equipped {
  skin: string;
  avatar: string;
  frame: string;
  nameStyle: string;
  tileEffect: string;
  avatarEffect: string;
  nameEffect: string;
}

export interface PlayerStats {
  wins: number;
  bestCascade: number;
  totalScore: number;
  movesMade: number;
  bestStreak: number;
}

/**
 * Волна 2: множитель награды за серию побед (win-streak).
 * Серия = число побед подряд; множитель = min(5, серия), но не меньше 1.
 * Поражение обнуляет серию (клон механики top-игр жанра, +50% D1).
 */
export const STREAK_MAX_MULT = 5;

export function streakMult(streak: number): number {
  return Math.max(1, Math.min(STREAK_MAX_MULT, streak));
}

interface PlayerState {
  name: string;
  lang: Lang;
  sound: boolean;
  coins: number;
  stars: Record<number, number>;
  scores: Record<number, number>;
  boosters: Record<BoosterId, number>;
  owned: Owned;
  equipped: Equipped;
  stats: PlayerStats;
  /** текущая серия побед подряд (обнуляется поражением) */
  streak: number;
  // actions
  setLang: (l: Lang) => void;
  setSound: (v: boolean) => void;
  setName: (n: string) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  recordWin: (level: number, stars: number, score: number, maxCascade: number, movesUsed: number) => { firstClear: boolean; newStars: boolean; reward: number; base: number; streak: number; mult: number };
  recordLoss: () => void;
  addBooster: (id: BoosterId, n: number) => void;
  useBooster: (id: BoosterId) => boolean;
  buyBooster: (id: BoosterId) => boolean;
  buyCosmetic: (kind: keyof Owned, id: string, price: number) => boolean;
  equip: (kind: keyof Equipped, id: string) => void;
  maxUnlocked: () => number;
  totalStars: () => number;
  resetAll: () => void;
}

const DEFAULT_BOOSTERS: Record<BoosterId, number> = {
  hammer: 1,
  bomb: 0,
  cross: 0,
  shuffle: 1,
  undo: 0,
  moves5: 0,
};

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      name: '',
      lang: 'ru',
      sound: true,
      coins: 300,
      stars: {},
      scores: {},
      boosters: { ...DEFAULT_BOOSTERS },
      owned: {
        skins: ['classic', 'stones'],
        avatars: ['av-seed', 'av-flower'],
        frames: ['fr-none'],
        nameStyles: ['ns-basic'],
        effects: [],
      },
      equipped: {
        skin: 'classic',
        avatar: 'av-seed',
        frame: 'fr-none',
        nameStyle: 'ns-basic',
        tileEffect: '',
        avatarEffect: '',
        nameEffect: '',
      },
      stats: { wins: 0, bestCascade: 0, totalScore: 0, movesMade: 0, bestStreak: 0 },
      streak: 0,

      setLang: (l) => set({ lang: l }),
      setSound: (v) => {
        setSoundEnabled(v);
        set({ sound: v });
      },
      setName: (n) => set({ name: n.slice(0, 16) }),
      addCoins: (n) => set((s) => ({ coins: s.coins + n })),
      spendCoins: (n) => {
        if (get().coins < n) return false;
        set((s) => ({ coins: s.coins - n }));
        return true;
      },
      recordWin: (level, stars, score, maxCascade, movesUsed) => {
        const s = get();
        const prevStars = s.stars[level] ?? 0;
        const firstClear = !(level in s.stars);
        const newStars = stars > prevStars;
        const chapter = chapterOfLevel(level);
        const base = firstClear
          ? 30 + stars * 10 + chapter * 5
          : 10 + stars * 5;
        const streak = s.streak + 1;
        const mult = streakMult(streak);
        const reward = base * mult;
        const nextStars = { ...s.stars, [level]: Math.max(prevStars, stars) };
        const nextScores = { ...s.scores, [level]: Math.max(s.scores[level] ?? 0, score) };
        set({
          stars: nextStars,
          scores: nextScores,
          coins: s.coins + reward,
          streak,
          stats: {
            wins: s.stats.wins + 1,
            bestCascade: Math.max(s.stats.bestCascade, maxCascade),
            totalScore: s.stats.totalScore + score,
            movesMade: s.stats.movesMade + movesUsed,
            bestStreak: Math.max(s.stats.bestStreak, streak),
          },
        });
        return { firstClear, newStars, reward, base, streak, mult };
      },
      recordLoss: () => set((s) => (s.streak === 0 ? s : { streak: 0 })),
      addBooster: (id, n) =>
        set((s) => ({ boosters: { ...s.boosters, [id]: (s.boosters[id] ?? 0) + n } })),
      useBooster: (id) => {
        const s = get();
        if ((s.boosters[id] ?? 0) <= 0) return false;
        set({ boosters: { ...s.boosters, [id]: s.boosters[id] - 1 } });
        return true;
      },
      buyBooster: (id) => {
        const s = get();
        const price = BOOSTER_MAP[id].price;
        if (s.coins < price) return false;
        set({
          coins: s.coins - price,
          boosters: { ...s.boosters, [id]: (s.boosters[id] ?? 0) + 1 },
        });
        return true;
      },
      buyCosmetic: (kind, id, price) => {
        const s = get();
        if (s.owned[kind].includes(id)) return false;
        if (s.coins < price) return false;
        set({
          coins: s.coins - price,
          owned: { ...s.owned, [kind]: [...s.owned[kind], id] },
        });
        return true;
      },
      equip: (kind, id) => set((s) => ({ equipped: { ...s.equipped, [kind]: id } })),
      maxUnlocked: () => {
        const levels = Object.keys(get().stars).map(Number);
        const cleared = levels.length > 0 ? Math.max(...levels) : 0;
        return Math.min(TOTAL_LEVELS, cleared + 1);
      },
      totalStars: () => {
        const s = get();
        return Object.values(s.stars).reduce((a, b) => a + b, 0);
      },
      resetAll: () =>
        set({
          name: '',
          coins: 300,
          stars: {},
          scores: {},
          boosters: { ...DEFAULT_BOOSTERS },
          owned: {
            skins: ['classic', 'stones'],
            avatars: ['av-seed', 'av-flower'],
            frames: ['fr-none'],
            nameStyles: ['ns-basic'],
            effects: [],
          },
          equipped: {
            skin: 'classic',
            avatar: 'av-seed',
            frame: 'fr-none',
            nameStyle: 'ns-basic',
            tileEffect: '',
            avatarEffect: '',
            nameEffect: '',
          },
          stats: { wins: 0, bestCascade: 0, totalScore: 0, movesMade: 0, bestStreak: 0 },
          streak: 0,
        }),
    }),
    {
      name: 'blooming-world-save-v1',
      onRehydrateStorage: () => (state) => {
        if (state) setSoundEnabled(state.sound);
      },
    },
  ),
);

/** Convenience hook for translations. */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const lang = usePlayer((s) => s.lang);
  return (key, vars) => translate(lang, key, vars);
}
