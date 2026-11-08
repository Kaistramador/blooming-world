'use client';

import { memo } from 'react';
import type { Tile } from '@/lib/game/types';
import type { ChapterTheme } from '@/lib/game/themes';
import type { GemSkinDef } from '@/lib/game/shop';
import { gemShapeCss } from '@/lib/game/shapes';

const SPECIAL_GLYPH: Record<string, string> = {
  rocketH: '⇢',
  rocketV: '⇣',
  bomb: '✹',
  rainbow: '❈',
};

/* colorblind-safe rainbow (same hue anchors as the chapter palettes) */
const RAINBOW_BG =
  'conic-gradient(#c74134,#f6e04b,#2ea56d,#3d9be0,#b06fc9,#ef8f2a,#c74134)';
const ITEM_BG = 'linear-gradient(160deg,#a5825a,#7c5c3a 55%,#5c4326)';

interface GemTileProps {
  tile: Tile;
  theme: ChapterTheme;
  skin: GemSkinDef;
  clearing?: boolean;
  born?: boolean;
  spawned?: boolean;
}

function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const GemTileInner = ({ tile, theme, skin, clearing, born, spawned }: GemTileProps) => {
  const st = theme.tile;
  const palette = skin.palette ?? theme.palette;
  const isRainbow = tile.color === -1;
  const isItem = tile.kind === 'item';
  const colorIdx = Math.max(0, Math.min(5, tile.color));
  const base = palette[colorIdx] ?? '#999999';
  const dark = shade(base, -46);
  const light = shade(base, 42);

  /* Silhouette = color-coded shape, identical across chapters & skins
     (colorblind channel #1). Rainbow = circle, item = soft square. */
  const shape = isRainbow
    ? { borderRadius: '50%' }
    : isItem
      ? { borderRadius: '26%' }
      : gemShapeCss(tile.color);

  let background: string;
  if (isRainbow) {
    background = RAINBOW_BG;
  } else if (isItem) {
    background = ITEM_BG;
  } else if (skin.glyphs || st.gradient) {
    background = `linear-gradient(160deg, ${light}, ${base} 55%, ${dark})`;
  } else {
    background = base;
  }

  /* rim that follows the silhouette (accessibility channel #2:
     dark/light outline separates the tile from any background) */
  const rimInset = Math.round((0.06 - st.rimWidth) * 100);
  const rimFilters: string[] = [];
  if (st.pixelShadow && !st.softShadow) rimFilters.push('drop-shadow(0.08em 0.08em 0 rgba(0,0,0,.4))');
  if (st.softShadow) rimFilters.push('drop-shadow(0 0.07em 0.12em rgba(0,0,0,.35))');

  const glowColor = isItem ? '#a5825a' : base;
  const fillFilters = st.glow
    ? [`drop-shadow(0 0 0.2em ${glowColor})`, `drop-shadow(0 0 0.42em ${glowColor}55)`]
    : [];

  /* premium 3D depth: light on top, shade on bottom — inside the
     silhouette (era-strength: flat/pixel eras stay subtle) */
  const bodyShadow =
    st.gloss || st.gradient
      ? 'inset 0 0.05em 0.1em rgba(255,255,255,.45), inset 0 -0.09em 0.16em rgba(0,0,0,.32)'
      : 'inset 0 0.04em 0.06em rgba(255,255,255,.24), inset 0 -0.05em 0.09em rgba(0,0,0,.2)';

  const classes = ['relative', 'w-full', 'h-full', 'select-none'];
  if (clearing) classes.push('bm-pop');
  else if (born) classes.push('bm-born');
  else if (spawned) classes.push('bm-fall-in');
  else if (st.wobble) classes.push('bm-wobble');
  if (isRainbow) classes.push('bm-rainbow-spin');
  else if (tile.special !== 'none') classes.push('bm-special-pulse');

  return (
    <div
      className={classes.join(' ')}
      style={{
        containerType: 'size',
        transform: clearing || born || spawned || st.wobble || isRainbow ? undefined : 'none',
      }}
    >
      {/* silhouette rim */}
      {st.rimWidth > 0 && (
        <div
          className="absolute"
          style={{
            inset: `${rimInset}%`,
            background: st.rim,
            ...shape,
            filter: rimFilters.join(', ') || undefined,
          }}
        />
      )}

      {/* colored body (era styling is clipped inside the silhouette) */}
      <div
        className="absolute inset-[6%] overflow-hidden"
        style={{
          background,
          ...shape,
          boxShadow: bodyShadow,
          backdropFilter: st.glass ? 'blur(2px)' : undefined,
          opacity: st.glass ? 0.9 : 1,
          filter: fillFilters.join(', ') || undefined,
        }}
      >
        {st.pattern === 'pixel' && <div className="bm-pixel-pattern absolute inset-0" />}
        {st.pattern === 'rays' && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 8deg, transparent 8deg 16deg)',
            }}
          />
        )}
        {st.gloss && (
          <div
            className="absolute left-[10%] right-[10%] top-[6%] h-[38%]"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.06))' }}
          />
        )}
        {st.gloss && (
          <div
            className="absolute"
            style={{
              left: '16%',
              top: '12%',
              width: '16%',
              height: '11%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,.9)',
              filter: 'blur(1px)',
            }}
          />
        )}
        {st.shine && (
          <div className="bm-shine-wrap">
            <div className="bm-shine-bar" />
          </div>
        )}
        {skin.ring && !isRainbow && !isItem && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(closest-side, transparent 56%, rgba(255,255,255,.55) 66%, transparent 78%)',
            }}
          />
        )}
      </div>

      {/* overlay layer: emoji / special marker / item — never clipped */}
      <div className="pointer-events-none absolute inset-[6%] z-10 flex items-center justify-center">
        {skin.glyphs && !isRainbow && !isItem && (
          <span
            className="leading-none"
            style={{ fontSize: '50cqw', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))' }}
          >
            {skin.glyphs[colorIdx]}
          </span>
        )}
        {tile.special !== 'none' && (
          <span
            className="flex items-center justify-center"
            style={{
              width: '58%',
              height: '58%',
              borderRadius: '50%',
              background: skin.glyphs ? 'transparent' : 'rgba(16,12,22,.52)',
            }}
          >
            <span
              className="font-black leading-none"
              style={{ fontSize: '34cqw', color: '#fff', textShadow: '0 0 3px rgba(0,0,0,.8), 0 1px 2px rgba(0,0,0,.55)' }}
            >
              {SPECIAL_GLYPH[tile.special]}
            </span>
          </span>
        )}
        {isItem && (
          <span className="leading-none" style={{ fontSize: '48cqw', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))' }}>
            🌰
          </span>
        )}
      </div>
    </div>
  );
};

export const GemTile = memo(GemTileInner);
