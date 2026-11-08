/* ============================================================
 * Bloom Match — shop catalog: boosters, coin packs (demo) and
 * cosmetics (gem skins, avatars, frames, name styles, effects).
 * Волна 4: сезонные коллекции — 6 предметов × 4 сезона, витрина
 * rotates по календарю автоматически (events.ts → seasonOn).
 * ============================================================ */

import type { SeasonId } from './events';

export type BoosterId = 'hammer' | 'bomb' | 'cross' | 'shuffle' | 'undo' | 'moves5';

export interface BoosterDef {
  id: BoosterId;
  icon: string;
  price: number;
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
}

export const BOOSTERS: BoosterDef[] = [
  {
    id: 'hammer', icon: '🔨', price: 40,
    name: { ru: 'Молоток', en: 'Hammer' },
    desc: { ru: 'Убрать один камень с поля', en: 'Remove a single gem' },
  },
  {
    id: 'bomb', icon: '💣', price: 60,
    name: { ru: 'Бомба', en: 'Bomb' },
    desc: { ru: 'Взрыв 3×3 в выбранной точке', en: 'Blast a 3×3 area' },
  },
  {
    id: 'cross', icon: '⚡', price: 80,
    name: { ru: 'Молния', en: 'Lightning' },
    desc: { ru: 'Очистить ряд и столбец крестом', en: 'Clear a row and column' },
  },
  {
    id: 'shuffle', icon: '🔀', price: 50,
    name: { ru: 'Перемешать', en: 'Shuffle' },
    desc: { ru: 'Перемешать все камни на поле', en: 'Reshuffle all gems' },
  },
  {
    id: 'undo', icon: '↩️', price: 30,
    name: { ru: 'Отмена хода', en: 'Undo' },
    desc: { ru: 'Отменить последний своп', en: 'Undo your last swap' },
  },
  {
    id: 'moves5', icon: '➕5', price: 100,
    name: { ru: '+5 ходов', en: '+5 Moves' },
    desc: { ru: 'Дополнительные 5 ходов в уровне', en: 'Five extra moves in a level' },
  },
];

export const BOOSTER_MAP: Record<BoosterId, BoosterDef> = Object.fromEntries(
  BOOSTERS.map((b) => [b.id, b]),
) as Record<BoosterId, BoosterDef>;

export interface CoinPack {
  id: string;
  coins: number;
  priceLabel: string;
  bonus?: string;
}

/** Demo bank: simulated purchases, no real payments. */
export const COIN_PACKS: CoinPack[] = [
  { id: 'p1', coins: 500, priceLabel: '$0.99' },
  { id: 'p2', coins: 1200, priceLabel: '$1.99', bonus: '+10%' },
  { id: 'p3', coins: 3500, priceLabel: '$4.99', bonus: '+25%' },
  { id: 'p4', coins: 8000, priceLabel: '$9.99', bonus: '+40%' },
  { id: 'p5', coins: 20000, priceLabel: '$19.99', bonus: '+60%' },
];

/* ---------------- Gem skins ---------------- */

export interface GemSkinDef {
  id: string;
  name: { ru: string; en: string };
  price: number;
  /** glyph per color; when set, tiles render as emoji.
   * Note: the silhouette is always shape-coded by color (see shapes.ts),
   * skins only change the inner art — never the accessibility shape. */
  glyphs?: string[];
  /** palette override per color (fallback: chapter palette) */
  palette?: string[];
  /** carved concentric ring inside the tile */
  ring?: boolean;
  /** сезон коллекции (Волна 4): витрина показывается только в свой сезон */
  season?: SeasonId;
}

