/* ============================================================
 * Bloom Match — Волна 3 «Сад»: метаигра восстановления сада
 * за звёзды + копилка (piggy bank) за победы.
 *
 * Экономика:
 * - Звёзды зарабатываются уровнями (максимум 300: 100 × 3) и
 *   ТРАТЯТСЯ на объекты сада (жанровый стандарт). Заработанные
 *   звёзды (для рейтинга/профиля) и доступные (для сада) —
 *   разные величины: available = earned - spent.
 * - Копилка: каждая победа кладёт монеты в копилку; каждые
 *   PIGGY_WINS_TARGET побед её можно вскрыть и забрать всё.
 *   Без платных механик (§5.3) — вскрытие бесплатное.
 * - Сад платит обратно монетами (связка сад ↔ магазин).
 *
 * Доступность (§5.2): зоны различимы подписями и полосами
 * ландшафта, объекты — эмодзи + подпись, замки — пиктограмма.
 * ============================================================ */

import { CHAPTER_SIZE } from '@/lib/game/levels';
import type { Localized } from '@/lib/i18n';

export type GardenZone = 0 | 1 | 2;

export interface GardenObjectDef {
  id: string;
  name: Localized;
  emoji: string;
  /** цена в звёздах */
  cost: number;
  zone: GardenZone;
  /** позиция в сцене сада, % (x — по ширине, y — сверху вниз) */
  x: number;
  y: number;
  /** масштаб эмодзи (1 = базовый) */
  size: number;
}

/** После какой главы открывается зона сада (глава = индекс 0..9). */
export const GARDEN_ZONE_CHAPTER: Record<GardenZone, number> = {
  0: 1, // зона «У входа» — сразу после главы 1 (сад открывается)
  1: 3, // зона «Сад» — после главы 3
  2: 6, // зона «Парк» — после главы 6
};

/** Уровень, завершением которого открывается зона (для UI-подсказок). */
export function gardenZoneUnlockLevel(zone: GardenZone): number {
  return GARDEN_ZONE_CHAPTER[zone] * CHAPTER_SIZE;
}

