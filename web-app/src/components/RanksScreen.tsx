'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { generateBots, buildLeaderboard, playerRankEntry } from '@/lib/game/leaderboard';
import { usePlayer, useT } from '@/lib/store';
import { PlayerAvatar, PlayerName } from './game/PlayerBadge';
import { sfx } from '@/lib/game/sound';

/** Deterministic bot population — computed once, same on every device. */
const BOTS = generateBots(520);

export function RanksScreen() {
  const t = useT();
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(60);

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

  const shown = result.entries.filter((e) =>
    query ? e.name.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
      <h1 className="mb-1 text-2xl font-black text-white bm-text-outline">{t('ranks.title')}</h1>
      <p className="mb-3 text-xs text-white/75 bm-text-outline">
        {result.total} {t('ranks.players')} · {t('ranks.youAre')}
        <b className="text-amber-300">#{result.playerPosition}</b>
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ranks.search')}
        className="mb-3 rounded-2xl border-white/25 bg-white/90 text-slate-800 placeholder:text-slate-400"
      />

      <div className="flex flex-col gap-1.5">
        {shown.slice(0, limit).map((e, i) => {
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
        {shown.length > limit && (
          <button
            type="button"
            className="mt-1 rounded-2xl bg-white/20 py-2.5 text-sm font-bold text-white hover:bg-white/30"
            onClick={() => {
              sfx.click();
              setLimit((l) => l + 60);
            }}
          >
            ↓ {shown.length - limit}
          </button>
        )}
      </div>
    </div>
  );
}