export const GEM_SKINS: GemSkinDef[] = [
  { id: 'classic', name: { ru: 'Классика', en: 'Classic' }, price: 0 },
  { id: 'stones', name: { ru: 'Камни', en: 'Stones' }, price: 0, ring: true },
  {
    id: 'fruits', name: { ru: 'Фрукты', en: 'Fruits' }, price: 300,
    glyphs: ['🍓', '🍋', '🍏', '🫐', '🍇', '🍊'],
  },
  {
    id: 'sweets', name: { ru: 'Сладости', en: 'Sweets' }, price: 400,
    glyphs: ['🍬', '🍭', '🍩', '🧊', '🧁', '🍫'],
  },
  {
    id: 'flowers', name: { ru: 'Цветы', en: 'Flowers' }, price: 500,
    glyphs: ['🌹', '🌻', '🍀', '🪻', '🌸', '🌷'],
  },
  {
    id: 'planets', name: { ru: 'Планеты', en: 'Planets' }, price: 600,
    glyphs: ['🔴', '🪐', '🌍', '🌑', '💫', '⭐'],
  },
  {
    id: 'runes', name: { ru: 'Руны', en: 'Runes' }, price: 700,
    glyphs: ['🔥', '⚡', '🌿', '🌊', '🔮', '☀️'],
  },
  {
    id: 'ocean', name: { ru: 'Океан', en: 'Ocean' }, price: 800,
    glyphs: ['🐠', '🐟', '🐙', '🦐', '🐡', '🦑'],
  },
  {
    id: 'animals', name: { ru: 'Зверята', en: 'Critters' }, price: 900,
    glyphs: ['🐭', '🐤', '🐸', '🦋', '🐹', '🦊'],
  },
  {
    id: 'cosmos', name: { ru: 'Космос', en: 'Cosmos' }, price: 1200,
    glyphs: ['🚀', '🛸', '☄️', '🌌', '🔭', '👾'],
  },
  /* --- Волна 4: сезонные скины (силуэты a11y не трогаем — §5.2) --- */
  {
    id: 'season-autumn', name: { ru: 'Осенний сад', en: 'Autumn Garden' }, price: 800, season: 'autumn',
    glyphs: ['🍁', '🌽', '🌰', '🫐', '🍇', '🎃'],
  },
  {
    id: 'season-winter', name: { ru: 'Зимние узоры', en: 'Winter Patterns' }, price: 800, season: 'winter',
    glyphs: ['🎅', '⭐', '🎄', '❄️', '🔮', '🍊'],
  },
  {
    id: 'season-spring', name: { ru: 'Весенний цвет', en: 'Spring Bloom' }, price: 800, season: 'spring',
    glyphs: ['🌷', '🌼', '🌱', '💧', '🦋', '🌸'],
  },
  {
    id: 'season-summer', name: { ru: 'Летний бриз', en: 'Summer Breeze' }, price: 800, season: 'summer',
    glyphs: ['🍉', '🌞', '🌴', '🌊', '🐚', '🍍'],
  },
];

/* ---------------- Avatars ---------------- */

export interface AvatarDef {
  id: string;
  emoji: string;
  bg: string; // css gradient
  price: number;
  /** сезон коллекции (Волна 4) */
  season?: SeasonId;
}

