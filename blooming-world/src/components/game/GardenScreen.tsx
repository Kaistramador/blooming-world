'use client';

/*
 * Волна 3 «Сад»: метаигра восстановления сада за звёзды.
 * Сцена: небо/солнце/облака/холмы/полосы зон, объекты растут
 * на своих местах. Расцвет сада (%) подсвечивает мир.
 * Доступность: замки — пиктограмма + подпись цены, зоны —
 * подписи, объекты — эмодзи + имя (§5.2).
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { usePlayer, useT } from '@/lib/store';
import {
  GARDEN_OBJECTS,
  GARDEN_ZONE_CHAPTER,
  gardenCoinsBack,
  gardenZoneUnlockLevel,
} from '@/lib/game/garden';
import type { GardenObjectDef, GardenZone } from '@/lib/game/garden';
import { sfx } from '@/lib/game/sound';

const ZONE_BANDS: { zone: GardenZone; top: number; height: number; ground: string; groundDim: string }[] = [
  { zone: 0, top: 0, height: 33, ground: 'linear-gradient(180deg,#7fb86b,#5d9a4e)', groundDim: 'linear-gradient(180deg,#8b9377,#6f7a60)' },
  { zone: 1, top: 33, height: 34, ground: 'linear-gradient(180deg,#63a94f,#3f8a3c)', groundDim: 'linear-gradient(180deg,#7d8a68,#5c6e4e)' },
  { zone: 2, top: 67, height: 33, ground: 'linear-gradient(180deg,#4f9c46,#32743a)', groundDim: 'linear-gradient(180deg,#6f8560,#4c6247)' },
];

const ZONE_NAMES = ['garden.zone0', 'garden.zone1', 'garden.zone2'] as const;

/** Доля восстановленного сада 0..1 */
function bloomRatio(restored: number): number {
  return restored / GARDEN_OBJECTS.length;
}

