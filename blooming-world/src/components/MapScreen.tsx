'use client';

import { Button } from '@/components/ui/button';
import { BloomingBackground } from './game/BloomingBackground';
import { CHAPTERS, chapterTheme } from '@/lib/game/themes';
import { CHAPTER_SIZE, TOTAL_CHAPTERS, TOTAL_LEVELS } from '@/lib/game/levels';
import { usePlayer, useT } from '@/lib/store';
import { sfx } from '@/lib/game/sound';

interface MapScreenProps {
  onPlay: (level: number) => void;
}

export function MapScreen({ onPlay }: MapScreenProps) {
  const t = useT();
  const player = usePlayer();
  const maxUnlocked = player.maxUnlocked();
  const currentChapter = Math.min(TOTAL_CHAPTERS - 1, Math.floor((maxUnlocked - 1) / CHAPTER_SIZE));
  const totalStars = player.totalStars();

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
        <div className="flex items-center gap-1 rounded-full bg-amber-400/95 px-3 py-1.5 text-sm font-black text-amber-950 shadow-lg">
          ⭐ {totalStars}
        </div>
      </div>

      <Button
        className="mb-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-5 text-lg font-black text-white shadow-lg hover:from-emerald-400 hover:to-teal-400"
        onClick={() => {
          sfx.click();
          onPlay(maxUnlocked);
        }}
      >
        ▶ {t('map.continue')} · {t('map.level')} {maxUnlocked}
      </Button>

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
    </div>
  );
}
