'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GemTile } from './GemTile';
import { BloomingBackground } from './BloomingBackground';
import { chapterTheme } from '@/lib/game/themes';
import { GEM_SKINS, BOOSTER_MAP, EFFECTS } from '@/lib/game/shop';
import type { BoosterId } from '@/lib/game/shop';
import { getLevelConfig } from '@/lib/game/levels';
import { gemShapeCss } from '@/lib/game/shapes';
import {
  createBoard,
  mulberry32,
  trySwap,
  tryTap,
  hammerHit,
  bombBlast,
  crossBlast,
  shuffleBoard,
} from '@/lib/game/engine';
import type { Board, Frame, LevelConfig, MoveResult } from '@/lib/game/types';
import { usePlayer, useT, STREAK_MAX_MULT } from '@/lib/store';
import type { PiggyInfo, EventInfo } from '@/lib/store';
import { PIGGY_WINS_TARGET } from '@/lib/game/garden';
import { submitOnline } from '@/lib/game/online';
import { logEvent, logSessionStart } from '@/lib/game/analytics';
import {
  platformGameplayStart,
  platformGameplayStop,
  submitScoreToLeaderboard,
} from '@/lib/game/platform';
import { sfx } from '@/lib/game/sound';

interface Particle {
  key: number;
  x: number; // percent
  y: number;
  dx: string;
  dy: string;
  rot: string;
  glyph: string;
  color: string;
}

interface FloatText {
  key: number;
  x: number;
  y: number;
  text: string;
}

interface ComboPop {
  key: number;
  text: string;
  color: string;
}

interface Shockwave {
  key: number;
  x: number;
  y: number;
}

interface Snapshot {
  board: Board;
  moves: number;
  score: number;
  colors: number[];
  items: number;
  stones: number;
}

interface GoalProgress {
  colors: number[];
  items: number;
  stones: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CONFETTI_COLORS = ['#c74134', '#f6e04b', '#2ea56d', '#3d9be0', '#b06fc9', '#ef8f2a'];

/** petal confetti burst over the win modal (auto-cleans) */
function WinConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.2 + Math.random() * 1.8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 8 + Math.random() * 8,
      })),
    [],
  );
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setAlive(false), 4400);
    return () => clearTimeout(id);
  }, []);
  if (!alive) return null;
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="bm-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </>
  );
}

interface GameScreenProps {
  level: number;
  /** Волна 4: уровень дня (×2 награда, бейджи событий) */
  daily?: boolean;
  onExit: () => void;
  onLevelChange: (lv: number) => void;
}