export const AVATARS: AvatarDef[] = [
  { id: 'av-seed', emoji: '🌱', bg: 'linear-gradient(135deg,#b8e0a0,#7ac96a)', price: 0 },
  { id: 'av-flower', emoji: '🌼', bg: 'linear-gradient(135deg,#ffe9a0,#ffd166)', price: 0 },
  { id: 'av-cat', emoji: '🐱', bg: 'linear-gradient(135deg,#ffd8b0,#ffb35e)', price: 50 },
  { id: 'av-fox', emoji: '🦊', bg: 'linear-gradient(135deg,#ffc8a0,#ff8a2a)', price: 50 },
  { id: 'av-panda', emoji: '🐼', bg: 'linear-gradient(135deg,#e8e8e8,#a8a8b8)', price: 50 },
  { id: 'av-frog', emoji: '🐸', bg: 'linear-gradient(135deg,#c0f0a8,#4fd05c)', price: 80 },
  { id: 'av-owl', emoji: '🦉', bg: 'linear-gradient(135deg,#d8c8a8,#9a7a5a)', price: 80 },
  { id: 'av-bee', emoji: '🐝', bg: 'linear-gradient(135deg,#ffe66a,#ffb300)', price: 80 },
  { id: 'av-butterfly', emoji: '🦋', bg: 'linear-gradient(135deg,#c8e0ff,#5ac8ff)', price: 120 },
  { id: 'av-ladybug', emoji: '🐞', bg: 'linear-gradient(135deg,#ffc0c0,#ff5a5a)', price: 120 },
  { id: 'av-unicorn', emoji: '🦄', bg: 'linear-gradient(135deg,#ffd0f0,#c084ff)', price: 200 },
  { id: 'av-dragon', emoji: '🐲', bg: 'linear-gradient(135deg,#c0f0d0,#2fd0c6)', price: 200 },
  { id: 'av-mushroom', emoji: '🍄', bg: 'linear-gradient(135deg,#ffc8c8,#e04470)', price: 150 },
  { id: 'av-sun', emoji: '☀️', bg: 'linear-gradient(135deg,#fff0b0,#ffb300)', price: 150 },
  { id: 'av-moon', emoji: '🌙', bg: 'linear-gradient(135deg,#d0d8ff,#8a9ad6)', price: 150 },
  { id: 'av-star', emoji: '⭐', bg: 'linear-gradient(135deg,#fff8c0,#ffd21f)', price: 150 },
  { id: 'av-gem', emoji: '💎', bg: 'linear-gradient(135deg,#c8f0ff,#5ac8ff)', price: 250 },
  { id: 'av-fire', emoji: '🔥', bg: 'linear-gradient(135deg,#ffd0a0,#ff5a1f)', price: 250 },
  { id: 'av-rocket', emoji: '🚀', bg: 'linear-gradient(135deg,#d0e0ff,#7e2fc2)', price: 300 },
  { id: 'av-robot', emoji: '🤖', bg: 'linear-gradient(135deg,#d8e8e8,#6aa8a4)', price: 300 },
  { id: 'av-queen', emoji: '👑', bg: 'linear-gradient(135deg,#fff0a0,#e0a81f)', price: 400 },
  { id: 'av-mage', emoji: '🧙', bg: 'linear-gradient(135deg,#d8c0ff,#7426a8)', price: 400 },
  { id: 'av-phoenix', emoji: '🦅', bg: 'linear-gradient(135deg,#ffd8a0,#ff7a1f)', price: 500 },
  { id: 'av-rainbow', emoji: '🌈', bg: 'linear-gradient(135deg,#ff9ab8,#ffd83d,#6bff8f,#6be5ff,#d18bff)', price: 600 },
  /* --- Волна 4: сезонные аватары --- */
  { id: 'av-wheat', emoji: '🌾', bg: 'linear-gradient(135deg,#ffe8b0,#d9a441)', price: 180, season: 'autumn' },
  { id: 'av-acorn', emoji: '🌰', bg: 'linear-gradient(135deg,#e8c8a0,#8a5f40)', price: 180, season: 'autumn' },
  { id: 'av-snowman', emoji: '⛄', bg: 'linear-gradient(135deg,#e8f4ff,#8ab8e0)', price: 180, season: 'winter' },
  { id: 'av-mitten', emoji: '🧤', bg: 'linear-gradient(135deg,#ffc8c8,#e05a5a)', price: 180, season: 'winter' },
  { id: 'av-blossom', emoji: '🌸', bg: 'linear-gradient(135deg,#ffd8e8,#ff8ab8)', price: 180, season: 'spring' },
  { id: 'av-duckling', emoji: '🐥', bg: 'linear-gradient(135deg,#fff8c8,#ffd21f)', price: 180, season: 'spring' },
  { id: 'av-pineapple', emoji: '🍍', bg: 'linear-gradient(135deg,#fff0a0,#d9a41f)', price: 180, season: 'summer' },
  { id: 'av-palm', emoji: '🌴', bg: 'linear-gradient(135deg,#c0f0d0,#2fa56d)', price: 180, season: 'summer' },
];

/* ---------------- Frames ---------------- */

export interface FrameDef {
  id: string;
  name: { ru: string; en: string };
  price: number;
  css: string; // box-shadow / border style for avatar container
  /** сезон коллекции (Волна 4) */
  season?: SeasonId;
}

