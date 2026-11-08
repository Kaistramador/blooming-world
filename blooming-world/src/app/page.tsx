'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameScreen } from '@/components/game/GameScreen';
import { MapScreen } from '@/components/MapScreen';
import { ShopScreen } from '@/components/ShopScreen';
import { RanksScreen } from '@/components/RanksScreen';
import { ProfileScreen } from '@/components/ProfileScreen';
import { BloomingBackground } from '@/components/game/BloomingBackground';
import { chapterTheme } from '@/lib/game/themes';
import { CHAPTER_SIZE } from '@/lib/game/levels';
import { usePlayer } from '@/lib/store';
import { logSessionStart } from '@/lib/game/analytics';
import { sfx } from '@/lib/game/sound';
import { translate } from '@/lib/i18n';

type Screen = 'map' | 'shop' | 'ranks' | 'profile';

const NAV: { key: Screen; icon: string; labelKey: string }[] = [
  { key: 'map', icon: '🗺️', labelKey: 'nav.map' },
  { key: 'shop', icon: '🛍️', labelKey: 'nav.shop' },
  { key: 'ranks', icon: '🏆', labelKey: 'nav.ranks' },
  { key: 'profile', icon: '👤', labelKey: 'nav.profile' },
];

export default function Home() {
  const player = usePlayer();
  const hydrated = useSyncExternalStore(
    (cb) => usePlayer.persist.onFinishHydration(cb),
    () => usePlayer.persist.hasHydrated(),
    () => false,
  );
  const [screen, setScreen] = useState<Screen>('map');
  const [playingLevel, setPlayingLevel] = useState<number | null>(null);

  useEffect(() => {
    if (hydrated) logSessionStart();
  }, [hydrated]);

  const t = (key: string) => translate(player.lang, key);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-800 to-teal-900">
        <div className="text-4xl font-black text-white">
          🌱<span className="bm-ne-blink">…</span>
        </div>
      </main>
    );
  }

  const currentChapter = Math.floor((player.maxUnlocked() - 1) / CHAPTER_SIZE);
  const theme = chapterTheme(Math.max(0, currentChapter));

  if (playingLevel !== null) {
    return (
      <main>
        <GameScreen
          key={playingLevel}
          level={playingLevel}
          onExit={() => setPlayingLevel(null)}
          onLevelChange={(lv) => setPlayingLevel(lv)}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: theme.bg.sky }}>
      <BloomingBackground bg={theme.bg} seed={99} />
      <div className="relative z-10">
        {screen === 'map' && <MapScreen onPlay={(lv) => setPlayingLevel(lv)} />}
        {screen === 'shop' && <ShopScreen />}
        {screen === 'ranks' && <RanksScreen />}
        {screen === 'profile' && <ProfileScreen />}
      </div>

      {/* bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/20 bg-black/45 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {NAV.map((item) => {
            const active = screen === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  sfx.click();
                  setScreen(item.key);
                }}
                className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
                  active ? 'bg-white/95 text-slate-800 shadow' : 'text-white/75 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="mt-0.5">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