export function GameScreen({ level, daily = false, onExit, onLevelChange }: GameScreenProps) {
  const t = useT();
  const player = usePlayer();
  const [cfg, setCfg] = useState<LevelConfig | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState<GoalProgress>({ colors: [0, 0, 0, 0, 0, 0], items: 0, stones: 0 });
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [shakeCell, setShakeCell] = useState<number | null>(null);
  const [clearing, setClearing] = useState<Set<number>>(new Set());
  const [born, setBorn] = useState<Set<number>>(new Set());
  const [spawned, setSpawned] = useState<Set<number>>(new Set());
  const [stonesHit, setStonesHit] = useState<Set<number>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [combos, setCombos] = useState<ComboPop[]>([]);
  const [shocks, setShocks] = useState<Shockwave[]>([]);
  const [boardShake, setBoardShake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeBooster, setActiveBooster] = useState<BoosterId | null>(null);
  const [buyBoosterId, setBuyBoosterId] = useState<BoosterId | null>(null);
  const [winInfo, setWinInfo] = useState<{ stars: number; reward: number; firstClear: boolean; newStars: boolean; bonus: number; streak: number; mult: number; piggy: PiggyInfo; event: EventInfo } | null>(null);
  const [loseOpen, setLoseOpen] = useState(false);
  const [lostStreak, setLostStreak] = useState(0);
  const [plus5Used, setPlus5Used] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const rngRef = useRef<() => number>(() => 0);
  const playIdRef = useRef(0);
  const snapshotRef = useRef<Snapshot | null>(null);
  const keyCounter = useRef(0);

  const theme = chapterTheme(cfg?.chapter ?? 0);
  const skin = GEM_SKINS.find((s) => s.id === player.equipped.skin) ?? GEM_SKINS[0];
  const tileFx = player.equipped.tileEffect
    ? EFFECTS.find((e) => e.id === player.equipped.tileEffect)
    : null;

  /* ---------- level init ---------- */
  useEffect(() => {
    const c = getLevelConfig(level);
    rngRef.current = mulberry32(level * 7919 + attempt * 104729 + 13);
    const b = createBoard(c, rngRef.current);
    setCfg(c);
    setBoard(b);
    setMoves(c.moves);
    setScore(0);
    setProgress({ colors: [0, 0, 0, 0, 0, 0], items: 0, stones: c.stones.length });
    setBusy(false);
    setSelected(null);
    setActiveBooster(null);
    setWinInfo(null);
    setLoseOpen(false);
    setPlus5Used(0);
    snapshotRef.current = null;
    setParticles([]);
    setFloats([]);
    setCombos([]);
    setShocks([]);
    setBoardShake(false);
    setLostStreak(0);
    logSessionStart();
    logEvent('level_start', { level, attempt });
    /* Волна 5: GameplayAPI.start — площадка знает, что игрок в геймплее */
    platformGameplayStart();
  }, [level, attempt]);

  /* Волна 5: выход с экрана уровня — GameplayAPI.stop */
  useEffect(() => {
    return () => platformGameplayStop();
  }, []);

  /* ---------- helpers ---------- */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const spawnParticles = useCallback(
    (frame: Frame) => {
      if (!frame.board || frame.clearingIds.length === 0) return;
      const cells = frame.clearingIds
        .map((id) => {
          const idx = frame.board.cells.findIndex((c) => c?.tile?.id === id);
          return idx;
        })
        .filter((i) => i >= 0)
        .slice(0, 14);
      const glyph = tileFx?.visual ?? '•';
      const newPs: Particle[] = cells.map((idx) => {
        const r = Math.floor(idx / frame.board.w);
        const c = idx % frame.board.w;
        const ang = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 45;
        keyCounter.current += 1;
        return {
          key: keyCounter.current,
          x: ((c + 0.5) * 100) / frame.board.w,
          y: ((r + 0.5) * 100) / frame.board.h,
          dx: `${Math.cos(ang) * dist}px`,
          dy: `${Math.sin(ang) * dist - 20}px`,
          rot: `${Math.random() * 360 - 180}deg`,
          glyph,
          color: '#fff',
        };
      });
      setParticles((ps) => [...ps.slice(-40), ...newPs]);
      const ids = newPs.map((p) => p.key);
      setTimeout(() => {
        setParticles((ps) => ps.filter((p) => !ids.includes(p.key)));
      }, 700);
    },
    [tileFx],
  );

  const spawnFloat = useCallback((x: number, y: number, text: string) => {
    keyCounter.current += 1;
    const f: FloatText = { key: keyCounter.current, x, y, text };
    setFloats((fs) => [...fs.slice(-6), f]);
    setTimeout(() => setFloats((fs) => fs.filter((v) => v.key !== f.key)), 900);
  }, []);

  /* big combo praise popup with the era accent color */
  const spawnCombo = useCallback(
    (cascade: number, accent: string) => {
      const praise = cascade >= 5 ? t('game.combo5') : cascade >= 4 ? t('game.combo4') : cascade === 3 ? t('game.combo3') : t('game.combo2');
      keyCounter.current += 1;
      const c: ComboPop = { key: keyCounter.current, text: `×${cascade}! ${praise}`, color: accent };
      setCombos((cs) => [...cs.slice(-2), c]);
      setTimeout(() => setCombos((cs) => cs.filter((v) => v.key !== c.key)), 1100);
    },
    [t],
  );

  /* expanding shockwave rings + board shake */
  const spawnShocks = useCallback(
    (idxs: number, w: number, h: number) => {
      const cellPos = (idx: number) => ({ x: (((idx % w) + 0.5) * 100) / w, y: ((Math.floor(idx / w) + 0.5) * 100) / h });
      keyCounter.current += 1;
      const pos = cellPos(idxs);
      const s: Shockwave = { key: keyCounter.current, x: pos.x, y: pos.y };
      setShocks((ss) => [...ss.slice(-4), s]);
      setTimeout(() => setShocks((ss) => ss.filter((v) => v.key !== s.key)), 600);
    },
    [],
  );

  const pulseBoard = useCallback(() => {
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 450);
  }, []);

  /* ---------- goal helpers ---------- */
  const goalMet = useCallback(
    (c: LevelConfig, p: GoalProgress, sc: number) =>
      c.goals.every((g) => {
        if (g.type === 'score') return sc >= g.count;
        if (g.type === 'collect') return (p.colors[g.color] ?? 0) >= g.count;
        if (g.type === 'item') return p.items >= g.count;
        if (g.type === 'stone') return p.stones >= g.count;
        return false;
      }),
    [],
  );

  /* ---------- frames playback ---------- */
  const playFrames = useCallback(
    async (res: MoveResult) => {
      const playId = ++playIdRef.current;
      setBusy(true);
      for (const frame of res.frames) {
        if (playIdRef.current !== playId) return;
        setBoard(frame.board);
        setClearing(new Set(frame.clearingIds));
        setBorn(new Set(frame.bornIds));
        setSpawned(new Set(frame.spawnIds));
        setStonesHit(new Set(frame.stonesHit));
        if (frame.points > 0) {
          setScore((s) => s + frame.points);
          const cleared = frame.clearingIds;
          if (cleared.length > 0) {
            const idxs = cleared
              .map((id) => frame.board.cells.findIndex((c) => c?.tile?.id === id))
              .filter((i) => i >= 0);
            const cx = idxs.reduce((a, i) => a + ((i % frame.board.w) + 0.5), 0) / idxs.length / frame.board.w;
            const cy = idxs.reduce((a, i) => a + (Math.floor(i / frame.board.w) + 0.5), 0) / idxs.length / frame.board.h;
            spawnFloat(cx * 100, cy * 100, `+${frame.points}`);
          }
        }
        if (frame.clearingIds.length > 0) {
          spawnParticles(frame);
          sfx.match(frame.cascade);
        }
        if (frame.stonesHit.length > 0) {
          sfx.boom();
          for (const idx of frame.stonesHit.slice(0, 3)) spawnShocks(idx, frame.board.w, frame.board.h);
          pulseBoard();
        }
        if (frame.collectedIds.length > 0) sfx.coin();
        if (frame.cascade >= 2) {
          spawnCombo(frame.cascade, theme.uiAccent);
          spawnFloat(50, 46, `x${frame.cascade}!`);
        }
        if (frame.cascade >= 3) pulseBoard();
        await sleep(frame.clearingIds.length > 0 ? 250 : 300);
        if (playIdRef.current !== playId) return;
        setClearing(new Set());
        setBorn(new Set());
        setSpawned(new Set());
        setStonesHit(new Set());
      }
      // goals update
      setProgress((p) => ({
        colors: p.colors.map((v, i) => v + (res.colorsCollected[i] ?? 0)),
        items: p.items + res.itemsCollected,
        stones: p.stones + res.stonesDestroyed,
      }));
      if (res.shuffled) showToast(t('game.shuffled'));
      setBusy(false);
    },
    [showToast, spawnFloat, spawnParticles, spawnCombo, spawnShocks, pulseBoard, theme, t],
  );

  /* ---------- end-of-move resolution ---------- */
  const afterMove = useCallback(
    (res: MoveResult, movesUsed: number) => {
      if (!cfg) return;
      const p: GoalProgress = {
        colors: progress.colors.map((v, i) => v + (res.colorsCollected[i] ?? 0)),
        items: progress.items + res.itemsCollected,
        stones: progress.stones + res.stonesDestroyed,
      };
      const sc = score + res.score;
      const movesLeft = moves - movesUsed;
      if (goalMet(cfg, p, sc)) {
        const bonus = movesLeft * 50;
        const finalScore = sc + bonus;
        const stars = finalScore >= cfg.star3 ? 3 : finalScore >= cfg.star2 ? 2 : 1;
        sfx.win();
        setTimeout(() => sfx.star(1), 400);
        const info = player.recordWin(cfg.level, stars, finalScore, res.maxCascade, movesUsed, { daily });
        setScore(finalScore);
        setWinInfo({ stars, reward: info.reward, firstClear: info.firstClear, newStars: info.newStars, bonus, streak: info.streak, mult: info.mult, piggy: info.piggy, event: info.event });
        logEvent('level_win', { level: cfg.level, stars, score: finalScore, movesUsed, streak: info.streak, mult: info.mult, reward: info.reward, piggy: info.piggy.deposit, daily: info.event.daily ? 1 : 0, weekend: info.event.weekend ?? '', cascade: info.event.cascadeCoins });
        if (info.event.daily) logEvent('daily_win', { level: cfg.level, reward: info.reward });
        /* Волна 5: конец геймплея для площадки + лучший уровень в лидерборд */
        platformGameplayStop();
        submitScoreToLeaderboard(cfg.level);
        /* Волна 6: тихий сабмит в онлайновый рейтинг (офлайн не ломает игру) */
        void submitOnline({
          level: cfg.level,
          stars: player.totalStars(),
          score: player.stats.totalScore,
          name: player.name || 'Player',
        });
      } else if (movesLeft <= 0) {
        sfx.lose();
        setLostStreak(player.streak);
        player.recordLoss();
        logEvent('level_lose', { level: cfg.level, score: sc, movesUsed, moves: cfg.moves });
        /* Волна 5: конец геймплея для площадки (модаль поражения) */
        platformGameplayStop();
        setLoseOpen(true);
      }
    },
    [cfg, progress, score, moves, goalMet],
  );

  /* ---------- player actions ---------- */
  const doMove = useCallback(
    async (res: MoveResult, opts?: { consume?: boolean; snapshot?: Snapshot }) => {
      if (opts?.snapshot) snapshotRef.current = opts.snapshot;
      if (opts?.consume !== false) {
        setMoves((m) => m - 1);
      }
      await playFrames(res);
      afterMove(res, opts?.consume === false ? 0 : 1);
    },
    [playFrames, afterMove],
  );

  const handleCellClick = useCallback(
    (idx: number) => {
      if (!board || !cfg || busy || winInfo || loseOpen) return;
      const cell = board.cells[idx];
      if (!cell) return;

      // booster targeting
      if (activeBooster) {
        const r = Math.floor(idx / board.w);
        const c = idx % board.w;
        if (activeBooster === 'hammer') {
          if (player.useBooster('hammer')) {
            setActiveBooster(null);
            void doMove(hammerHit(board, r, c, cfg, rngRef.current), { consume: false });
          }
        } else if (activeBooster === 'bomb') {
          if (player.useBooster('bomb')) {
            setActiveBooster(null);
            void doMove(bombBlast(board, r, c, cfg, rngRef.current), { consume: false });
          }
        } else if (activeBooster === 'cross') {
          if (player.useBooster('cross')) {
            setActiveBooster(null);
            void doMove(crossBlast(board, r, c, cfg, rngRef.current), { consume: false });
          }
        }
        return;
      }

      if (cfg.mode === 'tap') {
        const res = tryTap(board, Math.floor(idx / board.w), idx % board.w, cfg, rngRef.current);
        if (res.valid) {
          setMoves((m) => m - 1);
          void (async () => {
            await playFrames(res);
            afterMove(res, 1);
          })();
        } else {
          setShakeCell(idx);
          setTimeout(() => setShakeCell(null), 600);
        }
        return;
      }

      // swap mode
      const tile = cell.tile;
      if (!tile || tile.kind !== 'gem') return;
      if (selected === null) {
        setSelected(idx);
        sfx.click();
        return;
      }
      if (selected === idx) {
        setSelected(null);
        return;
      }
      const rs = Math.floor(selected / board.w);
      const cs = selected % board.w;
      const rt = Math.floor(idx / board.w);
      const ct = idx % board.w;
      if (Math.abs(rs - rt) + Math.abs(cs - ct) !== 1) {
        setSelected(idx);
        sfx.click();
        return;
      }
      const snapshot: Snapshot = { board, moves, score, colors: [...progress.colors], items: progress.items, stones: progress.stones };
      const res = trySwap(board, selected, idx, cfg, rngRef.current);
      if (!res.valid) {
        sfx.swap();
        setShakeCell(idx);
        setSelected(null);
        setTimeout(() => setShakeCell(null), 600);
        return;
      }
      setSelected(null);
      sfx.swap();
      void doMove(res, { snapshot });
    },
    [board, cfg, busy, winInfo, loseOpen, selected, activeBooster, moves, score, progress, doMove, playFrames, afterMove],
  );

  const handleBoosterButton = useCallback(
    (id: BoosterId) => {
      if (busy || winInfo || loseOpen) return;
      sfx.click();
      if (id === 'shuffle') {
        if (board && cfg && player.useBooster('shuffle')) {
          const res = shuffleBoard(board, cfg, rngRef.current);
          setBoard(res.frames[0].board);
        } else if ((player.boosters.shuffle ?? 0) <= 0) {
          setBuyBoosterId('shuffle');
        }
        return;
      }
      if (id === 'undo') {
        const snap = snapshotRef.current;
        if (snap && player.useBooster('undo')) {
          setBoard(snap.board);
          setMoves(snap.moves);
          setScore(snap.score);
          setProgress({ colors: [...snap.colors], items: snap.items, stones: snap.stones });
          snapshotRef.current = null;
        } else if ((player.boosters.undo ?? 0) <= 0) {
          setBuyBoosterId('undo');
        }
        return;
      }
      if (id === 'moves5') {
        setBuyBoosterId('moves5');
        return;
      }
      // targeting boosters
      if ((player.boosters[id] ?? 0) > 0) {
        setActiveBooster((cur) => (cur === id ? null : id));
      } else {
        setBuyBoosterId(id);
      }
    },
    [board, cfg, busy, winInfo, loseOpen],
  );

  const handlePlus5 = useCallback(() => {
    if ((player.boosters.moves5 ?? 0) > 0) {
      player.useBooster('moves5');
    } else if (player.coins >= BOOSTER_MAP.moves5.price) {
      player.buyBooster('moves5');
    } else {
      return;
    }
    sfx.coin();
    setLoseOpen(false);
    setMoves((m) => m + 5);
    setPlus5Used((n) => n + 1);
  }, [player]);

  /* ---------- render ---------- */
  if (!cfg || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        {t('common.loading')}
      </div>
    );
  }

  const isBoss = cfg.mode === 'tap';
  const bgDark = theme.bg.dark;

  const renderCell = (idx: number) => {
    const cell = board.cells[idx];
    if (!cell) return null;
    const r = Math.floor(idx / board.w);
    const c = idx % board.w;
    const style: React.CSSProperties = {
      left: `${(c * 100) / board.w}%`,
      top: `${(r * 100) / board.h}%`,
      width: `${100 / board.w}%`,
      height: `${100 / board.h}%`,
    };

    if (cell.blocker) {
      const hp = cell.blocker.hp;
      return (
        <div
          key={`st-${idx}`}
          className={`absolute p-[4%] ${stonesHit.has(idx) ? 'bm-stone-hit' : ''}`}
          style={style}
        >
          {/* octagonal rock silhouette — clearly not a gem; rim + cracks + HP pips */}
          <div
            className="relative h-full w-full"
            style={{
              clipPath:
                'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              background: 'rgba(28,24,20,.6)',
            }}
          >
            <div
              className="absolute inset-[8%]"
              style={{
                background: hp >= 2
                  ? 'linear-gradient(160deg,#9aa2ac,#5c646e)'
                  : 'linear-gradient(160deg,#8a92a0,#4a5260)',
                boxShadow: 'inset 0 2px 3px rgba(255,255,255,.25), inset 0 -3px 5px rgba(0,0,0,.35)',
              }}
            >
              {hp === 1 && (
                <div
                  className="h-full w-full"
                  style={{
                    opacity: 0.5,
                    background:
                      'linear-gradient(115deg, transparent 42%, rgba(20,24,30,.7) 46%, rgba(20,24,30,.7) 50%, transparent 54%), linear-gradient(245deg, transparent 60%, rgba(20,24,30,.6) 66%, rgba(20,24,30,.6) 70%, transparent 74%)',
                  }}
                />
              )}
            </div>
            {/* HP pips: one dot per remaining hit */}
            <div className="absolute inset-x-0 bottom-[7%] z-10 flex items-center justify-center gap-[6%]">
              {Array.from({ length: Math.max(1, hp) }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full"
                  style={{
                    width: '11%',
                    aspectRatio: '1',
                    background: 'rgba(16,20,26,.6)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,.4)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!cell.tile) {
      return (
        <div key={`v-${idx}`} className="absolute" style={style}>
          <div className="absolute inset-[6%] rounded-[15%] bg-black/10" />
        </div>
      );
    }

    const isSelected = selected === idx;
    const targeting = !!activeBooster;
    return (
      <div
        key={cell.tile.id}
        className={`absolute p-[3%] ${shakeCell === idx ? 'bm-shake' : ''}`}
        style={style}
      >
        <button
          type="button"
          aria-label={`cell ${r}-${c}`}
          onClick={() => handleCellClick(idx)}
          className={`h-full w-full transition-transform duration-150 ${isSelected ? 'scale-110 z-10' : ''} ${
            targeting ? 'cursor-crosshair' : ''
          } ${selected !== null && !isSelected ? 'opacity-80' : ''}`}
          style={{ filter: isSelected ? 'brightness(1.2) drop-shadow(0 0 6px rgba(255,255,255,.8))' : undefined }}
        >
          <GemTile
            tile={cell.tile}
            theme={theme}
            skin={skin}
            clearing={clearing.has(cell.tile.id)}
            born={born.has(cell.tile.id)}
            spawned={spawned.has(cell.tile.id)}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: theme.bg.sky }}>
      <BloomingBackground bg={theme.bg} seed={cfg.chapter + 1} />

      {/* content */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col px-3 pb-2 pt-2">
        {/* top bar */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              playIdRef.current += 1;
              sfx.click();
              onExit();
            }}
            className="rounded-full bg-white/25 text-white hover:bg-white/40"
          >
            ← {t('game.exit')}
          </Button>
          <div className="flex flex-col items-center">
            <span className="bm-text-outline text-sm font-bold text-white">
              {t('map.level')} {cfg.level}
            </span>
            {isBoss && (
              <span className="bm-text-outline text-[10px] font-black tracking-widest text-amber-300">
                {t('game.bossLevel')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-400/90 px-3 py-1 text-sm font-black text-amber-950 shadow">
            🪙 {player.coins}
          </div>
        </div>

        {/* stats row */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 rounded-2xl bg-black/25 px-3 py-1.5 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wide text-white/70">{t('game.moves')}</div>
            <div className="text-xl font-black leading-tight text-white">{moves}</div>
          </div>
          <div className="flex-1 rounded-2xl bg-black/25 px-3 py-1.5 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wide text-white/70">{t('game.score')}</div>
            <div className="text-xl font-black leading-tight text-white">{score.toLocaleString('ru-RU')}</div>
          </div>
        </div>

        {/* goals */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cfg.goals.map((g, gi) => {
            let label = '';
            let value = '';
            let done = false;
            let icon = '';
            if (g.type === 'score') {
              icon = '🏆';
              value = `${score.toLocaleString('ru-RU')}/${g.count.toLocaleString('ru-RU')}`;
              label = t('game.scoreGoal');
              done = score >= g.count;
            } else if (g.type === 'collect') {
              icon = '🔵';
              value = `${progress.colors[g.color] ?? 0}/${g.count}`;
              done = (progress.colors[g.color] ?? 0) >= g.count;
              label = '';
            } else if (g.type === 'item') {
              icon = '🌰';
              value = `${progress.items}/${g.count}`;
              label = t('game.itemGoal');
              done = progress.items >= g.count;
            } else {
              icon = '🪨';
              value = `${cfg.stones.length - progress.stones}/${g.count}`;
              label = t('game.stoneGoal');
              done = progress.stones >= g.count;
            }
            return (
              <div
                key={gi}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                  done ? 'bg-emerald-500/90 text-white' : 'bg-black/30 text-white'
                }`}
              >
                {g.type === 'collect' ? (
                  <span
                    className="inline-block h-3.5 w-3.5 border border-white/60"
                    style={{
                      ...gemShapeCss(g.color),
                      background: (skin.palette ?? theme.palette)[g.color] ?? '#999',
                    }}
                  />
                ) : (
                  <span>{icon}</span>
                )}
                <span>{label && g.type !== 'score' ? `${label} ` : ''}{value}</span>
                {done && <span>✓</span>}
              </div>
            );
          })}
        </div>

        {/* board */}
        <div className="mt-3 flex justify-center">
          <div
            key={`${cfg.level}-${attempt}`}
            className={`bm-board-in relative w-full rounded-3xl p-2.5 ${theme.bg.dark ? 'bg-black/35' : 'bg-white/15'} backdrop-blur-[2px]`}
            style={{
              maxWidth: 480,
              boxShadow: bgDark
                ? '0 8px 30px rgba(0,0,0,.5), inset 0 0 40px rgba(34,224,255,.06)'
                : '0 8px 30px rgba(0,0,0,.25), inset 0 0 30px rgba(255,255,255,.08)',
              border: '2px solid rgba(255,255,255,.22)',
            }}
          >
            <div
              className={`relative ${boardShake ? 'bm-board-shake' : ''} ${theme.tile.pattern === 'pixel' ? 'bm-checker-light' : ''}`}
              style={{ aspectRatio: `${board.w} / ${board.h}` }}
            >
              {board.cells.map((_, i) => renderCell(i))}
              {/* particles */}
              {particles.map((p) => (
                <span
                  key={p.key}
                  className="bm-particle"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    fontSize: 14,
                    color: p.color,
                    ['--dx' as string]: p.dx,
                    ['--dy' as string]: p.dy,
                    ['--rot' as string]: p.rot,
                  }}
                >
                  {p.glyph}
                </span>
              ))}
              {/* float texts */}
              {floats.map((f) => (
                <span
                  key={f.key}
                  className="bm-float-up pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap text-sm font-black text-white"
                  style={{ left: `${f.x}%`, top: `${f.y}%`, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}
                >
                  {f.text}
                </span>
              ))}
              {/* shockwave rings */}
              {shocks.map((s) => (
                <span
                  key={`sh-${s.key}`}
                  className="bm-shockwave"
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: '34%',
                    aspectRatio: '1',
                    marginLeft: '-17%',
                    marginTop: '-17%',
                  }}
                />
              ))}
              {/* combo praise popups */}
              {combos.map((c) => (
                <span
                  key={`cb-${c.key}`}
                  className="pointer-events-none absolute left-1/2 top-[36%] z-30 -translate-x-1/2"
                >
                  <span
                    className="bm-combo-pop block whitespace-nowrap text-[26px] font-black"
                    style={{ color: c.color }}
                  >
                    {c.text}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* hint */}
        <div className="mt-2 text-center text-[11px] text-white/75">
          {activeBooster
            ? `${t('game.selectTarget')} (${BOOSTER_MAP[activeBooster].icon})`
            : isBoss
              ? t('game.tapHint')
              : t('game.swapHint')}
        </div>

        {/* boosters */}
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {(['hammer', 'bomb', 'cross', 'shuffle', 'undo', 'moves5'] as BoosterId[]).map((id) => {
            const def = BOOSTER_MAP[id];
            const count = player.boosters[id] ?? 0;
            const active = activeBooster === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleBoosterButton(id)}
                className={`relative flex flex-col items-center justify-center rounded-2xl py-1.5 text-xl transition ${
                  active
                    ? 'bg-amber-400 text-amber-950 ring-2 ring-white'
                    : 'bg-black/30 text-white hover:bg-black/45'
                }`}
                aria-label={def.name[player.lang]}
              >
                <span className="leading-none">{def.icon}</span>
                <span
                  className={`absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 text-[10px] font-black leading-[18px] ${
                    count > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500/90 text-white'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {activeBooster && (
          <button
            type="button"
            className="mt-1 self-center rounded-full bg-white/25 px-4 py-1 text-xs font-bold text-white hover:bg-white/40"
            onClick={() => setActiveBooster(null)}
          >
            {t('game.cancel')}
          </button>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2">
          <div className="bm-toast-in rounded-full bg-black/80 px-4 py-2 text-sm font-bold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* win modal */}
      <Dialog open={!!winInfo} onOpenChange={(o) => !o && setWinInfo(null)}>
        <DialogContent className="max-w-xs rounded-3xl border-0 bg-gradient-to-b from-emerald-500 to-teal-600 text-white">
          <WinConfetti />
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-2xl font-black">{t('game.win')}</DialogTitle>
            <DialogDescription className="sr-only">{t('game.win')}</DialogDescription>
            <div className="mt-1 flex gap-2 text-4xl">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={winInfo && n <= winInfo.stars ? 'bm-star-pop' : 'opacity-25 grayscale'}
                  style={{ animationDelay: `${n * 0.22}s` }}
                >
                  ⭐
                </span>
              ))}
            </div>
            <div className="mt-2 text-center text-sm">
              {t('game.score')}: <b>{score.toLocaleString('ru-RU')}</b>
              {winInfo && winInfo.bonus > 0 && (
                <div className="text-amber-200">+{winInfo.bonus} ⚡</div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 rounded-full bg-amber-400/90 px-4 py-1.5 font-black text-amber-950">
              🪙 +{winInfo?.reward}
              {winInfo && winInfo.mult > 1 && <span className="rounded-full bg-amber-950/25 px-1.5 text-xs">×{winInfo.mult}</span>}
            </div>
            {/* Волна 4: бейджи событий */}
            {winInfo?.event.daily && (
              <div className="rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-black text-white">{t('daily.badge')}</div>
            )}
            {winInfo?.event.weekend === 'coins' && (
              <div className="rounded-full bg-orange-500/90 px-3 py-1 text-xs font-black text-white">{t('event.coinsBadge')}</div>
            )}
            {winInfo?.event.weekend === 'cascade' && winInfo.event.cascadeCoins > 0 && (
              <div className="rounded-full bg-sky-600/90 px-3 py-1 text-xs font-black text-white">
                {t('event.cascadeBadge', { n: winInfo.event.maxCascade, c: winInfo.event.cascadeCoins })}
              </div>
            )}
            {winInfo && (
              <div className="mt-1.5 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 rounded-full bg-orange-600/90 px-3 py-1 text-xs font-black text-white">
                  🔥 {t('streak.title')}: {winInfo.streak}
                </div>
                {/* Волна 3: копилка */}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white ${
                    winInfo.piggy.ready ? 'bg-pink-600' : 'bg-rose-400/80'
                  }`}
                >
                  {t('piggy.deposit', { n: winInfo.piggy.deposit, w: Math.min(winInfo.piggy.wins, PIGGY_WINS_TARGET), m: PIGGY_WINS_TARGET })}
                </div>
                {winInfo.piggy.ready && (
                  <div className="text-[11px] font-black text-amber-200">🐷 {t('piggy.ready')}</div>
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: STREAK_MAX_MULT - 1 }, (_, i) => i + 2).map((m) => (
                    <span
                      key={m}
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        winInfo.mult >= m ? 'bg-white text-orange-600' : 'bg-black/25 text-white/60'
                      }`}
                    >
                      ×{m}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-bold text-emerald-100">
                  {winInfo.mult >= STREAK_MAX_MULT
                    ? t('streak.max')
                    : t('streak.next', { m: winInfo.mult + 1, n: winInfo.mult + 1 - winInfo.streak })}
                </div>
              </div>
            )}
            {winInfo?.firstClear && (
              <div className="text-xs font-bold text-emerald-100">{t('game.firstWin')}</div>
            )}
            {winInfo?.newStars && !winInfo.firstClear && (
              <div className="text-xs font-bold text-amber-200">{t('game.newStars')}</div>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              className="rounded-full bg-white font-black text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                setWinInfo(null);
                if (cfg.level < 100) onLevelChange(cfg.level + 1);
                else onExit();
              }}
            >
              {t('game.next')} →
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={() => {
                  setWinInfo(null);
                  setAttempt((a) => a + 1);
                }}
              >
                {t('game.retry')}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={() => {
                  setWinInfo(null);
                  onExit();
                }}
              >
                {t('game.exit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* lose modal */}
      <Dialog open={loseOpen} onOpenChange={setLoseOpen}>
        <DialogContent className="max-w-xs rounded-3xl border-0 bg-gradient-to-b from-slate-700 to-slate-900 text-white">
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-xl font-black">{t('game.lose')}</DialogTitle>
            <DialogDescription className="sr-only">{t('game.lose')}</DialogDescription>
            {lostStreak >= 2 && (
              <div className="mt-1 rounded-full bg-rose-500/80 px-3 py-1 text-xs font-bold text-white">
                💔 {t('streak.lost')}
              </div>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {plus5Used < 2 && (
              <Button
                className="rounded-full bg-amber-400 font-black text-amber-950 hover:bg-amber-300"
                onClick={handlePlus5}
              >
                {t('game.plus5')} · 🪙 {BOOSTER_MAP.moves5.price} {t('game.buyAndUse').toLowerCase()}
              </Button>
            )}
            <Button
              variant="secondary"
              className="rounded-full bg-white/20 text-white hover:bg-white/30"
              onClick={() => {
                setLoseOpen(false);
                setAttempt((a) => a + 1);
              }}
            >
              {t('game.retry')}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full bg-white/20 text-white hover:bg-white/30"
              onClick={() => {
                setLoseOpen(false);
                onExit();
              }}
            >
              {t('game.exit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* buy booster dialog */}
      <Dialog open={!!buyBoosterId} onOpenChange={(o) => !o && setBuyBoosterId(null)}>
        <DialogContent className="max-w-xs rounded-3xl border-0 bg-white text-slate-800">
          {buyBoosterId && (
            <>
              <DialogHeader className="items-center">
                <DialogTitle className="text-center">
                  {BOOSTER_MAP[buyBoosterId].icon} {BOOSTER_MAP[buyBoosterId].name[player.lang]}
                </DialogTitle>
                <DialogDescription className="text-center text-sm">
                  {BOOSTER_MAP[buyBoosterId].desc[player.lang]}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button
                  className="rounded-full bg-amber-400 font-black text-amber-950 hover:bg-amber-300"
                  onClick={() => {
                    if (buyBoosterId === 'moves5') {
                      handlePlus5();
                    } else if (player.buyBooster(buyBoosterId)) {
                      sfx.coin();
                      if (activeBooster === null && buyBoosterId !== 'shuffle' && buyBoosterId !== 'undo') {
                        setActiveBooster(buyBoosterId);
                      }
                    } else {
                      showToast(t('shop.notEnough'));
                    }
                    setBuyBoosterId(null);
                  }}
                >
                  🪙 {BOOSTER_MAP[buyBoosterId].price} · {t('game.buyAndUse')}
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                  onClick={() => setBuyBoosterId(null)}
                >
                  {t('game.cancel')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