export const FRAMES: FrameDef[] = [
  { id: 'fr-none', name: { ru: 'Без рамки', en: 'None' }, price: 0, css: 'none' },
  { id: 'fr-wood', name: { ru: 'Дерево', en: 'Wood' }, price: 60, css: '0 0 0 3px #8a5f40, 0 2px 6px rgba(0,0,0,.3)' },
  { id: 'fr-leaf', name: { ru: 'Листья', en: 'Leaves' }, price: 100, css: '0 0 0 3px #4fd05c, 0 0 8px rgba(79,208,92,.5)' },
  { id: 'fr-sun', name: { ru: 'Солнце', en: 'Sun' }, price: 120, css: '0 0 0 3px #ffb300, 0 0 12px rgba(255,179,0,.6)' },
  { id: 'fr-ice', name: { ru: 'Лёд', en: 'Ice' }, price: 150, css: '0 0 0 3px #6be5ff, 0 0 10px rgba(107,229,255,.6)' },
  { id: 'fr-rose', name: { ru: 'Роза', en: 'Rose' }, price: 180, css: '0 0 0 3px #ff7799, 0 0 10px rgba(255,119,153,.6)' },
  { id: 'fr-gold', name: { ru: 'Золото', en: 'Gold' }, price: 300, css: '0 0 0 4px #ffd83d, 0 0 14px rgba(255,216,61,.7)' },
  { id: 'fr-emerald', name: { ru: 'Изумруд', en: 'Emerald' }, price: 300, css: '0 0 0 4px #6bff8f, 0 0 14px rgba(107,255,143,.7)' },
  { id: 'fr-amethyst', name: { ru: 'Аметист', en: 'Amethyst' }, price: 350, css: '0 0 0 4px #d18bff, 0 0 14px rgba(209,139,255,.7)' },
  { id: 'fr-royal', name: { ru: 'Королевский', en: 'Royal' }, price: 500, css: '0 0 0 4px #fff, 0 0 0 7px #ffd83d, 0 0 18px rgba(255,216,61,.8)' },
  { id: 'fr-neon', name: { ru: 'Неон', en: 'Neon' }, price: 500, css: '0 0 0 3px #22e0ff, 0 0 18px #22e0ff, 0 0 30px rgba(34,224,255,.5)' },
  { id: 'fr-rainbow', name: { ru: 'Радуга', en: 'Rainbow' }, price: 800, css: '0 0 0 4px transparent, 0 0 16px #ff9ab8, 0 0 24px #ffd83d, 0 0 32px #6bff8f' },
  /* --- Волна 4: сезонные рамки --- */
  { id: 'fr-amber', name: { ru: 'Янтарь', en: 'Amber' }, price: 320, css: '0 0 0 4px #ef8f2a, 0 0 14px rgba(239,143,42,.7)', season: 'autumn' },
  { id: 'fr-snow', name: { ru: 'Снежная', en: 'Snow' }, price: 320, css: '0 0 0 4px #e8f4ff, 0 0 14px rgba(200,230,255,.85)', season: 'winter' },
  { id: 'fr-petal', name: { ru: 'Лепестки', en: 'Petals' }, price: 320, css: '0 0 0 4px #ff9ab8, 0 0 14px rgba(255,154,184,.7)', season: 'spring' },
  { id: 'fr-sunburst', name: { ru: 'Солнечная', en: 'Sunburst' }, price: 320, css: '0 0 0 4px #ffd83d, 0 0 16px rgba(255,216,61,.85)', season: 'summer' },
];

/* ---------------- Name styles ---------------- */

export interface NameStyleDef {
  id: string;
  name: { ru: string; en: string };
  price: number;
  css: string; // css text style
  /** сезон коллекции (Волна 4) */
  season?: SeasonId;
}