export function GardenScreen({ onExit }: { onExit: () => void }) {
  const t = useT();
  const player = usePlayer();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const maxUnlocked = player.maxUnlocked();
  const gardenOpen = maxUnlocked > 10; // после главы 1 (10 уровней)
  const restored = player.garden.restored;
  const restoredSet = useMemo(() => new Set(restored), [restored]);
  const starsAvail = player.starsAvailable();
  const bloom = bloomRatio(restored.length);

  const toast = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
  };

  const zoneUnlocked = (zone: GardenZone) =>
    gardenOpen && maxUnlocked > gardenZoneUnlockLevel(zone);

  const handleSlot = (obj: GardenObjectDef) => {
    if (restoredSet.has(obj.id)) return;
    if (!zoneUnlocked(obj.zone)) {
      sfx.click();
      toast(t('garden.zoneLocked', { n: GARDEN_ZONE_CHAPTER[obj.zone] + 1 }));
      return;
    }
    sfx.click();
    setConfirmId(obj.id);
  };

  const confirmObj = confirmId ? GARDEN_OBJECTS.find((o) => o.id === confirmId) ?? null : null;

  const doRestore = (obj: GardenObjectDef) => {
    if (player.restoreGarden(obj.id)) {
      sfx.coin();
      setTimeout(() => sfx.star(2), 180);
      toast(t('garden.coinsBack', { n: gardenCoinsBack(obj.cost) }));
    } else {
      toast(t('garden.needStars'));
    }
    setConfirmId(null);
  };

  /* сколько декоративных «лепестков» живёт в сцене — по расцвету */
  const petalCount = Math.floor(bloom * 10);
  const skyWarm = bloom; // 0..1

  /* ---------------- закрытый сад ---------------- */
  if (!gardenOpen) {
    return (
      <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full bg-white/25 text-white hover:bg-white/40"
            onClick={() => {
              sfx.click();
              onExit();
            }}
          >
            ← {t('game.exit')}
          </Button>
        </div>
        <div className="mt-8 flex flex-col items-center rounded-3xl bg-black/35 p-8 text-center backdrop-blur-sm">
          <div className="text-6xl">🌱</div>
          <h2 className="mt-3 text-xl font-black text-white bm-text-outline">{t('garden.lockedTitle')}</h2>
          <p className="mt-1 text-sm text-white/85 bm-text-outline">{t('garden.lockedHint')}</p>
          <div className="mt-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
            {t('map.chapter')} 1 · {Math.min(10, maxUnlocked - 1)}/10
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- сцена сада ---------------- */
  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full bg-white/25 text-white hover:bg-white/40"
          onClick={() => {
            sfx.click();
            onExit();
          }}
        >
          ← {t('game.exit')}
        </Button>
        <div className="flex flex-col items-center">
          <span className="bm-text-outline text-lg font-black leading-tight text-white">{t('garden.title')}</span>
          <span className="bm-text-outline text-[10px] text-white/80">{t('garden.subtitle')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-amber-400/95 px-2.5 py-1 text-xs font-black text-amber-950 shadow">⭐ {starsAvail}</span>
          <span className="rounded-full bg-amber-400/95 px-2.5 py-1 text-xs font-black text-amber-950 shadow">🪙 {player.coins}</span>
        </div>
      </div>

      {/* progress */}
      <div className="mt-2.5 rounded-2xl bg-black/30 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[11px] font-bold text-white bm-text-outline">
          <span>🌸 {t('garden.bloom')}</span>
          <span>{t('garden.restoredCount', { n: restored.length, m: GARDEN_OBJECTS.length })}</span>
        </div>
        <div className="gd-bloom-bar mt-1.5">
          <div className="gd-bloom-fill" style={{ width: `${Math.round(bloom * 100)}%` }} />
        </div>
      </div>

      {/* scene */}
      <div className="gd-scene mt-3" style={{ background: 'linear-gradient(180deg,#87c7e8 0%,#b5e0c8 34%,#8fce7a 55%,#63a94f 100%)' }}>
        {/* sky reacts to bloom */}
        <div
          className="gd-sky"
          style={{ background: `linear-gradient(180deg, rgba(96,125,139,${0.42 * (1 - skyWarm)}) 0%, rgba(255,255,255,0) 45%)` }}
        />
        {bloom > 0.25 && <div className="gd-sun" />}
        {/* clouds */}
        {[0, 1, 2].map((i) => (
          <div
            key={`cl-${i}`}
            className="gd-cloud"
            style={{ top: `${4 + i * 7}%`, animationDuration: `${70 + i * 25}s`, animationDelay: `${-i * 22}s`, opacity: 0.5 + bloom * 0.45 }}
          />
        ))}
        {/* far hills */}
        <div className="gd-hill" style={{ left: '-18%', top: '20%', width: '70%', height: '18%', background: `rgba(96,150,90,${0.5 + bloom * 0.25})` }} />
        <div className="gd-hill" style={{ right: '-22%', top: '24%', width: '75%', height: '16%', background: `rgba(76,132,80,${0.45 + bloom * 0.25})` }} />

        {/* zone bands */}
        {ZONE_BANDS.map(({ zone, top, height, ground, groundDim }) => {
          const open = zoneUnlocked(zone);
          return (
            <div
              key={`band-${zone}`}
              className="gd-band"
              style={{ top: `${top}%`, height: `${height}%`, background: open ? ground : groundDim, opacity: open ? 1 : 0.75 }}
            >
              <div
                className="gd-band-label"
                style={{ top: 6 }}
              >
                🌄 {t(ZONE_NAMES[zone])}
                {!open && <span className="ml-1 opacity-90">🔒 {t('garden.zoneLocked', { n: GARDEN_ZONE_CHAPTER[zone] + 1 })}</span>}
              </div>
            </div>
          );
        })}

        {/* ambient petals by bloom */}
        {Array.from({ length: petalCount }, (_, i) => (
          <span
            key={`pt-${i}`}
            className="gd-petal"
            style={{
              left: `${(i * 37) % 92 + 3}%`,
              top: `${18 + ((i * 53) % 70)}%`,
              fontSize: 10 + (i % 3) * 4,
              animationDuration: `${3 + (i % 4)}s`,
              animationDelay: `${-i * 0.7}s`,
            }}
          >
            {i % 3 === 0 ? '🌸' : i % 3 === 1 ? '✨' : '🦋'}
          </span>
        ))}

        {/* objects */}
        {GARDEN_OBJECTS.map((obj) => {
          const isRestored = restoredSet.has(obj.id);
          const open = zoneUnlocked(obj.zone);
          const canAfford = starsAvail >= obj.cost;
          return (
            <div key={obj.id} className="gd-slot" style={{ left: `${obj.x}%`, top: `${obj.y}%` }}>
              {isRestored ? (
                <button
                  type="button"
                  className="gd-obj"
                  aria-label={obj.name[player.lang]}
                  onClick={() => {
                    sfx.click();
                    toast(`🌳 ${obj.name[player.lang]}`);
                  }}
                >
                  <span className="gd-obj-emoji" style={{ fontSize: `calc(26px * ${obj.size})`, animationDelay: `${(obj.x % 7) * 0.4}s` }}>
                    {obj.emoji}
                  </span>
                  <span className="gd-obj-name">{obj.name[player.lang]}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`gd-obj gd-empty-slot ${open ? '' : 'opacity-70'}`}
                  aria-label={`${obj.name[player.lang]} — ${t('garden.restore', { n: obj.cost })}`}
                  onClick={() => handleSlot(obj)}
                >
                  <span className={`gd-empty ${open && canAfford ? 'gd-empty-can' : ''}`}>
                    {open ? '➕' : '🔒'}
                  </span>
                  <span className="gd-cost">⭐{obj.cost}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {bloom >= 1 && (
        <div className="mt-3 rounded-2xl bg-amber-400/90 px-4 py-2 text-center text-sm font-black text-amber-950 shadow-lg">
          🌈 {t('garden.done')}
        </div>
      )}

      {/* toast */}
      {flash && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2">
          <div className="bm-toast-in rounded-full bg-black/80 px-4 py-2 text-sm font-bold text-white shadow-lg">
            {flash}
          </div>
        </div>
      )}

      {/* confirm restore dialog */}
      <Dialog open={!!confirmObj} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent className="max-w-xs rounded-3xl border-0 bg-white text-slate-800">
          {confirmObj && (
            <>
              <DialogHeader className="items-center">
                <DialogTitle className="text-center">
                  <span className="mr-1 text-3xl">{confirmObj.emoji}</span>
                  {t('garden.confirmTitle', { name: confirmObj.name[player.lang] })}
                </DialogTitle>
                <DialogDescription className="text-center text-sm">
                  {t('garden.restore', { n: confirmObj.cost })} · {t('garden.coinsBack', { n: gardenCoinsBack(confirmObj.cost) })}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button
                  className="rounded-full bg-emerald-500 font-black text-white hover:bg-emerald-400"
                  onClick={() => doRestore(confirmObj)}
                >
                  🌱 {t('garden.restore', { n: confirmObj.cost })}
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                  onClick={() => setConfirmId(null)}
                >
                  {t('garden.cancel')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
