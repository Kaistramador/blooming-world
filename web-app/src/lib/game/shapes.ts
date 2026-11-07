/* ============================================================
 * Bloom Match — colorblind-friendly shape coding.
 *
 * Every gem color has its own silhouette, identical in ALL
 * chapters and ALL skins, so tiles stay distinguishable without
 * relying on hue alone (accessibility for colorblind players):
 *   0 (red)    → triangle
 *   1 (yellow) → diamond
 *   2 (green)  → hexagon
 *   3 (blue)   → circle
 *   4 (purple) → square
 *   5 (orange) → star
 * ============================================================ */

/** clip-path polygon per gem color; null = plain circle (border-radius) */
export const GEM_SHAPE_CLIP: (string | null)[] = [
  'polygon(50% 2%, 97% 91%, 3% 91%)',
  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)',
  null,
  'polygon(15% 15%, 85% 15%, 85% 85%, 15% 85%)',
  'polygon(50% 0%, 63% 34%, 98% 35%, 71% 57%, 82% 91%, 50% 71%, 18% 91%, 29% 57%, 2% 35%, 37% 34%)',
];

/** CSS silhouette for a gem color (clip-path or circle radius). */
export function gemShapeCss(color: number): { clipPath?: string; borderRadius: string } {
  const i = Math.max(0, Math.min(GEM_SHAPE_CLIP.length - 1, color));
  const clip = GEM_SHAPE_CLIP[i];
  return clip ? { clipPath: clip, borderRadius: '4%' } : { borderRadius: '50%' };
}