export const NAME_STYLES: NameStyleDef[] = [
  { id: 'ns-basic', name: { ru: 'Обычный', en: 'Basic' }, price: 0, css: 'color:#ffffff;font-weight:700' },
  { id: 'ns-fire', name: { ru: 'Огонь', en: 'Fire' }, price: 100, css: 'color:#ff7a1f;font-weight:900;text-shadow:0 0 8px rgba(255,122,31,.8)' },
  { id: 'ns-ice', name: { ru: 'Лёд', en: 'Ice' }, price: 100, css: 'color:#9be8ff;font-weight:700;text-shadow:0 1px 0 #2a9ad6,0 0 8px rgba(107,229,255,.6)' },
  { id: 'ns-gold', name: { ru: 'Золото', en: 'Gold' }, price: 200, css: 'color:#ffd83d;font-weight:900;text-shadow:0 1px 0 #a68a00,0 0 10px rgba(255,216,61,.7)' },
  { id: 'ns-emerald', name: { ru: 'Изумруд', en: 'Emerald' }, price: 150, css: 'color:#8fffa8;font-weight:800;text-shadow:0 0 8px rgba(107,255,143,.6)' },
  { id: 'ns-rose', name: { ru: 'Роза', en: 'Rose' }, price: 150, css: 'color:#ffb8c8;font-weight:800;text-shadow:0 0 8px rgba(255,119,153,.7)' },
  { id: 'ns-royal', name: { ru: 'Роял', en: 'Royal' }, price: 300, css: 'color:#fff;font-weight:900;letter-spacing:.06em;text-shadow:0 0 4px #ffd83d,0 0 12px #e0a81f' },
  { id: 'ns-neon', name: { ru: 'Неон', en: 'Neon' }, price: 350, css: 'color:#22e0ff;font-weight:900;text-shadow:0 0 6px #22e0ff,0 0 14px rgba(34,224,255,.8)' },
  { id: 'ns-shadow', name: { ru: 'Тень', en: 'Shadow' }, price: 200, css: 'color:#3a3a4a;font-weight:900;text-shadow:0 2px 0 rgba(255,255,255,.25)' },
  { id: 'ns-magic', name: { ru: 'Магия', en: 'Magic' }, price: 400, css: 'color:#e8ccff;font-weight:900;font-style:italic;text-shadow:0 0 8px #c44dff,0 0 16px rgba(196,77,255,.6)' },
  /* --- Волна 4: сезонные стили имени --- */
  { id: 'ns-amber', name: { ru: 'Янтарный', en: 'Amber' }, price: 260, css: 'color:#ffc890;font-weight:900;text-shadow:0 1px 0 #a8611f,0 0 10px rgba(239,143,42,.7)', season: 'autumn' },
  { id: 'ns-frost', name: { ru: 'Морозный', en: 'Frost' }, price: 260, css: 'color:#e8f4ff;font-weight:900;text-shadow:0 1px 0 #5a8ac0,0 0 10px rgba(200,230,255,.9)', season: 'winter' },
  { id: 'ns-petal', name: { ru: 'Нежный', en: 'Petal' }, price: 260, css: 'color:#ffd8e8;font-weight:800;text-shadow:0 0 8px rgba(255,154,184,.8)', season: 'spring' },
  { id: 'ns-sunny', name: { ru: 'Солнечный', en: 'Sunny' }, price: 260, css: 'color:#fff0a0;font-weight:900;text-shadow:0 0 10px rgba(255,216,61,.8)', season: 'summer' },
];

/* ---------------- Effects ---------------- */

export interface EffectDef {
  id: string;
  name: { ru: string; en: string };
  price: number;
  kind: 'tile' | 'avatar' | 'name';
  /** particle emoji or css class key */
  visual: string;
  /** сезон коллекции (Волна 4) */
  season?: SeasonId;
}

