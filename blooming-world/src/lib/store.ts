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
import { GARDEN_MAP, gardenCoinsBack, piggyDeposit, PIGGY_WINS_TARGET } from '@/lib/game/garden';
import { dateKeyOf, dailyLevelFor, DAILY_REWARD_MULT, cascadeBonus, weekendEventFor } from '@/lib/game/events';
import type { WeekendEventId } from '@/lib/game/events';
import { weekKeyOf, dayIndexOf, teamSnapshot, chestReachedFor, chestRewardBetween, TEAM_CHESTS } from '@/lib/game/team';

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

/**
 * Волна 3: информация о копилке после победы.
 */
export interface PiggyInfo {
  deposit: number;
  coins: number;
  wins: number;
  ready: boolean;
}

/**
 * Волна 4: сведения о наградах событий в модали победы.
 */
export interface EventInfo {
  /** сыгран уровень дня (×2) */
  daily: boolean;
  /** активный ивент выходных (если есть) */
  weekend: WeekendEventId | null;
  /** бонус каскадного челленджа (монеты) */
  cascadeCoins: number;
  /** максимальный каскад в победе (для показа) */
  maxCascade: number;
}

/** Снимок состояния уровня дня для карты. */
export interface DailyState {
  /** календарный день, к которому привязан уровень */
  date: string;
  /** уровень, выбранный на этот день (детерминирован, клампится к прогрессу) */
  level: number;
  /** уже пройден сегодня */
  done: boolean;
}

/**
 * Волна 6: командный сундук — состояние недели.
 * contributed — очки побед игрока за текущую ISO-неделю;
 * claimed — сколько порогов-сундуков уже забрано (0..4).
 */
export interface TeamState {
  week: string;
  contributed: number;
  claimed: number;
}

