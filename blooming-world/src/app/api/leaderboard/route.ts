/* ============================================================
 * Волна 6 «Социальное»: онлайновый лидерборд.
 * POST — сабмит лучшего результата игрока (анти-чит-минимум:
 * санитизация, клампинг, rate-limit, отказ от понижения);
 * GET — топ-50 + позиция игрока. Дубли отсекаются уникальным
 * playerId (upsert на уровне БД).
 * ============================================================ */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TOTAL_LEVELS } from '@/lib/game/levels';

export const dynamic = 'force-dynamic';

/* ---- анти-чит: rate-limit в памяти (демо-масштаб) ---- */
const lastSeen = new Map<string, number>();
const RATE_MS = 3000; // не чаще 1 сабмита в 3 с на игрока
const MAX_NAME = 16;

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Player';
  // управляющие/HTML-символы не проходят, длина режется
  const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, MAX_NAME);
  return cleaned || 'Player';
}

function clampInt(v: unknown, min: number, max: number, fallback = min): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback;
  return Math.max(min, Math.min(max, n));
}

function playerIdOf(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  // только безопасные символы id, ограничение длины
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : null;
}

async function rankOf(level: number, stars: number): Promise<number> {
  const better = await db.score.count({
    where: {
      OR: [{ level: { gt: level } }, { level: level, stars: { gt: stars } }],
    },
  });
  return better + 1;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const playerId = playerIdOf(body?.playerId);
    if (!playerId) {
      return NextResponse.json({ error: 'bad playerId' }, { status: 400 });
    }

    /* rate-limit: быстрые повторы — дубли — отсекаются */
    const now = Date.now();
    if (now - (lastSeen.get(playerId) ?? 0) < RATE_MS) {
      return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }
    lastSeen.set(playerId, now);
    if (lastSeen.size > 5000) {
      for (const [k, t] of lastSeen) if (now - t > 600000) lastSeen.delete(k);
    }

    /* санитизация + клампинг — чит-значения не проходят */
    const name = sanitizeName(body?.name);
    const level = clampInt(body?.level, 0, TOTAL_LEVELS);
    const stars = clampInt(body?.stars, 0, TOTAL_LEVELS * 3);
    const score = clampInt(body?.score, 0, 10_000_000);

    const existing = await db.score.findUnique({ where: { playerId } });
    if (existing) {
      /* отказ от понижения: лучшие результаты не портятся */
      if (
        level < existing.level ||
        (level === existing.level && stars <= existing.stars && score <= existing.score)
      ) {
        return NextResponse.json({
          ok: true,
          kept: true,
          level: existing.level,
          stars: existing.stars,
          rank: await rankOf(existing.level, existing.stars),
        });
      }
    }

    const row = await db.score.upsert({
      where: { playerId },
      update: { name, level, stars, score },
      create: { playerId, name, level, stars, score },
    });
    return NextResponse.json({ ok: true, rank: await rankOf(row.level, row.stars) });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get('playerId');
    const playerIdSafe = playerId ? playerIdOf(playerId) : null;
    const top = await db.score.findMany({
      orderBy: [{ level: 'desc' }, { stars: 'desc' }, { score: 'desc' }],
      take: 50,
    });
    const total = await db.score.count();
    const me = playerIdSafe ? await db.score.findUnique({ where: { playerId: playerIdSafe } }) : null;
    return NextResponse.json({
      top: top.map((r, i) => ({
        rank: i + 1,
        name: r.name,
        level: r.level,
        stars: r.stars,
        isMe: r.playerId === playerIdSafe,
      })),
      total,
      me: me
        ? { rank: await rankOf(me.level, me.stars), name: me.name, level: me.level, stars: me.stars }
        : null,
    });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
