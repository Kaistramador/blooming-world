/* ============================================================
 * Bloom Match — события (Волна 4): уровень дня, выходные ивенты,
 * сезонная косметика. Чистый TS без DOM (§5.5), всё детерминировано
 * по календарной дате игрока: перезагрузка не меняет расклад,
 * смена суток автоматически переключает контент.
 * ============================================================ */

import { mulberry32 } from './engine';
import { TOTAL_LEVELS } from './levels';
import type { Localized } from '../i18n';

/* ---------------- Ключ даты ---------------- */

/** 'YYYY-MM-DD' в локальном времени игрока (календарный день). */
export function dateKeyOf(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** FNV-1a хеш строки даты → 32-битный seed для mulberry32. */
export function dateSeed(dateKey: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------------- Уровень дня ---------------- */

/** Множитель награды уровня дня. */
export const DAILY_REWARD_MULT = 2;

/**
 * Детерминированный уровень дня по ключу даты: весь день один и тот
 * же, в 00:00 меняется сам. Диапазон 1..TOTAL_LEVELS.
 */
export function dailyLevelFor(dateKey: string): number {
  const rng = mulberry32(dateSeed(dateKey));
  return 1 + Math.floor(rng() * TOTAL_LEVELS);
}

/* ---------------- Выходные ивенты ---------------- */

export type WeekendEventId = 'coins' | 'cascade';

export interface WeekendEventDef {
  id: WeekendEventId;
  icon: string;
  name: Localized;
  desc: Localized;
}

/** Суббота — «Золотые выходные» (×2 монеты), воскресенье — «Каскадный уикенд». */
export const WEEKEND_EVENTS: Record<WeekendEventId, WeekendEventDef> = {
  coins: {
    id: 'coins',
    icon: '🪙',
    name: { ru: 'Золотые выходные', en: 'Golden Weekend', es: 'Fin de semana dorado', pt: 'Fim de semana dourado' },
    desc: {
      ru: 'Все победы приносят ×2 монет — только сегодня!',
      en: 'All wins grant ×2 coins — today only!',
      es: 'Todas las victorias dan ×2 monedas — ¡solo hoy!',
      pt: 'Todas as vitórias dão ×2 moedas — só hoje!',
    },
  },
  cascade: {
    id: 'cascade',
    icon: '🌊',
    name: { ru: 'Каскадный уикенд', en: 'Cascade Weekend', es: 'Fin de semana de cascadas', pt: 'Fim de semana de cascatas' },
    desc: {
      ru: 'Каскады 3+ приносят бонусные монеты к награде!',
      en: 'Cascades of 3+ grant bonus coins on top of the reward!',
      es: '¡Las cascadas de 3+ dan monedas extra de recompensa!',
      pt: 'Cascatas de 3+ dão moedas extras de recompensa!',
    },
  },
};

/** Ивент дня по ключу даты: сб/вс → ивент, будни → null. */
export function weekendEventFor(dateKey: string): WeekendEventId | null {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = вс, 6 = сб
  if (dow === 6) return 'coins';
  if (dow === 0) return 'cascade';
  return null;
}

/** Каскадный челлендж: каскад 3+ платит по 30 монет за ступень (кап 8). */
export const CASCADE_BONUS_FROM = 3;

export function cascadeBonus(maxCascade: number): number {
  const steps = Math.max(0, Math.min(maxCascade, 8) - (CASCADE_BONUS_FROM - 1));
  return steps * 30;
}

/* ---------------- Сезоны ---------------- */

export type SeasonId = 'autumn' | 'winter' | 'spring' | 'summer';

export interface SeasonDef {
  id: SeasonId;
  icon: string;
  name: Localized;
}

export const SEASONS: Record<SeasonId, SeasonDef> = {
  autumn: { id: 'autumn', icon: '🍂', name: { ru: 'Осень', en: 'Autumn', es: 'Otoño', pt: 'Outono' } },
  winter: { id: 'winter', icon: '❄️', name: { ru: 'Зима', en: 'Winter', es: 'Invierno', pt: 'Inverno' } },
  spring: { id: 'spring', icon: '🌷', name: { ru: 'Весна', en: 'Spring', es: 'Primavera', pt: 'Primavera' } },
  summer: { id: 'summer', icon: '☀️', name: { ru: 'Лето', en: 'Summer', es: 'Verano', pt: 'Verão' } },
};

/** Метеорологический сезон северного полушария по месяцу (0 = январь). */
export function seasonOfMonth(month0: number): SeasonId {
  const m = ((month0 % 12) + 12) % 12 + 1; // 1..12
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

/** Сезон на дату. */
export function seasonOn(now: Date): SeasonId {
  return seasonOfMonth(now.getMonth());
}

/** Помечен ли предмет каталога текущим сезоном (для витрины магазина). */
export function isItemInSeason(season?: SeasonId, now: Date = new Date()): boolean {
  return !season || season === seasonOn(now);
}
