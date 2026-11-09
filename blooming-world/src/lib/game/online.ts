/* ============================================================
 * Bloom Match — Волна 6: клиент онлайнового лидерборда.
 * Игровой id хранится в localStorage (≠ сейв, §5.4). Все запросы
 * с таймаутом и ТИХИМ фейлом: офлайн/недоступный API не ломают
 * игру — рейтинг просто остаётся на ботах (§5.6).
 * ============================================================ */

const PID_KEY = 'blooming-world-player-id';

/** Постоянный идентификатор игрока для онлайнового рейтинга (не секрет). */
export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(PID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID().replace(/-/g, '')
          : `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e12).toString(36)}`;
      localStorage.setItem(PID_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export interface OnlineEntry {
  rank: number;
  name: string;
  level: number;
  stars: number;
  isMe: boolean;
}

export interface OnlineMe {
  rank: number;
  name: string;
  level: number;
  stars: number;
}

export interface OnlineTop {
  top: OnlineEntry[];
  total: number;
  me: OnlineMe | null;
}

/** fetch с таймаутом (AbortController) — зависший запрос не блокирует UI. */
async function fetchTimeout(url: string, init?: RequestInit, ms = 4000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Сабмит лучшего результата. Тихий: возвращает false при любой
 * ошибке (офлайн, 429, сервер) — caller не реагирует.
 */
export async function submitOnline(payload: {
  level: number;
  stars: number;
  score: number;
  name: string;
}): Promise<boolean> {
  const playerId = getPlayerId();
  if (!playerId) return false;
  try {
    const res = await fetchTimeout('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, ...payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Топ-50 + позиция игрока. null — API недоступен. */
export async function fetchOnlineTop(playerId?: string): Promise<OnlineTop | null> {
  const pid = playerId ?? getPlayerId();
  try {
    const url = pid ? `/api/leaderboard?playerId=${encodeURIComponent(pid)}` : '/api/leaderboard';
    const res = await fetchTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.top)) return null;
    return data as OnlineTop;
  } catch {
    return null;
  }
}
