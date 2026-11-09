/* ============================================================
 * Bloom Match — лёгкая аналитика (Волна 2 «Удержание»).
 *
 * Кольцевой буфер событий в localStorage. Без внешних сервисов
 * (§5.6): данные принадлежат игроку, выгружаются JSON-файлом
 * из профиля. Ключ НЕ совпадает с сейвом (§5.4) — очистка
 * аналитики не затрагивает прогресс.
 * ============================================================ */

export interface AnalyticsEvent {
  /** ISO-время события */
  t: string;
  /** имя события: session_start | level_start | level_win | level_lose */
  e: string;
  /** свободные свойства события */
  [key: string]: string | number | undefined;
}

const ANALYTICS_KEY = 'blooming-world-analytics-v1';
/** ёмкость кольца: 500 событий ≈ несколько дней активной игры */
const ANALYTICS_CAP = 500;

let sessionLogged = false;

/**
 * Волна 7 (A/B): глобальные свойства, попадающие в КАЖДОЕ событие
 * (ab — вариант эксперимента, fs — «первая сессия»). Задаются один
 * раз при старте приложения (ab.ts), конкретные props перекрывают их.
 */
let globalProps: Record<string, string | number> = {};

export function setAnalyticsGlobals(props: Record<string, string | number>): void {
  globalProps = { ...globalProps, ...props };
}

export function analyticsGlobals(): Record<string, string | number> {
  return { ...globalProps };
}

function safeParse(raw: string | null): AnalyticsEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x === 'object' && typeof x.e === 'string') as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function readAll(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse(window.localStorage.getItem(ANALYTICS_KEY));
  } catch {
    return [];
  }
}

function writeAll(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-ANALYTICS_CAP)));
  } catch {
    /* storage недоступен — играем без аналитики */
  }
}

/** Записать событие в кольцо (FIFO, максимум ANALYTICS_CAP). */
export function logEvent(e: string, props?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  const events = readAll();
  const ev: AnalyticsEvent = { t: new Date().toISOString(), e, ...globalProps, ...(props ?? {}) };
  events.push(ev);
  writeAll(events);
}

/** Однократное событие сессии (защита от StrictMode-дублей). */
export function logSessionStart(extraProps?: Record<string, string | number>): void {
  if (sessionLogged || typeof window === 'undefined') return;
  sessionLogged = true;
  logEvent('session_start', extraProps);
}

export function getEvents(): AnalyticsEvent[] {
  return readAll();
}

export function analyticsCount(): number {
  return readAll().length;
}

export function clearEvents(): void {
  writeAll([]);
}

/** Сводка по событиям для экспорта/профиля. */
export function analyticsSummary(): {
  total: number;
  sessions: number;
  wins: number;
  losses: number;
  starts: number;
  firstDay: string | null;
  lastDay: string | null;
} {
  const events = readAll();
  const days = events.map((e) => e.t.slice(0, 10)).sort();
  return {
    total: events.length,
    sessions: events.filter((e) => e.e === 'session_start').length,
    wins: events.filter((e) => e.e === 'level_win').length,
    losses: events.filter((e) => e.e === 'level_lose').length,
    starts: events.filter((e) => e.e === 'level_start').length,
    firstDay: days[0] ?? null,
    lastDay: days[days.length - 1] ?? null,
  };
}

/** Выгрузить все события JSON-файлом (из профиля). */
export function exportEventsJson(extra?: Record<string, unknown>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const payload = {
      game: 'Blooming World',
      exportedAt: new Date().toISOString(),
      summary: analyticsSummary(),
      ...(extra ?? {}),
      events: readAll(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blooming-world-stats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}
