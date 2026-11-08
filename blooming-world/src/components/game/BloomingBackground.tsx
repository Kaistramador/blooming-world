'use client';

import { useMemo } from 'react';
import type { EraBackground } from '@/lib/game/themes';
import { mulberry32 } from '@/lib/game/engine';

interface Props {
  bg: EraBackground;
  seed?: number;
  className?: string;
}

/**
 * The blooming world: an authored AI scene per era + living
 * animated overlays (clouds, petals, fireflies, sparkles) +
 * vignette / scrims so HUD and the board stay readable.
 * Static scenery lives in the photo; motion stays in CSS.
 */
export function BloomingBackground({ bg, seed = 7, className }: Props) {
  const rnd = useMemo(() => {
    const r = mulberry32(seed * 131 + 17);
    return {
      clouds: Array.from({ length: bg.clouds }, () => ({
        top: 4 + r() * 18,
        scale: 0.7 + r() * 0.9,
        dur: 45 + r() * 50,
        delay: -r() * 60,
      })),
      stars: Array.from({ length: bg.stars ? 30 : 0 }, () => ({
        left: r() * 100,
        top: r() * 55,
        size: 1 + r() * 2,
        dur: 1.6 + r() * 2.4,
        delay: r() * 3,
      })),
      butterflies: Array.from({ length: bg.butterflies }, () => ({
        left: 10 + r() * 70,
        top: 25 + r() * 40,
        dur: 6 + r() * 6,
        delay: -r() * 8,
        emoji: '🦋',
      })),
      petals: Array.from({ length: bg.petals }, () => ({
        left: r() * 100,
        dur: 6 + r() * 7,
        delay: -r() * 12,
        drift: (r() * 10 - 5).toFixed(1),
        emoji: ['🌸', '🌺', '🍂'][Math.floor(r() * 3)],
        scale: 0.6 + r() * 0.7,
      })),
      fireflies: Array.from({ length: bg.fireflies }, () => ({
        left: r() * 92,
        top: 45 + r() * 45,
        dur: 3 + r() * 4,
        delay: -r() * 5,
      })),
      sparkles: Array.from({ length: bg.sparkles }, () => ({
        left: r() * 96,
        top: r() * 80,
        dur: 2 + r() * 3,
        delay: r() * 4,
      })),
    };
  }, [bg, seed]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`} aria-hidden>
      {/* era sky (fallback / base) */}
      <div className="absolute inset-0" style={{ background: bg.sky }} />

      {/* authored era photo scene */}
      {bg.photo && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bg.photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* readability: vignette + HUD scrims */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 42%, transparent 52%, rgba(0,0,0,.34) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: '26%', background: 'linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,0))' }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '18%', background: 'linear-gradient(0deg, rgba(0,0,0,.34), rgba(0,0,0,0))' }}
      />

      {/* stars */}
      {rnd.stars.map((s, i) => (
        <div
          key={`st-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `bm-star-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* sun with rays */}
      {bg.sun && (
        <div className="absolute" style={{ right: '8%', top: '5%' }}>
          <div
            className="relative rounded-full"
            style={{
              width: 52,
              height: 52,
              background: 'radial-gradient(circle, #fffbe0, #ffd83d 75%)',
              boxShadow: '0 0 34px 12px rgba(255,216,61,.45)',
              opacity: 0.92,
            }}
          />
          {bg.rays && (
            <div
              className="absolute -inset-14 rounded-full"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg, rgba(255,216,61,.20) 0deg 7deg, transparent 7deg 18deg)',
                animation: 'bm-sun-rays 5s ease-in-out infinite',
                maskImage: 'radial-gradient(circle, transparent 34%, black 70%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 34%, black 70%)',
              }}
            />
          )}
        </div>
      )}

      {/* drifting clouds */}
      {rnd.clouds.map((c, i) => (
        <div
          key={`cl-${i}`}
          className="absolute"
          style={{
            left: 0,
            top: `${c.top}%`,
            animation: `bm-cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
          }}
        >
          <div style={{ transform: `scale(${c.scale})`, opacity: bg.dark ? 0.2 : 0.75 }}>
            <div className="relative h-8 w-24 rounded-full bg-white/85">
              <div className="absolute -top-4 left-4 h-10 w-12 rounded-full bg-white/85" />
              <div className="absolute -top-3 left-12 h-9 w-10 rounded-full bg-white/85" />
            </div>
          </div>
        </div>
      ))}

      {/* butterflies */}
      {rnd.butterflies.map((b, i) => (
        <span
          key={`bf-${i}`}
          className="absolute"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            fontSize: 18,
            animation: `bm-butterfly ${b.dur}s ease-in-out ${b.delay}s infinite`,
          }}
        >
          {b.emoji}
        </span>
      ))}

      {/* falling petals */}
      {rnd.petals.map((p, i) => (
        <span
          key={`pt-${i}`}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            fontSize: 15 * p.scale,
            ['--drift' as string]: `${p.drift}vw`,
            animation: `bm-petal-fall ${p.dur}s linear ${p.delay}s infinite`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      {/* fireflies */}
      {rnd.fireflies.map((f, i) => (
        <div
          key={`ff-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            width: 5,
            height: 5,
            background: '#ffe66a',
            boxShadow: '0 0 8px 2px rgba(255,230,106,.8)',
            animation: `bm-firefly ${f.dur}s ease-in-out ${f.delay}s infinite`,
          }}
        />
      ))}

      {/* sparkles */}
      {rnd.sparkles.map((s, i) => (
        <span
          key={`sp-${i}`}
          className="absolute"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: 12,
            color: bg.dark ? '#9be8ff' : '#fff',
            textShadow: '0 0 6px rgba(255,255,255,.8)',
            animation: `bm-sparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
