/* ============================================================
 * Bloom Match — graphics evolution system.
 * 10 chapters = 10 eras: tiles, palettes and the world itself
 * evolve from primitive "stone age" flat squares to a fully
 * blooming modern garden with glow, glass and particles.
 *
 * Accessibility: palettes are derived from colorblind-safe hue
 * anchors (Okabe-Ito based) with a fixed hue ORDER for gem
 * colors (red, yellow, green, blue, purple, orange). Eras evolve
 * saturation / lightness / rims / effects — never the hue order,
 * so a red gem is always recognizably "the red one", and every
 * gem additionally carries its own silhouette (see shapes.ts).
 * ============================================================ */

export interface EraTileStyle {
  rim: string;           // outline color drawn around every tile silhouette
  rimWidth: number;      // rim thickness, fraction of tile (0..0.08)
  flat: boolean;         // solid color instead of gradient
  gradient: boolean;     // linear-gradient shading
  gloss: boolean;        // top highlight inset
  pixelShadow: boolean;  // hard stepped shadow (retro)
  softShadow: boolean;   // soft modern shadow
  glow: boolean;         // neon glow
  glass: boolean;        // translucent glass
  shine: boolean;        // animated shine sweep
  wobble: boolean;       // idle bobbing animation
  pattern: 'none' | 'pixel' | 'noise' | 'rays';
}

export interface EraBackground {
  sky: string;           // css gradient
  ground: string;        // css gradient
  hillFar: string;
  hillNear: string;
  dark: boolean;         // dark scene (neon era)
  clouds: number;        // 0..4
  sun: boolean;
  stars: boolean;
  trees: number;         // 0..5
  bushes: number;
  flowers: number;       // 0..14
  butterflies: number;   // 0..3
  petals: number;        // falling petals 0..8
  fireflies: number;     // 0..6
  sparkles: number;      // ambient sparkles 0..10
  rays: boolean;         // sun rays
}

export interface ChapterTheme {
  id: number;            // 0..9
  name: { ru: string; en: string };
  tagline: { ru: string; en: string };
  palette: string[];     // 6 tile base colors (index by gem color)
  paletteDark: string[]; // shading partner for gradients
  bg: EraBackground;
  tile: EraTileStyle;
  uiAccent: string;      // chapter UI accent color
}

/* ---------- colorblind-safe palette engine ---------- */

function hexToHsl(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(94, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh * 6) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1 / 6) { r = c; g = x; }
  else if (hh < 2 / 6) { r = x; g = c; }
  else if (hh < 3 / 6) { g = c; b = x; }
  else if (hh < 4 / 6) { g = x; b = c; }
  else if (hh < 5 / 6) { r = x; b = c; }
  else { r = c; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function tint(hex: string, sMul: number, lAdd: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s * sMul, l + lAdd);
}

/* Hue anchors (Okabe-Ito derived, tuned lightness ladder so even
 * deutan/protan eyes get a brightness cue, not just hue):
 *   red #c74134 (dark) · yellow #f6e04b (bright) · green #2ea56d (deep)
 *   blue #3d9be0 (mid) · purple #b06fc9 (light-mid) · orange #ef8f2a (mid) */
const ANCHORS = ['#c74134', '#f6e04b', '#2ea56d', '#3d9be0', '#b06fc9', '#ef8f2a'];

function eraPal(sMul: number, lAdd: number, darkL: number): { p: string[]; d: string[] } {
  return {
    p: ANCHORS.map((c) => tint(c, sMul, lAdd)),
    d: ANCHORS.map((c) => tint(c, sMul * 0.92, lAdd + darkL)),
  };
}

/* per-era look: same hue order, evolving richness */
const PAL = [
  eraPal(0.55, -3, -14),  // 0 Пустошь — desaturated stone age
  eraPal(0.72, 2, -16),   // 1 Первые ростки — pixel era
  eraPal(0.88, 1, -18),   // 2 Зелёный берег — 16-color era
  eraPal(1.0, 2, -18),    // 3 Роща — gloss era
  eraPal(0.92, 7, -14),   // 4 Луг цветов — flat & light
  eraPal(0.9, 8, -12),    // 5 Светлый лес — soft pastel
  eraPal(1.18, 6, -10),   // 6 Волшебный сад — neon
  eraPal(0.82, 10, -16),  // 7 Сумеречные поляны — glass pastel
  eraPal(0.98, 8, -14),   // 8 Радужная долина
  eraPal(1.04, 10, -14),  // 9 Золотой сад
];

