/* ============================================================
 * Bloom Match — Волна 7 «Масштаб и рост»: A/B воронки первых
 * сессий. Вариант детерминирован по playerId (FNV-1a → 50/50),
 * хранится отдельно от сейва (§5.4 — ключ ≠ blooming-world-save-v1).
 *
 * Гипотезы (портальные игроки решают судьбу игры первым экраном):
 *  A (контроль) — карта первого экрана, статичная подсказка.
 *  B («быстрый старт») — первая сессия открывается сразу уровнем 1;
 *    в уровнях 1–3 до первого совпадения показывается пульсирующий
 *    коуч-подсказчик (тайминг туториала).
 *
 * Воронка тегируется в аналитику: КАЖДОЕ событие получает
 * ab: 'A'|'B' и fs: 0|1 (первая сессия) — анализ экспорта JSON
 * даёт конверсию по вариантам без внешних сервисов (§5.6).
 * ============================================================ */

import { getPlayerId } from './online';
import { setAnalyticsGlobals } from './analytics';

const AB_KEY = 'blooming-world-ab-v1';
const COACH_MAX_LEVEL = 3;

export type AbVariant = 'A' | 'B';

interface AbBlob {
  /** назначенный вариант (не меняется) */
  v: AbVariant;
  /** сколько сессий уже начато (первая = 0 при старте сессии) */
  sessions: number;
}

let cached: AbBlob | null = null;
let startedThisLoad = false;

function fnv1a(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function readBlob(): AbBlob | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.v !== 'A' && parsed.v !== 'B') || typeof parsed.sessions !== 'number') return null;
    return parsed as AbBlob;
  } catch {
    return null;
  }
}

function writeBlob(blob: AbBlob): void {
  cached = blob;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AB_KEY, JSON.stringify(blob));
  } catch {
    /* storage недоступен — вариант живёт только в памяти сессии */
  }
}

/**
 * Чистая функция варианта по playerId (для тестов и аудита):
 * нечётный хеш → B, чётный → A.
 */
export function abVariantForId(playerId: string): AbVariant {
  return fnv1a(playerId) % 2 === 1 ? 'B' : 'A';
}

/** Вариант игрока (детерминированный, персистентный). */
export function abVariant(): AbVariant {
  if (cached) return cached.v;
  const stored = readBlob();
  if (stored) {
    cached = stored;
    return stored.v;
  }
  const pid = getPlayerId();
  const variant = abVariantForId(pid || 'fallback-id');
  writeBlob({ v: variant, sessions: 0 });
  return variant;
}

/**
 * Начало сессии: фиксирует счётчик сессий и включает теги ab/fs
 * в аналитику. Идемпотентно за загрузку страницы (StrictMode —
 * дважды за mount, второй вызов ничего не меняет).
 */
export function abSessionStart(): { variant: AbVariant; first: boolean } {
  const variant = abVariant();
  if (startedThisLoad) return { variant, first: cached ? cached.sessions === 1 : false };
  startedThisLoad = true;
  const blob = readBlob() ?? { v: variant, sessions: 0 };
  const first = blob.sessions === 0;
  writeBlob({ v: blob.v, sessions: blob.sessions + 1 });
  setAnalyticsGlobals({ ab: variant, fs: first ? 1 : 0 });
  return { variant, first };
}

/** Это первая сессия игрока (для «быстрого старта»). */
export function abFirstSession(): boolean {
  const blob = readBlob();
  if (blob) return blob.sessions <= 1;
  return cached ? cached.sessions <= 1 : false;
}

/** A/B-решение: первая сессия варианта B открывается сразу в геймплей. */
export function abShouldStartInGame(variant: AbVariant, firstSession: boolean): boolean {
  return variant === 'B' && firstSession;
}

/** Показывать коуч-туториал (вариант B, уровни 1..3). */
export function abCoachActive(variant: AbVariant, level: number): boolean {
  return variant === 'B' && level <= COACH_MAX_LEVEL;
}

export const AB_COACH_MAX_LEVEL = COACH_MAX_LEVEL;
export const AB_KEY_NAME = AB_KEY;

/** Только для аудитов/тестов: сброс in-memory кэшей (имитация перезагрузки). */
export function __abResetForTests(): void {
  cached = null;
  startedThisLoad = false;
}
