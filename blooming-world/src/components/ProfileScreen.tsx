'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePlayer, useT } from '@/lib/store';
import { PlayerAvatar, PlayerName } from './game/PlayerBadge';
import { analyticsCount, analyticsSummary, exportEventsJson } from '@/lib/game/analytics';
import { sfx } from '@/lib/game/sound';
import type { Lang } from '@/lib/i18n';

export function ProfileScreen() {
  const t = useT();
  const player = usePlayer();
  const [nameDraft, setNameDraft] = useState(player.name);
  const [saved, setSaved] = useState(false);
  const [exported, setExported] = useState(false);

  const stat = (label: string, value: string | number, icon: string) => (
    <div key={label} className="flex items-center gap-2.5 rounded-2xl bg-white/90 p-3 shadow">
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-xs font-bold text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
      <h1 className="mb-3 text-2xl font-black text-white bm-text-outline">{t('profile.title')}</h1>

      {/* identity card */}
      <div className="mb-3 flex items-center gap-3 rounded-3xl bg-white/90 p-4 shadow">
        <PlayerAvatar
          avatarId={player.equipped.avatar}
          frameId={player.equipped.frame}
          avatarEffect={player.equipped.avatarEffect || undefined}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <div className="text-lg">
            <PlayerName
              nameStyleId={player.equipped.nameStyle}
              nameEffect={player.equipped.nameEffect || undefined}
              name={player.name || (player.lang === 'ru' ? 'Игрок' : 'Player')}
              nameClass="text-slate-800"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {t('map.level')} {player.maxUnlocked()} · ⭐ {player.totalStars()} · 🪙{' '}
            {player.coins.toLocaleString('ru-RU')}
            {player.streak >= 2 && <> · 🔥 ×{Math.min(5, player.streak)}</>}
          </div>
        </div>
      </div>

      {/* name edit */}
      <div className="mb-3 rounded-3xl bg-white/90 p-4 shadow">
        <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
          {t('profile.name')}
        </div>
        <div className="flex gap-2">
          <Input
            value={nameDraft}
            maxLength={16}
            placeholder={t('profile.namePlaceholder')}
            onChange={(e) => setNameDraft(e.target.value)}
            className="rounded-xl border-slate-300 text-slate-800"
          />
          <Button
            className="rounded-xl bg-emerald-500 font-bold text-white hover:bg-emerald-400"
            onClick={() => {
              player.setName(nameDraft.trim() || (player.lang === 'ru' ? 'Игрок' : 'Player'));
              sfx.click();
              setSaved(true);
              setTimeout(() => setSaved(false), 1200);
            }}
          >
            {saved ? '✓' : t('profile.save')}
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/80 bm-text-outline">
        {t('profile.stats')}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {stat(t('profile.stat.wins'), player.stats.wins, '🏆')}
        {stat(t('profile.stat.levels'), Object.keys(player.stars).length, '🗺️')}
        {stat(t('profile.stat.stars'), player.totalStars(), '⭐')}
        {stat(t('profile.stat.bestCascade'), `x${player.stats.bestCascade}`, '🔥')}
        {stat(t('profile.stat.totalScore'), player.stats.totalScore.toLocaleString('ru-RU'), '💫')}
        {stat(t('profile.stat.moves'), player.stats.movesMade, '🎯')}
        {stat(t('profile.stat.streak'), player.stats.bestStreak, '⚡')}
      </div>

      {/* analytics (Волна 2) */}
      <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/80 bm-text-outline">
        {t('profile.analytics')}
      </div>
      <div className="mb-4 rounded-3xl bg-white/90 p-4 shadow">
        <div className="mb-2 text-xs font-semibold text-slate-500">
          {t('profile.analyticsInfo', { n: analyticsCount(), s: analyticsSummary().sessions })}
        </div>
        <Button
          className="w-full rounded-xl bg-slate-700 font-bold text-white hover:bg-slate-600"
          onClick={() => {
            const ok = exportEventsJson({
              player: {
                level: player.maxUnlocked(),
                stars: player.totalStars(),
                coins: player.coins,
                streak: player.streak,
                bestStreak: player.stats.bestStreak,
                wins: player.stats.wins,
              },
            });
            if (ok) {
              sfx.coin();
              setExported(true);
              setTimeout(() => setExported(false), 1500);
            }
          }}
        >
          {exported ? `✓ ${t('profile.exportDone')}` : `⬇️ ${t('profile.export')}`}
        </Button>
      </div>

      {/* settings */}
      <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/80 bm-text-outline">
        {t('settings.title')}
      </div>
      <div className="flex flex-col gap-2 rounded-3xl bg-white/90 p-4 shadow">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">🌐 {t('settings.language')}</span>
          <div className="flex gap-1">
            {(['ru', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  player.setLang(l);
                  sfx.click();
                }}
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  player.lang === l ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {l === 'ru' ? 'Русский' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">🔊 {t('settings.sound')}</span>
          <Switch
            checked={player.sound}
            onCheckedChange={(v) => {
              player.setSound(v);
              if (v) sfx.click();
            }}
          />
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm font-bold text-slate-700">🗑️ {t('settings.reset')}</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="rounded-xl">
                {t('settings.reset')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-xs rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings.reset')}</AlertDialogTitle>
                <AlertDialogDescription>{t('settings.resetConfirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('settings.resetNo')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    player.resetAll();
                    setNameDraft('');
                  }}
                >
                  {t('settings.resetYes')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