export const EFFECTS: EffectDef[] = [
  // tile match particles
  { id: 'fx-sparkle', kind: 'tile', visual: '✦', price: 150, name: { ru: 'Искры', en: 'Sparks' } },
  { id: 'fx-petals', kind: 'tile', visual: '🌸', price: 200, name: { ru: 'Лепестки', en: 'Petals' } },
  { id: 'fx-stars', kind: 'tile', visual: '⭐', price: 250, name: { ru: 'Звёзды', en: 'Stars' } },
  { id: 'fx-leaves', kind: 'tile', visual: '🍃', price: 250, name: { ru: 'Листья', en: 'Leaves' } },
  { id: 'fx-hearts', kind: 'tile', visual: '💚', price: 300, name: { ru: 'Сердечки', en: 'Hearts' } },
  { id: 'fx-rainbow', kind: 'tile', visual: '🌈', price: 500, name: { ru: 'Радуга', en: 'Rainbow' } },
  // avatar effects
  { id: 'ae-glow', kind: 'avatar', visual: 'glow', price: 100, name: { ru: 'Свечение', en: 'Glow' } },
  { id: 'ae-pulse', kind: 'avatar', visual: 'pulse', price: 150, name: { ru: 'Пульс', en: 'Pulse' } },
  { id: 'ae-spin', kind: 'avatar', visual: 'spin', price: 250, name: { ru: 'Вращение', en: 'Spin' } },
  { id: 'ae-aurora', kind: 'avatar', visual: 'aurora', price: 350, name: { ru: 'Аврора', en: 'Aurora' } },
  { id: 'ae-flame', kind: 'avatar', visual: 'flame', price: 350, name: { ru: 'Пламя', en: 'Flame' } },
  { id: 'ae-galaxy', kind: 'avatar', visual: 'galaxy', price: 500, name: { ru: 'Галактика', en: 'Galaxy' } },
  // name effects
  { id: 'ne-glow', kind: 'name', visual: 'glow', price: 100, name: { ru: 'Сияние', en: 'Radiance' } },
  { id: 'ne-rainbow', kind: 'name', visual: 'rainbow', price: 250, name: { ru: 'Радуга', en: 'Rainbow' } },
  { id: 'ne-blink', kind: 'name', visual: 'blink', price: 150, name: { ru: 'Мерцание', en: 'Blink' } },
  { id: 'ne-wave', kind: 'name', visual: 'wave', price: 300, name: { ru: 'Волна', en: 'Wave' } },
  { id: 'ne-fire', kind: 'name', visual: 'fire', price: 300, name: { ru: 'Пламя', en: 'Flame' } },
  { id: 'ne-starlight', kind: 'name', visual: 'starlight', price: 450, name: { ru: 'Звёздный свет', en: 'Starlight' } },
  /* --- Волна 4: сезонные эффекты поля --- */
  { id: 'fx-leaffall', kind: 'tile', visual: '🍂', price: 380, name: { ru: 'Листопад', en: 'Leaf Fall' }, season: 'autumn' },
  { id: 'fx-snowflakes', kind: 'tile', visual: '❄️', price: 380, name: { ru: 'Снежинки', en: 'Snowflakes' }, season: 'winter' },
  { id: 'fx-petalrain', kind: 'tile', visual: '🌷', price: 380, name: { ru: 'Лепестковый дождь', en: 'Petal Rain' }, season: 'spring' },
  { id: 'fx-sunshine', kind: 'tile', visual: '☀️', price: 380, name: { ru: 'Солнечные зайчики', en: 'Sunshine' }, season: 'summer' },
];

export const TILE_EFFECTS = EFFECTS.filter((e) => e.kind === 'tile');
export const AVATAR_EFFECTS = EFFECTS.filter((e) => e.kind === 'avatar');
export const NAME_EFFECTS = EFFECTS.filter((e) => e.kind === 'name');

/**
 * Волна 4: все предметы текущего сезонного набора (6 штук:
 * скин, 2 аватара, рамка, стиль имени, эффект поля).
 */
export interface SeasonalBundle {
  skin: GemSkinDef;
  avatars: AvatarDef[];
  frame: FrameDef;
  nameStyle: NameStyleDef;
  effect: EffectDef;
}

export function seasonalBundleFor(season: SeasonId): SeasonalBundle {
  const skin = GEM_SKINS.find((s) => s.season === season) ?? GEM_SKINS[0];
  const avatars = AVATARS.filter((a) => a.season === season);
  const frame = FRAMES.find((f) => f.season === season) ?? FRAMES[0];
  const nameStyle = NAME_STYLES.find((n) => n.season === season) ?? NAME_STYLES[0];
  const effect = TILE_EFFECTS.find((e) => e.season === season) ?? TILE_EFFECTS[0];
  return { skin, avatars, frame, nameStyle, effect };
}

export const SHOP_TOTAL_ITEMS =
  BOOSTERS.length + COIN_PACKS.length + GEM_SKINS.length + AVATARS.length + FRAMES.length + EFFECTS.length + NAME_STYLES.length;