export const GARDEN_OBJECTS: GardenObjectDef[] = [
  /* ---- Зона 0 «У входа» — пустошь превращается в лужайку ---- */
  { id: 'g-grass',     name: { ru: 'Газон', en: 'Lawn', es: 'Césped', pt: 'Grama' },            emoji: '🌿', cost: 2, zone: 0, x: 12, y: 28, size: 1.0 },
  { id: 'g-path',      name: { ru: 'Тропинка', en: 'Garden path', es: 'Sendero', pt: 'Caminho' }, emoji: '🛤️', cost: 2, zone: 0, x: 35, y: 25, size: 1.05 },
  { id: 'g-daisy',     name: { ru: 'Ромашки', en: 'Daisies', es: 'Margaritas', pt: 'Margaridas' },    emoji: '🌼', cost: 3, zone: 0, x: 58, y: 28, size: 0.9 },
  { id: 'g-bush',      name: { ru: 'Кустарник', en: 'Bush', es: 'Arbusto', pt: 'Arbusto' },         emoji: '🪴', cost: 3, zone: 0, x: 81, y: 26, size: 1.05 },
  { id: 'g-pot',       name: { ru: 'Кашпо', en: 'Planter', es: 'Jardinera', pt: 'Vaso ornamental' },   emoji: '🏺', cost: 4, zone: 0, x: 12, y: 11, size: 0.95 },
  { id: 'g-tulip',     name: { ru: 'Тюльпаны', en: 'Tulips', es: 'Tulipanes', pt: 'Tulipas' },       emoji: '🌷', cost: 5, zone: 0, x: 35, y: 9,  size: 0.95 },
  { id: 'g-lamp',      name: { ru: 'Фонарь', en: 'Lantern', es: 'Farol', pt: 'Lampião' },         emoji: '🏮', cost: 5, zone: 0, x: 58, y: 11, size: 1.0 },
  { id: 'g-mushroom',  name: { ru: 'Грибочки', en: 'Mushrooms', es: 'Setas', pt: 'Cogumelos' },     emoji: '🍄', cost: 6, zone: 0, x: 81, y: 10, size: 0.9 },

  /* ---- Зона 1 «Сад» — сердце поместья ---- */
  { id: 'g-flowerbed', name: { ru: 'Клумба', en: 'Flowerbed', es: 'Macizo de flores', pt: 'Canteiro de flores' }, emoji: '💐', cost: 5,  zone: 1, x: 10, y: 59, size: 1.0 },
  { id: 'g-apple',     name: { ru: 'Яблоня', en: 'Apple tree', es: 'Manzano', pt: 'Macieira' },    emoji: '🌳', cost: 6,  zone: 1, x: 29, y: 55, size: 1.35 },
  { id: 'g-birdhouse', name: { ru: 'Скворечник', en: 'Birdhouse', es: 'Casita de pájaros', pt: 'Casa de pássaros' },  emoji: '🐦', cost: 7,  zone: 1, x: 49, y: 59, size: 0.95 },
  { id: 'g-bench',     name: { ru: 'Скамейка', en: 'Bench', es: 'Banco', pt: 'Banco' },         emoji: '🪑', cost: 7,  zone: 1, x: 69, y: 57, size: 1.05 },
  { id: 'g-bee',       name: { ru: 'Улей', en: 'Beehive', es: 'Colmena', pt: 'Colmeia' },        emoji: '🐝', cost: 8,  zone: 1, x: 89, y: 59, size: 0.95 },
  { id: 'g-greenhouse',name: { ru: 'Теплица', en: 'Greenhouse', es: 'Invernadero', pt: 'Estufa' },  emoji: '🏡', cost: 8,  zone: 1, x: 76, y: 40, size: 1.3 },
  { id: 'g-sprinkler', name: { ru: 'Поливалка', en: 'Sprinkler', es: 'Aspersor', pt: 'Aspersor' },    emoji: '💦', cost: 9,  zone: 1, x: 16, y: 50, size: 0.9 },
  { id: 'g-swing',     name: { ru: 'Качели', en: 'Swing set', es: 'Columpio', pt: 'Balanço' },      emoji: '🛝', cost: 9,  zone: 1, x: 38, y: 47, size: 1.2 },
  { id: 'g-hedge',     name: { ru: 'Живая изгородь', en: 'Hedge', es: 'Seto', pt: 'Cerca viva' },      emoji: '🌲', cost: 9,  zone: 1, x: 60, y: 49, size: 1.2 },
  { id: 'g-pond',      name: { ru: 'Пруд с лилиями', en: 'Lily pond', es: 'Estanque de nenúfares', pt: 'Lago de vitórias-régias' }, emoji: '🪷', cost: 10, zone: 1, x: 82, y: 48, size: 1.1 },
  { id: 'g-berries',   name: { ru: 'Ягодные кусты', en: 'Berry bushes', es: 'Arbustos de bayas', pt: 'Arbustos de frutas' }, emoji: '🫐', cost: 10, zone: 1, x: 26, y: 37, size: 0.95 },
  { id: 'g-sunflower', name: { ru: 'Подсолнухи', en: 'Sunflowers', es: 'Girasoles', pt: 'Girassóis' },  emoji: '🌻', cost: 10, zone: 1, x: 52, y: 36, size: 1.0 },
  { id: 'g-arbor',     name: { ru: 'Виноградная арка', en: 'Grape arbor', es: 'Pérgola de uvas', pt: 'Pérgola de uvas' }, emoji: '🍇', cost: 8,  zone: 1, x: 8,  y: 39, size: 1.0 },

  /* ---- Зона 2 «Парк» — парадная часть ---- */
  { id: 'g-statue',    name: { ru: 'Статуя', en: 'Statue', es: 'Estatua', pt: 'Estátua' },       emoji: '🗿', cost: 6,  zone: 2, x: 12, y: 91, size: 1.0 },
  { id: 'g-clock',     name: { ru: 'Солнечные часы', en: 'Sundial', es: 'Reloj de sol', pt: 'Relógio de sol' },  emoji: '🕗', cost: 7,  zone: 2, x: 33, y: 89, size: 1.0 },
  { id: 'g-maze',      name: { ru: 'Лабиринт', en: 'Hedge maze', es: 'Laberinto', pt: 'Labirinto' },   emoji: '🌀', cost: 7,  zone: 2, x: 54, y: 91, size: 1.0 },
  { id: 'g-rose',      name: { ru: 'Розарий', en: 'Rose garden', es: 'Rosaleda', pt: 'Rosário' },   emoji: '🌹', cost: 8,  zone: 2, x: 75, y: 89, size: 0.95 },
  { id: 'g-sakura',    name: { ru: 'Сакура', en: 'Sakura tree', es: 'Sakura', pt: 'Cerejeira' },   emoji: '🌸', cost: 8,  zone: 2, x: 92, y: 91, size: 1.1 },
  { id: 'g-swans',     name: { ru: 'Лебединое озеро', en: 'Swan lake', es: 'Lago de los cisnes', pt: 'Lago dos cisnes' }, emoji: '🦢', cost: 9,  zone: 2, x: 12, y: 81, size: 1.05 },
  { id: 'g-peacock',   name: { ru: 'Павлин', en: 'Peacock', es: 'Pavo real', pt: 'Pavão' },     emoji: '🦚', cost: 10, zone: 2, x: 35, y: 79, size: 1.05 },
  { id: 'g-gazebo',    name: { ru: 'Беседка', en: 'Gazebo', es: 'Quiosco', pt: 'Quiosque' },      emoji: '🛖', cost: 11, zone: 2, x: 58, y: 81, size: 1.25 },
  { id: 'g-balloon',   name: { ru: 'Воздушный шар', en: 'Hot-air balloon', es: 'Globo aerostático', pt: 'Balão de ar quente' }, emoji: '🎈', cost: 12, zone: 2, x: 81, y: 79, size: 1.15 },
  { id: 'g-arch',      name: { ru: 'Мраморная арка', en: 'Marble arch', es: 'Arco de mármol', pt: 'Arco de mármore' }, emoji: '🏛️', cost: 13, zone: 2, x: 14, y: 70, size: 1.2 },
  { id: 'g-carousel',  name: { ru: 'Карусель', en: 'Carousel', es: 'Carrusel', pt: 'Carrossel' },   emoji: '🎠', cost: 14, zone: 2, x: 40, y: 68, size: 1.3 },
  { id: 'g-stage',     name: { ru: 'Летняя сцена', en: 'Summer stage', es: 'Escenario de verano', pt: 'Palco de verão' }, emoji: '🎪', cost: 14, zone: 2, x: 65, y: 70, size: 1.3 },
  { id: 'g-fountain',  name: { ru: 'Фонтан', en: 'Fountain', es: 'Fuente', pt: 'Fonte' },      emoji: '⛲', cost: 16, zone: 2, x: 88, y: 70, size: 1.3 },
];

export const GARDEN_MAP: Record<string, GardenObjectDef> = Object.fromEntries(
  GARDEN_OBJECTS.map((o) => [o.id, o]),
);

/** Суммарная цена сада в звёздах (баланс проверяется симуляцией). */
export const GARDEN_TOTAL_COST = GARDEN_OBJECTS.reduce((a, o) => a + o.cost, 0);

/** Монеты обратно за восстановление объекта (связка сад ↔ магазин). */
export function gardenCoinsBack(cost: number): number {
  return 10 + cost * 2;
}

/* ---------------- Копилка ---------------- */

/** Сколько побед накапливается до вскрытия копилки. */
export const PIGGY_WINS_TARGET = 5;

/**
 * Взнос победы в копилку: растёт с уровнем, капится на 30-м,
 * чтобы поздние главы не ломали экономику.
 */
export function piggyDeposit(level: number): number {
  return 10 + Math.min(Math.max(level, 1), 30) * 2;
}
