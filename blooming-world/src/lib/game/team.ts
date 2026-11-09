/* ============================================================
 * Bloom Match — Волна 6 «Социальное»: командный сундук (Team Chest).
 * Общий «горшок» очков команды за неделю: очки побед игрока +
 * детерминированный вклад сокомандников (до онлайна — симуляция).
 * Чистый TS без DOM (§5.5), всё детерминировано по ISO-неделе:
 * понедельник = новый горшок, перекат в 00:00 по понедельникам.
 * ============================================================ */

import { mulberry32 } from './engine';
import { dateSeed } from './events';

/* ---------------- ISO-неделя ---------------- */

/** ISO-номер недели для года (неделя начинается в понедельник, ISO-8601). */
function isoWeekNum(now: Date): { year: number; week: number } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (d.getDay() + 6) % 7; // Пн=0..Вс=6
  d.setDate(d.getDate() - day + 3); // четверг текущей недели — его год и неделя по ISO
  const isoYear = d.getFullYear();
  // понедельник первой недели ISO-года: 4 января всегда в неделе 1
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const monday1 = new Date(isoYear, 0, 4 - jan4Day);
  const week = Math.round((d.getTime() - monday1.getTime()) / (7 * 86400000)) + 1;
  return { year: isoYear, week };
}

/** Ключ ISO-недели 'YYYY-Www' (Пн — начало недели) в локальном времени. */
export function weekKeyOf(now: Date): string {
  const { year, week } = isoWeekNum(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Индекс дня внутри недели: 0 = понедельник … 6 = воскресенье. */
export function dayIndexOf(now: Date): number {
  return (now.getDay() + 6) % 7;
}

/* ---------------- Сундук-пороги ---------------- */

export interface TeamChest {
  /** порог очков горшка команды */
  need: number;
  /** награда монетами за порог */
  reward: number;
  icon: string;
  name: { ru: string; en: string };
}

/** 4 сундука: вклад ботов обычно дотягивает до 2-го, активный игрок — до 3–4-го. */
export const TEAM_CHESTS: TeamChest[] = [
  { need: 5000, reward: 150, icon: '📦', name: { ru: 'Деревянный', en: 'Wooden' } },
  { need: 15000, reward: 300, icon: '🎁', name: { ru: 'Серебряный', en: 'Silver' } },
  { need: 35000, reward: 600, icon: '🏆', name: { ru: 'Золотой', en: 'Golden' } },
  { need: 70000, reward: 1200, icon: '💎', name: { ru: 'Бриллиантовый', en: 'Diamond' } },
];

/** Сколько порогов достигнуто при данном горшке (0..TEAM_CHESTS.length). */
export function chestReachedFor(pot: number): number {
  let n = 0;
  for (const c of TEAM_CHESTS) if (pot >= c.need) n++;
  return n;
}

/** Суммарная награда за пороги в диапазоне [from, to). */
export function chestRewardBetween(from: number, to: number): number {
  let sum = 0;
  for (let i = Math.max(0, from); i < Math.min(to, TEAM_CHESTS.length); i++) {
    sum += TEAM_CHESTS[i].reward;
  }
  return sum;
}

/* ---------------- Сокомандники (симуляция до онлайна) ---------------- */

export const TEAM_BOTS = 25;

const BOT_NAMES = [
  'Ирина', 'Алекс', 'Мария', 'Дмитрий', 'Софья', 'Максим', 'Алиса', 'Егор',
  'Полина', 'Артём', 'Вика', 'Никита', 'Лиза', 'Кирилл', 'Настя', 'Роман',
  'Даша', 'Влад', 'Катя', 'Олег', 'Юля', 'Саша', 'Глеб', 'Мила', 'Тимур',
];

export interface TeamBot {
  name: string;
  /** очки, внесённые за каждый день недели (0 = пропустил день) */
  perDay: number[];
  /** очки за весь день dayIdx включительно */
  total: number;
}

/** 25 детерминированных сокомандников недели (та же неделя — те же люди и очки).
 * ВАЖНО: без sort со случайным компаратором — число вызовов rng должно быть
 * ОДИНАКОВЫМ во всех движках (V8/JSC дают разный порядок sort). */
export function teamBots(weekKey: string): TeamBot[] {
  const rng = mulberry32(dateSeed(weekKey + '#team'));
  const bots: TeamBot[] = [];
  for (let i = 0; i < TEAM_BOTS; i++) {
    const name = BOT_NAMES[i % BOT_NAMES.length] + (rng() < 0.4 ? ' ' + '🌼🌸🌻🌷🌺'[Math.floor(rng() * 5)] : '');
    // день активен с шансом 0.55 → ~3.9 активных дня; очки за день 100..350 — ~21k на команду
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (let d = 0; d < 7; d++) {
      if (rng() < 0.55) perDay[d] = 100 + Math.floor(rng() * 251); // 100..350
    }
    let total = 0;
    for (const v of perDay) total += v;
    bots.push({ name, perDay, total });
  }
  return bots;
}

/** Вклад ботов с начала недели по день dayIdx включительно (горшок растёт в течение недели). */
export function teamBotPotFor(weekKey: string, dayIdx: number): number {
  const bots = teamBots(weekKey);
  let sum = 0;
  for (const b of bots) {
    for (let d = 0; d <= Math.min(dayIdx, 6); d++) sum += b.perDay[d];
  }
  return sum;
}

/* ---------------- Снимок горшка ---------------- */

export interface TeamSnapshot {
  week: string;
  dayIdx: number;
  /** вклад ботов до текущего дня */
  botPot: number;
  /** вклад игрока (из сейва, только если week актуальна) */
  playerPot: number;
  /** горшок = боты + игрок */
  pot: number;
  /** достигнуто порогов (0..4) */
  reached: number;
  /** полный недельный вклад ботов (аудит/баланс) */
  botTotal: number;
}

export function teamSnapshot(weekKey: string, dayIdx: number, playerContrib: number): TeamSnapshot {
  const botPot = teamBotPotFor(weekKey, dayIdx);
  const bots = teamBots(weekKey);
  let botTotal = 0;
  for (const b of bots) botTotal += b.total;
  const pot = botPot + Math.max(0, playerContrib);
  return {
    week: weekKey,
    dayIdx,
    botPot,
    playerPot: Math.max(0, playerContrib),
    pot,
    reached: chestReachedFor(pot),
    botTotal,
  };
}

/* ---------------- Топ вкладчиков (для модали) ---------------- */

export interface TeamMemberRow {
  name: string;
  pts: number;
  isPlayer?: boolean;
}

/** Участники недели по вкладу (до dayIdx): 25 ботов + игрок. */
export function teamMembers(weekKey: string, dayIdx: number, playerName: string, playerContrib: number): TeamMemberRow[] {
  const rows: TeamMemberRow[] = teamBots(weekKey).map((b) => {
    let pts = 0;
    for (let d = 0; d <= Math.min(dayIdx, 6); d++) pts += b.perDay[d];
    return { name: b.name, pts };
  });
  rows.push({ name: playerName || (playerContrib > 0 ? 'Вы' : '—'), pts: Math.max(0, playerContrib), isPlayer: true });
  return rows.sort((a, b) => b.pts - a.pts || (a.isPlayer ? -1 : 1));
}
