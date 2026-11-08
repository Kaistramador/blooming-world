'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  BOOSTERS,
  COIN_PACKS,
  GEM_SKINS,
  AVATARS,
  FRAMES,
  NAME_STYLES,
  TILE_EFFECTS,
  AVATAR_EFFECTS,
  NAME_EFFECTS,
  seasonalBundleFor,
} from '@/lib/game/shop';
import type { BoosterId } from '@/lib/game/shop';
import { SEASONS, seasonOn } from '@/lib/game/events';
import type { SeasonId } from '@/lib/game/events';
import { GEM_SHAPE_CLIP } from '@/lib/game/shapes';
import { usePlayer, useT } from '@/lib/store';
import type { Owned, Equipped } from '@/lib/store';
import { sfx } from '@/lib/game/sound';
import { PlayerAvatar } from './game/PlayerBadge';

interface ShopScreenProps {
  onGoPlay?: () => void;
}

export function ShopScreen(_props: ShopScreenProps) {
  const t = useT();
  const player = usePlayer();
  const [tab, setTab] = useState('boosters');
  const [demoPack, setDemoPack] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  /* Волна 4: сезонная коллекция — витрина определяется календарём */
  const season: SeasonId = seasonOn(new Date());
  const seasonDef = SEASONS[season];
  const bundle = seasonalBundleFor(season);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 1600);
  };

  const coinBtn =
    'rounded-full bg-amber-400 font-black text-amber-950 hover:bg-amber-300';
  const equipBtn =
    'rounded-full bg-emerald-500 font-bold text-white hover:bg-emerald-400';
  const ownedBtn =
    'rounded-full bg-slate-200 font-bold text-slate-500';

  const CardShell = ({
    title,
    subtitle,
    preview,
    action,
  }: {
    title: string;
    subtitle?: string;
    preview: React.ReactNode;
    action: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center text-2xl">{preview}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-slate-800">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
        <div className="mt-1.5">{action}</div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-24 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white bm-text-outline">{t('shop.title')}</h1>
        <div className="flex items-center gap-1 rounded-full bg-amber-400/95 px-3 py-1.5 text-sm font-black text-amber-950 shadow-lg">
          🪙 {player.coins.toLocaleString('ru-RU')}
        </div>
      </div>

      {/* Волна 4: сезонная коллекция — 6 предметов текущего сезона */}
      <div
        className="mb-3 rounded-3xl bg-gradient-to-r from-rose-500/90 to-amber-400/90 p-3 shadow-lg"
        style={{ border: '2px solid rgba(255,255,255,.4)' }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-black text-white bm-text-outline">{t('shop.seasonal')}</div>
          <div className="shrink-0 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-black text-rose-600">
            {t('shop.seasonalSub', { icon: seasonDef.icon, season: seasonDef.name[player.lang] })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            {
              id: bundle.skin.id,
              preview: <span>{bundle.skin.glyphs?.slice(0, 2).join('')}</span>,
              name: bundle.skin.name[player.lang],
              price: bundle.skin.price,
              ownedKind: 'skins' as keyof Owned,
              equipKind: 'skin' as keyof Equipped,
            },
            ...bundle.avatars.map((a) => ({
              id: a.id,
              preview: <span>{a.emoji}</span>,
              name: a.emoji,
              price: a.price,
              ownedKind: 'avatars' as keyof Owned,
              equipKind: 'avatar' as keyof Equipped,
            })),
            {
              id: bundle.frame.id,
              preview: (
                <span
                  className="inline-block h-7 w-7 rounded-full bg-gradient-to-br from-amber-200 to-amber-400"
                  style={{ boxShadow: bundle.frame.css }}
                />
              ),
              name: bundle.frame.name[player.lang],
              price: bundle.frame.price,
              ownedKind: 'frames' as keyof Owned,
              equipKind: 'frame' as keyof Equipped,
            },
            {
              id: bundle.nameStyle.id,
              preview: <span className="font-black text-slate-800">Aa</span>,
              name: bundle.nameStyle.name[player.lang],
              price: bundle.nameStyle.price,
              ownedKind: 'nameStyles' as keyof Owned,
              equipKind: 'nameStyle' as keyof Equipped,
            },
            {
              id: bundle.effect.id,
              preview: <span>{bundle.effect.visual}</span>,
              name: bundle.effect.name[player.lang],
              price: bundle.effect.price,
              ownedKind: 'effects' as keyof Owned,
              equipKind: 'tileEffect' as keyof Equipped,
            },
          ] as { id: string; preview: React.ReactNode; name: string; price: number; ownedKind: keyof Owned; equipKind: keyof Equipped }[]).map((c) => {
            const owned = player.owned[c.ownedKind].includes(c.id);
            const equipped = player.equipped[c.equipKind] === c.id;
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-white/92 p-2 shadow">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-xl">{c.preview}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-black text-slate-800">{c.name}</div>
                  {equipped ? (
                    <Button size="sm" className="mt-1 h-6 rounded-full bg-slate-200 px-2 text-[10px] font-bold text-slate-500" disabled>
                      ✓
                    </Button>
                  ) : owned ? (
                    <Button
                      size="sm"
                      className={`mt-1 h-6 rounded-full px-2 text-[10px] ${equipBtn}`}
                      onClick={() => {
                        player.equip(c.equipKind, c.id);
                        sfx.click();
                      }}
                    >
                      {t('shop.equip')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`mt-1 h-6 rounded-full px-2 text-[10px] ${coinBtn}`}
                      onClick={() => {
                        if (player.buyCosmetic(c.ownedKind, c.id, c.price)) {
                          player.equip(c.equipKind, c.id);
                          sfx.coin();
                          flash(t('shop.purchased'));
                        } else flash(t('shop.notEnough'));
                      }}
                    >
                      🪙 {c.price}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-3 flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-black/30 p-1.5">
          {[
            ['boosters', t('shop.tab.boosters')],
            ['bank', t('shop.tab.bank')],
            ['skins', t('shop.tab.skins')],
            ['avatars', t('shop.tab.avatars')],
            ['frames', t('shop.tab.frames')],
            ['names', t('shop.tab.names')],
            ['effects', t('shop.tab.effects')],
          ].map(([key, label]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-white/80 data-[state=active]:bg-white data-[state=active]:text-slate-800"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ---------- boosters ---------- */}
        <TabsContent value="boosters" className="flex flex-col gap-2">
          {BOOSTERS.map((b) => {
            const count = player.boosters[b.id] ?? 0;
            return (
              <CardShell
                key={b.id}
                title={`${b.icon} ${b.name[player.lang]}`}
                subtitle={b.desc[player.lang]}
                preview={<span>{b.icon}</span>}
                action={
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      ×{count}
                    </span>
                    <Button
                      size="sm"
                      className={`h-8 px-3 text-xs ${coinBtn}`}
                      onClick={() => {
                        if (player.buyBooster(b.id)) {
                          sfx.coin();
                          flash(t('shop.purchased'));
                        } else flash(t('shop.notEnough'));
                      }}
                    >
                      🪙 {b.price}
                    </Button>
                  </div>
                }
              />
            );
          })}
        </TabsContent>

        {/* ---------- bank ---------- */}
        <TabsContent value="bank" className="flex flex-col gap-2">
          <p className="rounded-2xl bg-amber-100/90 p-3 text-xs font-semibold text-amber-900">
            💳 {t('shop.demoNote')}
          </p>
          {COIN_PACKS.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-2xl shadow-inner">
                🪙
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-800">
                  🪙 {p.coins.toLocaleString('ru-RU')} {p.bonus && <span className="text-emerald-600">{p.bonus}</span>}
                </div>
                <Button
                  size="sm"
                  className={`mt-1.5 h-8 px-3 text-xs ${coinBtn}`}
                  onClick={() => setDemoPack(p.id)}
                >
                  {p.priceLabel}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ---------- gem skins ---------- */}
        <TabsContent value="skins" className="flex flex-col gap-2">
          {GEM_SKINS.map((s) => {
            const owned = player.owned.skins.includes(s.id);
            const equipped = player.equipped.skin === s.id;
            return (
              <CardShell
                key={s.id}
                title={s.name[player.lang]}
                subtitle={equipped ? t('shop.equipped') : owned ? t('shop.owned') : s.glyphs ? s.glyphs.join(' ') : ''}
                preview={
                  s.glyphs ? (
                    <span>{s.glyphs.slice(0, 3).join('')}</span>
                  ) : (
                    <span className="flex gap-1">
                      {/* skin preview: colorblind-safe anchors + their accessibility silhouettes */}
                      {[
                        { c: '#c74134', s: GEM_SHAPE_CLIP[0] },
                        { c: '#f6e04b', s: GEM_SHAPE_CLIP[1] },
                        { c: '#2ea56d', s: GEM_SHAPE_CLIP[2] },
                      ].map(({ c, s }) => (
                        <span
                          key={c}
                          className="inline-block h-5 w-5 shadow"
                          style={{ background: c, clipPath: s ?? undefined, borderRadius: s ? '4%' : '50%' }}
                        />
                      ))}
                    </span>
                  )
                }
                action={
                  equipped ? (
                    <Button size="sm" className={`h-8 px-3 text-xs ${ownedBtn}`} disabled>
                      ✓ {t('shop.equipped')}
                    </Button>
                  ) : owned ? (
                    <Button
                      size="sm"
                      className={`h-8 px-3 text-xs ${equipBtn}`}
                      onClick={() => {
                        player.equip('skin', s.id);
                        sfx.click();
                      }}
                    >
                      {t('shop.equip')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`h-8 px-3 text-xs ${coinBtn}`}
                      onClick={() => {
                        if (player.buyCosmetic('skins', s.id, s.price)) {
                          player.equip('skin', s.id);
                          sfx.coin();
                          flash(t('shop.purchased'));
                        } else flash(t('shop.notEnough'));
                      }}
                    >
                      {s.price === 0 ? t('shop.free') : `🪙 ${s.price}`}
                    </Button>
                  )
                }
              />
            );
          })}
        </TabsContent>

        {/* ---------- avatars ---------- */}
        <TabsContent value="avatars" className="grid grid-cols-2 gap-2">
          {AVATARS.map((a) => {
            const owned = player.owned.avatars.includes(a.id);
            const equipped = player.equipped.avatar === a.id;
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-2xl bg-white/90 p-2.5 shadow">
                <PlayerAvatar avatarId={a.id} frameId="fr-none" size={40} />
                <div className="min-w-0 flex-1">
                  {equipped ? (
                    <span className="text-xs font-black text-emerald-600">✓ {t('shop.equipped')}</span>
                  ) : owned ? (
                    <Button
                      size="sm"
                      className={`h-7 px-2 text-xs ${equipBtn}`}
                      onClick={() => {
                        player.equip('avatar', a.id);
                        sfx.click();
                      }}
                    >
                      {t('shop.equip')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`h-7 px-2 text-xs ${coinBtn}`}
                      onClick={() => {
                        if (player.buyCosmetic('avatars', a.id, a.price)) {
                          player.equip('avatar', a.id);
                          sfx.coin();
                          flash(t('shop.purchased'));
                        } else flash(t('shop.notEnough'));
                      }}
                    >
                      {a.price === 0 ? t('shop.free') : `🪙 ${a.price}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ---------- frames ---------- */}
        <TabsContent value="frames" className="grid grid-cols-2 gap-2">
          {FRAMES.map((f) => {
            const owned = player.owned.frames.includes(f.id);
            const equipped = player.equipped.frame === f.id;
            return (
              <div key={f.id} className="flex items-center gap-2 rounded-2xl bg-white/90 p-2.5 shadow">
                <PlayerAvatar avatarId={player.equipped.avatar} frameId={f.id} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold text-slate-700">{f.name[player.lang]}</div>
                  {equipped ? (
                    <span className="text-xs font-black text-emerald-600">✓</span>
                  ) : owned ? (
                    <Button
                      size="sm"
                      className={`h-7 px-2 text-xs ${equipBtn}`}
                      onClick={() => {
                        player.equip('frame', f.id);
                        sfx.click();
                      }}
                    >
                      {t('shop.equip')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`h-7 px-2 text-xs ${coinBtn}`}
                      onClick={() => {
                        if (player.buyCosmetic('frames', f.id, f.price)) {
                          player.equip('frame', f.id);
                          sfx.coin();
                          flash(t('shop.purchased'));
                        } else flash(t('shop.notEnough'));
                      }}
                    >
                      {f.price === 0 ? t('shop.free') : `🪙 ${f.price}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ---------- name styles ---------- */}
        <TabsContent value="names" className="flex flex-col gap-2">
          {NAME_STYLES.map((s) => {
            const owned = player.owned.nameStyles.includes(s.id);
            const equipped = player.equipped.nameStyle === s.id;
            const styleObj: React.CSSProperties = {};
            for (const decl of s.css.split(';')) {
              const [prop, value] = decl.split(':');
              if (!prop || !value) continue;
              const key = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              styleObj[key] = value.trim();
            }
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow">
                <div className="flex h-10 min-w-24 flex-1 items-center justify-center rounded-xl bg-slate-800">
                  <span className="truncate px-2 text-sm" style={styleObj}>
                    {player.name || 'Player'}
                  </span>
                </div>
                {equipped ? (
                  <span className="text-xs font-black text-emerald-600">✓</span>
                ) : owned ? (
                  <Button
                    size="sm"
                    className={`h-8 px-3 text-xs ${equipBtn}`}
                    onClick={() => {
                      player.equip('nameStyle', s.id);
                      sfx.click();
                    }}
                  >
                    {t('shop.equip')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={`h-8 px-3 text-xs ${coinBtn}`}
                    onClick={() => {
                      if (player.buyCosmetic('nameStyles', s.id, s.price)) {
                        player.equip('nameStyle', s.id);
                        sfx.coin();
                        flash(t('shop.purchased'));
                      } else flash(t('shop.notEnough'));
                    }}
                  >
                    {s.price === 0 ? t('shop.free') : `🪙 ${s.price}`}
                  </Button>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* ---------- effects ---------- */}
        <TabsContent value="effects" className="flex flex-col gap-3">
          {[
            { label: t('shop.effectTile'), list: TILE_EFFECTS, kind: 'tileEffect' as const, ownedKey: 'effects' as const, equipped: player.equipped.tileEffect, preview: (e: string) => <span>{e}</span> },
            { label: t('shop.effectAvatar'), list: AVATAR_EFFECTS, kind: 'avatarEffect' as const, ownedKey: 'effects' as const, equipped: player.equipped.avatarEffect, preview: (e: string) => <span>✨</span> },
            { label: t('shop.effectName'), list: NAME_EFFECTS, kind: 'nameEffect' as const, ownedKey: 'effects' as const, equipped: player.equipped.nameEffect, preview: (e: string) => <span>«{e}»</span> },
          ].map((group) => (
            <div key={group.kind}>
              <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-white/80 bm-text-outline">
                {group.label}
              </div>
              <div className="flex flex-col gap-2">
                {group.list.map((e) => {
                  const owned = player.owned[group.ownedKey].includes(e.id);
                  const equipped = group.equipped === e.id;
                  return (
                    <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 shadow">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg text-white">
                        {group.preview(e.visual)}
                      </div>
                      <div className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                        {e.name[player.lang]}
                      </div>
                      {equipped ? (
                        <span className="text-xs font-black text-emerald-600">✓</span>
                      ) : owned ? (
                        <Button
                          size="sm"
                          className={`h-8 px-3 text-xs ${equipBtn}`}
                          onClick={() => {
                            player.equip(group.kind, e.id);
                            sfx.click();
                          }}
                        >
                          {t('shop.equip')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={`h-8 px-3 text-xs ${coinBtn}`}
                          onClick={() => {
                            if (player.buyCosmetic(group.ownedKey, e.id, e.price)) {
                              player.equip(group.kind, e.id);
                              sfx.coin();
                              flash(t('shop.purchased'));
                            } else flash(t('shop.notEnough'));
                          }}
                        >
                          🪙 {e.price}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* demo purchase dialog */}
      <Dialog open={!!demoPack} onOpenChange={(o) => !o && setDemoPack(null)}>
        <DialogContent className="max-w-xs rounded-3xl">
          {demoPack && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">🪙 {COIN_PACKS.find((p) => p.id === demoPack)?.coins.toLocaleString('ru-RU')}</DialogTitle>
                <DialogDescription className="text-center text-sm">{t('shop.demoNote')}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button
                  className={`h-10 ${coinBtn}`}
                  onClick={() => {
                    const pack = COIN_PACKS.find((p) => p.id === demoPack);
                    if (pack) {
                      player.addCoins(pack.coins);
                      sfx.coin();
                      flash(t('shop.purchased'));
                    }
                    setDemoPack(null);
                  }}
                >
                  {t('shop.simulatePay')}
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 rounded-full bg-slate-200 text-slate-700"
                  onClick={() => setDemoPack(null)}
                >
                  {t('game.cancel')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* toast */}
      {msg && (
        <div className="pointer-events-none fixed left-1/2 top-14 z-50 -translate-x-1/2">
          <div className="bm-toast-in rounded-full bg-black/85 px-4 py-2 text-sm font-bold text-white shadow-lg">
            {msg}
          </div>
        </div>
      )}
    </div>
  );
}