/** Расчёт горшка команды для карты (чистый, безопасен в рендере). */
export interface TeamComputed extends TeamState {
  week: string;
  dayIdx: number;
  botPot: number;
  playerPot: number;
  pot: number;
  reached: number;
  /** следующая цель: need следующего порога или null — всё собрано */
  nextNeed: number | null;
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
  /** Волна 3: звёзды, потраченные в саду (доступные = earned - spent) */
  starsSpent: number;
  /** Волна 3: восстановленные объекты сада (id из garden.ts) */
  garden: { restored: string[] };
  /** Волна 3: копилка — накопленные монеты и победы до вскрытия */
  piggy: { coins: number; wins: number };
  /** Волна 4: уровень дня — фиксируется на день при первом открытии карты */
  daily: DailyState;
  /** Волна 6: командный сундук — вклад игрока и забранные сундуки недели */
  team: TeamState;
  // actions
  setLang: (l: Lang) => void;
  setSound: (v: boolean) => void;
  setName: (n: string) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  recordWin: (level: number, stars: number, score: number, maxCascade: number, movesUsed: number, opts?: { daily?: boolean }) => { firstClear: boolean; newStars: boolean; reward: number; base: number; streak: number; mult: number; piggy: PiggyInfo; event: EventInfo };
  /** Волна 4: ЧИСТЫЙ расчёт уровня дня (без записи) — безопасен в рендере */
  computeDaily: () => DailyState;
  /** Волна 4: зафиксировать уровень дня, если наступили новые сутки (вызывать из эффектов) */
  ensureDaily: () => DailyState;
  /** Волна 6: ЧИСТЫЙ расчёт горшка команды (без записи) — безопасен в рендере */
  computeTeam: () => TeamComputed;
  /** Волна 6: перекат недели командного сундука, если наступил понедельник (вызывать из эффектов) */
  ensureTeam: () => TeamState;
  /** Волна 6: забрать все достижимые незабранные сундуки; возвращает монеты (0 — нечего) */
  claimTeamChests: () => number;
  recordLoss: () => void;
  addBooster: (id: BoosterId, n: number) => void;
  useBooster: (id: BoosterId) => boolean;
  buyBooster: (id: BoosterId) => boolean;
  buyCosmetic: (kind: keyof Owned, id: string, price: number) => boolean;
  equip: (kind: keyof Equipped, id: string) => void;
  maxUnlocked: () => number;
  totalStars: () => number;
  /** Волна 3: звёзды, доступные на траты в саду */
  starsAvailable: () => number;
  /** Волна 3: восстановить объект сада за звёзды (false — недостаток звёзд/уже стоит) */
  restoreGarden: (id: string) => boolean;
  /** Волна 3: вскрыть копилку, если набраны победы; возвращает монеты или 0 */
  openPiggy: () => number;
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
      starsSpent: 0,
      garden: { restored: [] },
      piggy: { coins: 0, wins: 0 },
      daily: { date: '', level: 1, done: false },
      team: { week: '', contributed: 0, claimed: 0 },

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
      recordWin: (level, stars, score, maxCascade, movesUsed, opts) => {
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
        /* Волна 4: события — уровень дня ×2, выходные ×2 монет / каскад-бонус */
        const isDaily = !!opts?.daily;
        const weekend = weekendEventFor(dateKeyOf(new Date()));
        const cascadeCoins = weekend === 'cascade' ? cascadeBonus(maxCascade) : 0;
        const eventMult = (isDaily ? DAILY_REWARD_MULT : 1) * (weekend === 'coins' ? 2 : 1);
        const reward = base * mult * eventMult + cascadeCoins;
        const event: EventInfo = { daily: isDaily, weekend, cascadeCoins, maxCascade };
        const nextStars = { ...s.stars, [level]: Math.max(prevStars, stars) };
        const nextScores = { ...s.scores, [level]: Math.max(s.scores[level] ?? 0, score) };
        /* Волна 3: копилка — каждый взнос победы капает в копилку */
        const deposit = piggyDeposit(level);
        const piggyWins = s.piggy.wins + 1;
        const piggyCoins = s.piggy.coins + deposit;
        const piggy: PiggyInfo = { deposit, coins: piggyCoins, wins: piggyWins, ready: piggyWins >= PIGGY_WINS_TARGET };
        /* Волна 4: уровень дня отмечается пройденным только за свой день */
        const today = dateKeyOf(new Date());
        const dailyNext =
          isDaily && s.daily.date === today ? { ...s.daily, done: true } : s.daily;
        /* Волна 6: очки победы летят в общий горшок команды; при смене недели горшок новосоздан */
        const wk = weekKeyOf(new Date());
        const teamNext: TeamState =
          s.team.week === wk
            ? { ...s.team, contributed: s.team.contributed + score }
            : { week: wk, contributed: score, claimed: 0 };
        set({
          stars: nextStars,
          scores: nextScores,
          coins: s.coins + reward,
          streak,
          daily: dailyNext,
          team: teamNext,
          piggy: { coins: piggyCoins, wins: piggyWins % PIGGY_WINS_TARGET },
          stats: {
            wins: s.stats.wins + 1,
            bestCascade: Math.max(s.stats.bestCascade, maxCascade),
            totalScore: s.stats.totalScore + score,
            movesMade: s.stats.movesMade + movesUsed,
            bestStreak: Math.max(s.stats.bestStreak, streak),
          },
        });
        return { firstClear, newStars, reward, base, streak, mult, piggy, event };
      },
      /* Волна 4: уровень дня фиксируется при первом открытии в сутки и живёт до 00:00.
       * computeDaily — чистый расчёт (безопасен во время рендера),
       * ensureDaily — записывает перекат (вызывать из эффектов). */
      computeDaily: () => {
        const s = get();
        const today = dateKeyOf(new Date());
        if (s.daily.date === today) return s.daily;
        return { date: today, level: Math.min(dailyLevelFor(today), Math.max(1, s.maxUnlocked())), done: false };
      },
      ensureDaily: () => {
        const s = get();
        const computed = get().computeDaily();
        if (s.daily.date === computed.date) return s.daily;
        set({ daily: computed });
        return computed;
      },
      /* Волна 6: командный сундук — compute/ensure-пара (урок Волны 4: set() в рендере запрещён) */
      computeTeam: () => {
        const s = get();
        const now = new Date();
        const week = weekKeyOf(now);
        const dayIdx = dayIndexOf(now);
        const sameWeek = s.team.week === week;
        const contributed = sameWeek ? s.team.contributed : 0;
        const claimed = sameWeek ? s.team.claimed : 0;
        const snap = teamSnapshot(week, dayIdx, contributed);
        const nextChest = TEAM_CHESTS[snap.reached];
        return {
          week,
          dayIdx,
          contributed,
          claimed,
          botPot: snap.botPot,
          playerPot: snap.playerPot,
          pot: snap.pot,
          reached: snap.reached,
          nextNeed: nextChest ? nextChest.need : null,
        };
      },
      ensureTeam: () => {
        const s = get();
        const week = weekKeyOf(new Date());
        if (s.team.week === week) return s.team;
        const t: TeamState = { week, contributed: 0, claimed: 0 };
        set({ team: t });
        return t;
      },
      claimTeamChests: () => {
        const s = get();
        const week = weekKeyOf(new Date());
        if (s.team.week !== week) return 0;
        const snap = teamSnapshot(week, dayIndexOf(new Date()), s.team.contributed);
        const reached = chestReachedFor(snap.pot);
        if (reached <= s.team.claimed) return 0;
        const coins = chestRewardBetween(s.team.claimed, reached);
        set({ coins: s.coins + coins, team: { ...s.team, claimed: reached } });
        return coins;
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
      starsAvailable: () => Math.max(0, get().totalStars() - get().starsSpent),
      restoreGarden: (id) => {
        const s = get();
        const def = GARDEN_MAP[id];
        if (!def || s.garden.restored.includes(id)) return false;
        if (s.starsAvailable() < def.cost) return false;
        set({
          starsSpent: s.starsSpent + def.cost,
          coins: s.coins + gardenCoinsBack(def.cost),
          garden: { restored: [...s.garden.restored, id] },
        });
        return true;
      },
      openPiggy: () => {
        const s = get();
        if (s.piggy.coins <= 0) return 0;
        set({ coins: s.coins + s.piggy.coins, piggy: { coins: 0, wins: 0 } });
        return s.piggy.coins;
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
          starsSpent: 0,
          garden: { restored: [] },
          piggy: { coins: 0, wins: 0 },
          daily: { date: '', level: 1, done: false },
          team: { week: '', contributed: 0, claimed: 0 },
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
