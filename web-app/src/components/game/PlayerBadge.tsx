'use client';

import { AVATARS, FRAMES, NAME_STYLES } from '@/lib/game/shop';

interface PlayerBadgeProps {
  avatarId: string;
  frameId: string;
  avatarEffect?: string;
  nameStyleId: string;
  nameEffect?: string | null;
  name: string;
  size?: number;
  nameClass?: string;
}

const AVATAR_FX_CLASS: Record<string, string> = {
  glow: 'bm-ae-glow',
  pulse: 'bm-ae-pulse',
  spin: 'bm-ae-spin',
  aurora: 'bm-ae-aurora',
  flame: 'bm-ae-flame',
  galaxy: 'bm-ae-galaxy',
};

const NAME_FX_CLASS: Record<string, string> = {
  glow: 'bm-ne-glow',
  rainbow: 'bm-ne-rainbow',
  blink: 'bm-ne-blink',
  wave: 'bm-ne-wave',
  fire: 'bm-ne-fire',
  starlight: 'bm-ne-starlight',
};

export function PlayerAvatar({
  avatarId,
  frameId,
  avatarEffect,
  size = 40,
}: Pick<PlayerBadgeProps, 'avatarId' | 'frameId' | 'avatarEffect' | 'size'>) {
  const av = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  const fr = FRAMES.find((f) => f.id === frameId);
  const fxClass = avatarEffect ? AVATAR_FX_CLASS[avatarEffect] ?? '' : '';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${fxClass}`}
      style={{
        width: size,
        height: size,
        background: av.bg,
        boxShadow: fxClass ? undefined : fr?.css === 'none' ? '0 1px 3px rgba(0,0,0,.25)' : fr?.css,
        border: fr?.css && fr.css !== 'none' ? undefined : '2px solid rgba(255,255,255,.4)',
        fontSize: size * 0.52,
      }}
    >
      <span className="leading-none">{av.emoji}</span>
    </div>
  );
}

export function PlayerName({
  nameStyleId,
  nameEffect,
  name,
  nameClass,
}: Pick<PlayerBadgeProps, 'nameStyleId' | 'nameEffect' | 'name' | 'nameClass'>) {
  const ns = NAME_STYLES.find((s) => s.id === nameStyleId) ?? NAME_STYLES[0];
  const fxClass = nameEffect ? NAME_FX_CLASS[nameEffect] ?? '' : '';
  return (
    <span
      className={`truncate ${fxClass} ${nameClass ?? ''}`}
      style={ns.css === 'color:#ffffff;font-weight:700' ? undefined : (undefinedToStyle(ns.css) as React.CSSProperties)}
    >
      {name}
    </span>
  );
}

// name styles store raw css; parse simple declarations
function undefinedToStyle(css: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const [prop, value] = decl.split(':');
    if (!prop || !value) continue;
    const key = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    style[key] = value.trim();
  }
  return style;
}

export function PlayerBadge(props: PlayerBadgeProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <PlayerAvatar
        avatarId={props.avatarId}
        frameId={props.frameId}
        avatarEffect={props.avatarEffect}
        size={props.size ?? 40}
      />
      <PlayerName
        nameStyleId={props.nameStyleId}
        nameEffect={props.nameEffect}
        name={props.name}
        nameClass={props.nameClass}
      />
    </div>
  );
}
