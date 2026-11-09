'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { generateBots, buildLeaderboard, playerRankEntry } from '@/lib/game/leaderboard';
import type { RankEntry } from '@/lib/game/leaderboard';
import { usePlayer, useT } from '@/lib/store';
import { PlayerAvatar, PlayerName } from './game/PlayerBadge';
import { getPlayerId, submitOnline, fetchOnlineTop } from '@/lib/game/online';
import type { OnlineTop } from '@/lib/game/online';
import { logEvent } from '@/lib/game/analytics';
import { sfx } from '@/lib/game/sound';

/** Deterministic bot population — computed once, same on every device. */
const BOTS = generateBots(520);

type RanksMode = 'bots' | 'online';

export function RanksScreen() {
  const t = useT();
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(60);
  /* Волна 6: боты — оффлайн-база, онлайн — реальный лидерборд API+БД */
  const [mode, setMode] = useState<RanksMode>('bots');
  const [online, setOnline] = useState<OnlineTop | null>(null);
  const [onlineState, setOnlineState] = useState<'loading' | 'ok' | 'off'>('loading');

  const result = useMemo(() => {
    const me = playerRankEntry(
      player.name || (player.lang === 'ru' ? 'Игрок' : 'Player'),
      player.maxUnlocked() - 1 >= 1 ? player.maxUnlocked() - 1 : 0,
      player.totalStars(),
      player.equipped.avatar,
      player.equipped.frame,
      player.equipped.nameStyle,
      player.equipped.nameEffect || null,
    );
    return buildLeaderboard(BOTS, me);
  }, [player]);

  /* Волна 6: вход в онлайн — свежий сабмит своего лучшего результата + фетч топа.
   * setState только после await — синхронные вызовы в эффекте запрещены правилом lint. */
  useEffect(() => {
    if (mode !== 'online') return;
    let alive = true;
    (async () => {
      const p = usePlayer.getState();
      const pid = getPlayerId();
      const bestLevel = Math.max(0, p.maxUnlocked() - 1);
      /* новичок без прогресса не засоряет онлайн-борд */
      if (bestLevel >= 1) {
        const sent = await submitOnline({
          level: bestLevel,
          stars: p.totalStars(),
          score: p.stats.totalScore,
          name: p.name || (p.lang === 'ru' ? 'Игрок' : 'Player'),
        });
        if (alive && sent) logEvent('online_submit', { level: bestLevel });
      }
      /* фетч ПОСЛЕ сабмита — топ сразу включает свой результат */
      const top = await fetchOnlineTop(pid);
      if (!alive) return;
      if (top) {
        setOnline(top);
        setOnlineState('ok');
      } else {
        setOnline(null);
        setOnlineState('off');
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  const switchMode = (m: RanksMode) => {
    sfx.click();
    setMode(m);
  };

  /* ---- строки онлайна ---- */
  const onlineShown = online?.top.filter((e) =>
    query ? e.name.toLowerCase().includes(query.toLowerCase()) : true,
  ) ?? [];

  /* ---- строки ботов ---- */
  const botShown = result.entries.filter((e) =>
    query ? e.name.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
      <h1 className="mb-1 text-2xl font-black text-white bm-text-outline">{t('ranks.title')}</h1>
      <p className="mb-3 text-xs text-white/75 bm-text-outline">
        {mode === 'bots' ? (
          <>
            {result.total} {t('ranks.players')} · {t('ranks.youAre')}
            <b className="text-amber-300">#{result.playerPosition}</b>
          </>
        ) : onlineState === 'ok' && online ? (
          <>
            {online.total} {t('ranks.players')}
            {online.me ? (
              <>
                {' '}· {t('ranks.youAre')}
                <b className="text-amber-300">#{online.me.rank}</b>
              </>
            ) : null}
            <span className="ml-1.5 text-emerald-300">· {t('ranks.onlineSent')}</span>
          </>
        ) : (
          <span className="opacity-80">{t('common.loading')}</span>
        )}
      </p>

      {/* переключатель Боты / Онлайн */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/30 p-1">
        {(['bots', 'online'] as RanksMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-xl py-2 text-xs font-black transition ${
              mode === m ? 'bg-white text-slate-800 shadow' : 'text-white/70 hover:text-white'
            }`}
            aria-pressed={mode === m}
          >
            {t(m === 'bots' ? 'ranks.modeBots' : 'ranks.modeOnline')}
          </button>
        ))}
      </div>

      {mode === 'online' && onlineState !== 'ok' && (
        <div className="mb-3 rounded-2xl bg-black/35 p-3 text-center text-xs font-bold text-white/85">
          {onlineState === 'loading' ? t('common.loading') : t('ranks.onlineOff')}
        </div>
      )}
      {mode === 'online' && onlineState === 'ok' && onlineShown.length === 0 && (
        <div className="mb-3 rounded-2xl bg-black/35 p-3 text-center text-xs font-bold text-white/85">
          {t('ranks.onlineEmpty')}
        </div>
      )}

      {mode === 'online' && onlineState === 'ok' && (
        <div className="flex flex-col gap-1.5">
          {onlineShown.map((e) => (
            <div
              key={`${e.rank}:${e.name}`}
              className={`flex items-center gap-2.5 rounded-2xl p-2 shadow ${
                e.isMe
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 ring-2 ring-white'
                  : 'bg-white/90 text-slate-800'
              }`}
            >
              <div className="w-9 shrink-0 text-center text-sm font-black">
                {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}
              </div>
              <PlayerAvatar avatarId="av-seed" frameId="fr-none" size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold">{e.name}</span>
                  {e.isMe && (
                    <span className="rounded-full bg-amber-950 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                      {t('ranks.you')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] font-semibold ${e.isMe ? 'text-amber-900' : 'text-slate-500'}`}>
                  {t('ranks.level')} {e.level} · ⭐ {e.stars}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'bots' && (
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ranks.search')}
            className="mb-3 rounded-2xl border-white/25 bg-white/90 text-slate-800 placeholder:text-slate-400"
          />
          <div className="flex flex-col gap-1.5">
            {botShown.slice(0, limit).map((e: RankEntry, i) => {
              const isMe = e.isPlayer;
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-2.5 rounded-2xl p-2 shadow ${
                    isMe
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 ring-2 ring-white'
                      : 'bg-white/90 text-slate-800'
                  }`}
                >
                  <div className="w-9 shrink-0 text-center text-sm font-black">
                    {i < limit && i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                  </div>
                  <PlayerAvatar avatarId={e.avatarId} frameId={e.frameId} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <PlayerName
                        nameStyleId={e.nameStyleId}
                        nameEffect={e.nameEffectId ?? undefined}
                        name={e.name}
                        nameClass={isMe ? 'text-amber-950' : 'text-slate-800'}
                      />
                      {isMe && (
                        <span className="rounded-full bg-amber-950 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                          {t('ranks.you')}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-semibold ${isMe ? 'text-amber-900' : 'text-slate-500'}`}>
                      {t('ranks.level')} {e.level} · ⭐ {e.stars}
                    </div>
                  </div>
                </div>
              );
            })}
            {botShown.length > limit && (
              <button
                type="button"
                className="mt-1 rounded-2xl bg-white/20 py-2.5 text-sm font-bold text-white hover:bg-white/30"
                onClick={() => {
                  sfx.click();
                  setLimit((l) => l + 60);
                }}
              >
                ↓ {botShown.length - limit}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
