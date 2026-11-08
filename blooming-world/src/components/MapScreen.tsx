'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BloomingBackground } from './game/BloomingBackground';
import { CHAPTERS, chapterTheme } from '@/lib/game/themes';
import { CHAPTER_SIZE, TOTAL_CHAPTERS, TOTAL_LEVELS } from '@/lib/game/levels';
import { usePlayer, useT } from '@/lib/store';
import { PIGGY_WINS_TARGET } from '@/lib/game/garden';
import { WEEKEND_EVENTS, dateKeyOf, weekendEventFor } from '@/lib/game/events';
import { logEvent } from '@/lib/game/analytics';
import { sfx } from '@/lib/game/sound';

interface MapScreenProps {
  onPlay: (level: number, opts?: { daily?: boolean }) => void;
}

export function MapScreen({ onPlay }: MapScreenProps) {
  const t = useT();
  const player = usePlayer();
  const [piggyOpen, setPiggyOpen] = useState(false);
  const [piggyGot, setPiggyGot] = useState(0);
  const maxUnlocked = player.maxUnlocked();
  const currentChapter = Math.min(TOTAL_CHAPTERS - 1, Math.floor((maxUnlocked - 1) / CHAPTER_SIZE));
  const totalStars = player.totalStars();
  const starsAvail = player.starsAvailable();
  const piggyReady = player.piggy.wins >= PIGGY_WINS_TARGET;
  /* Волна 4: уровень дня + ивент выходных (сами перекатываются в 00:00) */
  const daily = player.computeDaily();
  const weekendId = weekendEventFor(dateKeyOf(new Date()));
  const weekend = weekendId ? WEEKEND_EVENTS[weekendId] : null;

  /* фиксация/перекат уровня дня — ТОЛЬКО из эффектов (не в рендере) */
  useEffect(() => {
    player.ensureDaily();
    const id = setInterval(() => player.ensureDaily(), 30000);
    return () => clearInterval(id);
  }, [player]);

  const doOpenPiggy = () => {
    const got = player.openPiggy();
    if (got > 0) {
      sfx.coin();
      setTimeout(() => sfx.star(3), 200);
      logEvent('piggy_open', { coins: got });
      setPiggyGot(got);
    }
  };

  const chapterBlooming = (ch: number) => {
    const levels = Array.from({ length: CHAPTER_SIZE }, (_, i) => ch * CHAPTER_SIZE + i + 1);
    const cleared = levels.filter((lv) => (player.stars[lv] ?? 0) > 0).length;
    return cleared;
  };

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white bm-text-outline">
            {t('app.title')}
          </h1>
          <p className="text-xs text-white/80 bm-text-outline">{t('app.subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-black shadow-lg ${
              starsAvail < totalStars ? 'bg-white/90 text-emerald-800' : 'bg-amber-400/95 text-amber-950'
            }`}
            title={t('garden.subtitle')}
          >
            ⭐ {starsAvail}
          </div>
          <button
            type="button"
            className={`piggy-pill ${piggyReady ? 'piggy-pill-ready' : ''}`}
            onClick={() => {
              sfx.click();
              if (piggyReady) doOpenPiggy();
              else setPiggyOpen(true);
            }}
            aria-label={t('piggy.title')}
          >
            🐷 {player.piggy.coins}
            <span className="piggy-meter" aria-hidden>
              {Array.from({ length: PIGGY_WINS_TARGET }, (_, i) => (
                <span key={i} className={i < player.piggy.wins ? 'on' : ''} />
              ))}
            </span>
          </button>
        </div>
      </div>

      <Button
        className="mb-3 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-5 text-lg font-black text-white shadow-lg hover:from-emerald-400 hover:to-teal-400"
        onClick={() => {
          sfx.click();
          onPlay(maxUnlocked);
        }}
      >
        ▶ {t('map.continue')} · {t('map.level')} {maxUnlocked}
      </Button>

      {/* Волна 4: уровень дня */}
      <div
        className={`mb-3 flex items-center gap-3 rounded-3xl p-3 shadow-lg ${
          daily.done ? 'bg-white/15 backdrop-blur-sm' : 'bg-gradient-to-r from-indigo-500/95 to-violet-500/95'
        }`}
        style={{ border: '2px solid rgba(255,255,255,.35)' }}
      >
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${daily.done ? 'bg-white/25' : 'bg-white/95'}`}>
          {daily.done ? '✅' : '📅'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-black text-white bm-text-outline">
            {t('daily.title')}
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-amber-950">×2</span>
          </div>
          <div className="truncate text-[11px] font-bold text-white/85 bm-text-outline">
            {daily.done ? t('daily.done') : t('daily.sub')}
          </div>
        </div>
        {!daily.done && (
          <Button
            size="sm"
            className="h-9 shrink-0 rounded-full bg-amber-400 px-4 text-sm font-black text-amber-950 hover:bg-amber-300"
            onClick={() => {
              sfx.click();
              logEvent('daily_start', { level: daily.level, date: daily.date });
              onPlay(daily.level, { daily: true });
            }}
          >
            {t('daily.play', { n: daily.level })}
          </Button>
        )}
      </div>

      {/* Волна 4: баннер ивента выходных (сб/вс) */}
      {weekend && (
        <div
          className="mb-3 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-400/95 to-orange-500/95 p-3 shadow-lg"
          style={{ border: '2px solid rgba(255,255,255,.4)' }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-2xl">
            {weekend.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-amber-950">
              {weekend.name[player.lang]}
              <span className="ml-1.5 rounded-full bg-amber-950/25 px-1.5 py-0.5 text-[10px] text-white">{t('event.today')}</span>
            </div>
            <div className="truncate text-[11px] font-bold text-amber-950/85">{weekend.desc[player.lang]}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {CHAPTERS.map((ch) => {
          const unlocked = ch.id <= currentChapter;
          const bloomed = chapterBlooming(ch.id) === CHAPTER_SIZE;
          const theme = chapterTheme(ch.id);
          return (
            <div
              key={ch.id}
              className={`relative overflow-hidden rounded-3xl ${
                unlocked ? '' : 'opacity-70 saturate-0'
              }`}
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,.3)', border: '2px solid rgba(255,255,255,.25)' }}
            >
              <BloomingBackground bg={theme.bg} seed={ch.id + 11} />
              <div className="relative z-10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white/80 bm-text-outline">
                      {t('map.chapter')} {ch.id + 1}
                    </div>
                    <div className="text-lg font-black text-white bm-text-outline">
                      {ch.name[player.lang]}
                    </div>
                    <div className="text-[11px] text-white/85 bm-text-outline">
                      {ch.tagline[player.lang]}
                    </div>
                  </div>
                  {bloomed && (
                    <div className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-black text-emerald-700 shadow">
                      🌸 {t('map.bloomed')}
                    </div>
                  )}
                </div>

                <div className="mt-2.5 grid grid-cols-5 gap-2">
                  {Array.from({ length: CHAPTER_SIZE }, (_, i) => {
                    const lv = ch.id * CHAPTER_SIZE + i + 1;
                    const lvStars = player.stars[lv] ?? 0;
                    const lvUnlocked = lv <= maxUnlocked;
                    const isCurrent = lv === maxUnlocked && ch.id === currentChapter;
                    return (
                      <button
                        key={lv}
                        type="button"
                        disabled={!lvUnlocked}
                        onClick={() => {
                          sfx.click();
                          onPlay(lv);
                        }}
                        className={`flex flex-col items-center rounded-2xl py-1.5 text-xs font-black transition ${
                          lvUnlocked
                            ? isCurrent
                              ? 'bg-amber-400 text-amber-950 shadow-lg ring-2 ring-white'
                              : 'bg-white/85 text-slate-700 hover:bg-white'
                            : 'bg-black/40 text-white/50'
                        }`}
                        aria-label={`${t('map.level')} ${lv}`}
                      >
                        <span>{lvUnlocked ? lv : '🔒'}</span>
                        <span className="text-[9px] leading-tight text-amber-500">
                          {lvStars > 0 ? '⭐'.repeat(lvStars) : lvUnlocked ? '' : '·'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!unlocked && (
                  <div className="mt-2 text-center text-[11px] font-bold text-white/80 bm-text-outline">
                    {t('map.nextChapter', { n: maxUnlocked - (ch.id * CHAPTER_SIZE) })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/60">{t('map.comingSoon')}</p>

      {/* Волна 3: копилка — статус / вскрытие */}
      <Dialog open={piggyOpen} onOpenChange={setPiggyOpen}>
        <DialogContent className="max-w-xs rounded-3xl border-0 bg-gradient-to-b from-pink-500 to-rose-600 text-white">
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-xl font-black">🐷 {t('piggy.title')}</DialogTitle>
            <DialogDescription className="sr-only">{t('piggy.title')}</DialogDescription>
            <div className="mt-1 text-5xl" style={{ animation: 'piggy-wiggle 1.1s ease-in-out infinite' }}>🐷</div>
            <div className="mt-2 rounded-full bg-black/25 px-4 py-1.5 text-lg font-black">
              🪙 {player.piggy.coins}
            </div>
            <div className="piggy-meter mt-2" aria-hidden>
              {Array.from({ length: PIGGY_WINS_TARGET }, (_, i) => (
                <span key={i} className={i < player.piggy.wins ? 'on' : ''} />
              ))}
            </div>
            <div className="mt-1 text-xs font-bold text-pink-100">
              {piggyReady ? t('piggy.ready') : t('piggy.progress', { n: PIGGY_WINS_TARGET - player.piggy.wins })}
            </div>
            <div className="text-[11px] text-pink-100/85">{t('piggy.hint')}</div>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {piggyReady ? (
              <Button
                className="rounded-full bg-amber-400 font-black text-amber-950 hover:bg-amber-300"
                onClick={() => {
                  doOpenPiggy();
                  setPiggyOpen(false);
                }}
              >
                {t('piggy.collect', { n: player.piggy.coins })}
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={() => setPiggyOpen(false)}
              >
                {t('common.close')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Волна 3: копилка вскрыта — результат */}
      <Dialog open={piggyGot > 0} onOpenChange={(o) => !o && setPiggyGot(0)}>
        <DialogContent className="max-w-xs rounded-3xl border-0 bg-gradient-to-b from-amber-400 to-orange-500 text-white">
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-2xl font-black">🎉 {t('piggy.full')}</DialogTitle>
            <DialogDescription className="sr-only">{t('piggy.full')}</DialogDescription>
            <div className="mt-2 text-5xl">🪙</div>
            <div className="mt-2 rounded-full bg-white/95 px-5 py-2 text-xl font-black text-orange-600 shadow-lg">
              +{piggyGot}
            </div>
          </DialogHeader>
          <Button
            className="rounded-full bg-white font-black text-orange-600 hover:bg-orange-50"
            onClick={() => setPiggyGot(0)}
          >
            {t('common.ok')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