export const CHAPTERS: ChapterTheme[] = [
  {
    id: 0,
    name: { ru: 'Пустошь', en: 'The Barrens' },
    tagline: { ru: 'Всё начинается с простых камней', en: 'It all starts with simple stones' },
    palette: PAL[0].p,
    paletteDark: PAL[0].d,
    uiAccent: '#8a7a68',
    tile: {
      rim: 'rgba(40,34,28,.55)', rimWidth: 0.05, flat: true,
      gradient: false, gloss: false, pixelShadow: false, softShadow: false,
      glow: false, glass: false, shine: false, wobble: false, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#9b978e 0%,#b5b0a6 60%,#8d8779 100%)',
      ground: 'linear-gradient(180deg,#8d8271 0%,#6e6657 100%)',
      hillFar: '#a19a8c', hillNear: '#847c6c', dark: false,
      clouds: 0, sun: false, stars: false, trees: 0, bushes: 0,
      flowers: 0, butterflies: 0, petals: 0, fireflies: 0, sparkles: 0, rays: false,
    },
  },
  {
    id: 1,
    name: { ru: 'Первые ростки', en: 'First Sprouts' },
    tagline: { ru: 'Пиксельная жизнь пробивается сквозь камень', en: 'Pixel life breaks through the stone' },
    palette: PAL[1].p,
    paletteDark: PAL[1].d,
    uiAccent: '#7ac96a',
    tile: {
      rim: 'rgba(30,26,20,.5)', rimWidth: 0.045, flat: true,
      gradient: false, gloss: false, pixelShadow: true, softShadow: false,
      glow: false, glass: false, shine: false, wobble: false, pattern: 'pixel',
    },
    bg: {
      sky: 'linear-gradient(180deg,#8fb8c9 0%,#b5d6c9 60%,#8fb894 100%)',
      ground: 'linear-gradient(180deg,#7aa86a 0%,#568a4c 100%)',
      hillFar: '#9bc98e', hillNear: '#6fae62', dark: false,
      clouds: 1, sun: false, stars: false, trees: 1, bushes: 0,
      flowers: 1, butterflies: 0, petals: 0, fireflies: 0, sparkles: 0, rays: false,
    },
  },
  {
    id: 2,
    name: { ru: 'Зелёный берег', en: 'Green Shore' },
    tagline: { ru: '16 цветов вместо четырёх', en: 'Sixteen colors instead of four' },
    palette: PAL[2].p,
    paletteDark: PAL[2].d,
    uiAccent: '#3d9be0',
    tile: {
      rim: 'rgba(28,32,40,.45)', rimWidth: 0.04, flat: false,
      gradient: true, gloss: false, pixelShadow: true, softShadow: false,
      glow: false, glass: false, shine: false, wobble: false, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#7ec3e8 0%,#a8dff0 55%,#cfe8c9 100%)',
      ground: 'linear-gradient(180deg,#7ab86a 0%,#4c8a44 100%)',
      hillFar: '#93cc85', hillNear: '#63a855', dark: false,
      clouds: 2, sun: true, stars: false, trees: 2, bushes: 1,
      flowers: 3, butterflies: 0, petals: 0, fireflies: 0, sparkles: 0, rays: false,
    },
  },
  {
    id: 3,
    name: { ru: 'Роща', en: 'The Grove' },
    tagline: { ru: 'Глянец и глубина', en: 'Gloss and depth' },
    palette: PAL[3].p,
    paletteDark: PAL[3].d,
    uiAccent: '#ef8f2a',
    tile: {
      rim: 'rgba(30,26,40,.4)', rimWidth: 0.035, flat: false,
      gradient: true, gloss: true, pixelShadow: false, softShadow: true,
      glow: false, glass: false, shine: false, wobble: false, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#6fc0f0 0%,#9fd8f5 50%,#d4ecc0 100%)',
      ground: 'linear-gradient(180deg,#82c46e 0%,#4c9440 100%)',
      hillFar: '#9cd48a', hillNear: '#68b458', dark: false,
      clouds: 2, sun: true, stars: false, trees: 3, bushes: 2,
      flowers: 5, butterflies: 1, petals: 0, fireflies: 0, sparkles: 0, rays: false,
    },
  },
  {
    id: 4,
    name: { ru: 'Луг цветов', en: 'Flower Meadow' },
    tagline: { ru: 'Флэт, чистота и свет', en: 'Flat, clean and light' },
    palette: PAL[4].p,
    paletteDark: PAL[4].d,
    uiAccent: '#2ea56d',
    tile: {
      rim: 'rgba(30,26,40,.35)', rimWidth: 0.03, flat: true,
      gradient: false, gloss: false, pixelShadow: false, softShadow: true,
      glow: false, glass: false, shine: false, wobble: true, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#87d0f5 0%,#bce6fa 50%,#dff2cf 100%)',
      ground: 'linear-gradient(180deg,#8cc978 0%,#57a04a 100%)',
      hillFar: '#a5dc92', hillNear: '#74bc62', dark: false,
      clouds: 3, sun: true, stars: false, trees: 3, bushes: 3,
      flowers: 8, butterflies: 1, petals: 2, fireflies: 0, sparkles: 2, rays: false,
    },
  },
  {
    id: 5,
    name: { ru: 'Светлый лес', en: 'Bright Forest' },
    tagline: { ru: 'Мягкие граденты оживают', en: 'Soft gradients come alive' },
    palette: PAL[5].p,
    paletteDark: PAL[5].d,
    uiAccent: '#3d9be0',
    tile: {
      rim: 'rgba(30,26,40,.35)', rimWidth: 0.03, flat: false,
      gradient: true, gloss: false, pixelShadow: false, softShadow: true,
      glow: false, glass: false, shine: false, wobble: true, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#9adcf8 0%,#c8ecfa 45%,#e8f6d8 100%)',
      ground: 'linear-gradient(180deg,#95d482 0%,#5ea84e 100%)',
      hillFar: '#b0e09c', hillNear: '#80c86c', dark: false,
      clouds: 3, sun: true, stars: false, trees: 4, bushes: 4,
      flowers: 10, butterflies: 2, petals: 3, fireflies: 0, sparkles: 3, rays: false,
    },
  },
  {
    id: 6,
    name: { ru: 'Волшебный сад', en: 'Enchanted Garden' },
    tagline: { ru: 'Неон зажигает сад', en: 'Neon lights up the garden' },
    palette: PAL[6].p,
    paletteDark: PAL[6].d,
    uiAccent: '#22e0ff',
    tile: {
      rim: 'rgba(235,240,255,.7)', rimWidth: 0.035, flat: false,
      gradient: true, gloss: false, pixelShadow: false, softShadow: false,
      glow: true, glass: false, shine: false, wobble: true, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#1a1030 0%,#31195c 55%,#183248 100%)',
      ground: 'linear-gradient(180deg,#1e4a3a 0%,#12332a 100%)',
      hillFar: '#24405c', hillNear: '#1a2f46', dark: true,
      clouds: 0, sun: false, stars: true, trees: 3, bushes: 2,
      flowers: 6, butterflies: 0, petals: 0, fireflies: 5, sparkles: 5, rays: false,
    },
  },
  {
    id: 7,
    name: { ru: 'Сумеречные поляны', en: 'Twilight Glades' },
    tagline: { ru: 'Сад становится стеклянным', en: 'The garden turns to glass' },
    palette: PAL[7].p,
    paletteDark: PAL[7].d,
    uiAccent: '#3d9be0',
    tile: {
      rim: 'rgba(240,244,255,.6)', rimWidth: 0.04, flat: false,
      gradient: true, gloss: true, pixelShadow: false, softShadow: true,
      glow: false, glass: true, shine: false, wobble: true, pattern: 'none',
    },
    bg: {
      sky: 'linear-gradient(180deg,#3a2a6a 0%,#8a5aa8 45%,#e88a5a 100%)',
      ground: 'linear-gradient(180deg,#5a7a4a 0%,#3a5232 100%)',
      hillFar: '#7a5a98', hillNear: '#553f70', dark: true,
      clouds: 1, sun: false, stars: true, trees: 4, bushes: 3,
      flowers: 9, butterflies: 1, petals: 4, fireflies: 3, sparkles: 4, rays: false,
    },
  },
  {
    id: 8,
    name: { ru: 'Радужная долина', en: 'Rainbow Valley' },
    tagline: { ru: 'Мир наполняется жизнью', en: 'The world fills with life' },
    palette: PAL[8].p,
    paletteDark: PAL[8].d,
    uiAccent: '#ef8f2a',
    tile: {
      rim: 'rgba(110,70,24,.4)', rimWidth: 0.03, flat: false,
      gradient: true, gloss: true, pixelShadow: false, softShadow: true,
      glow: false, glass: false, shine: true, wobble: true, pattern: 'rays',
    },
    bg: {
      sky: 'linear-gradient(180deg,#8ad4ff 0%,#c0e8ff 40%,#ffe0b0 100%)',
      ground: 'linear-gradient(180deg,#9ade84 0%,#64b452 100%)',
      hillFar: '#b5e8a0', hillNear: '#88cc70', dark: false,
      clouds: 4, sun: true, stars: false, trees: 5, bushes: 5,
      flowers: 12, butterflies: 2, petals: 6, fireflies: 0, sparkles: 6, rays: true,
    },
  },
  {
    id: 9,
    name: { ru: 'Золотой сад', en: 'Golden Garden' },
    tagline: { ru: 'Вершина расцвета', en: 'The peak of bloom' },
    palette: PAL[9].p,
    paletteDark: PAL[9].d,
    uiAccent: '#f6e04b',
    tile: {
      rim: 'rgba(110,70,24,.45)', rimWidth: 0.035, flat: false,
      gradient: true, gloss: true, pixelShadow: false, softShadow: true,
      glow: true, glass: false, shine: true, wobble: true, pattern: 'rays',
    },
    bg: {
      sky: 'linear-gradient(180deg,#ffca7a 0%,#ffb0c8 45%,#ffe9c0 100%)',
      ground: 'linear-gradient(180deg,#a8e890 0%,#70c05c 100%)',
      hillFar: '#c8f0b0', hillNear: '#98d880', dark: false,
      clouds: 4, sun: true, stars: false, trees: 5, bushes: 5,
      flowers: 14, butterflies: 3, petals: 8, fireflies: 0, sparkles: 8, rays: true,
    },
  },
];

export function chapterTheme(chapter: number): ChapterTheme {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, chapter))];
}
