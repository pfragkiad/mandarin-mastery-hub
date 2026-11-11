import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * useGlyphFit — keeps a glyph tile's visible ink size consistent across fonts.
 *
 * Some fonts (notably Android's system CJK fallback) draw sparse characters such as
 * 辶 much smaller inside the em square than dense ones like 言, so equal font sizes
 * look unequal inside equal tiles. The hook measures the rendered ink pixels of the
 * glyph on an offscreen canvas — in the element's own computed font, once web fonts
 * have settled — and returns a scale factor that lifts unusually small ink toward the
 * shared visual size.
 *
 * Inputs: a ref to the element holding the glyph text, and the glyph itself (''
 * disables measurement, e.g. for placeholder tokens).
 *
 * Tricky logic:
 * - It never shrinks ink: dense glyphs stay exactly as the font draws them, and only
 *   ink whose longest side is under 0.78em is lifted (toward 0.86em, capped at 1.45×
 *   and at 92% of the tile box so strokes never overflow the tile).
 * - Measurement must also run after document.fonts.ready, otherwise it would read the
 *   fallback font's metrics before the handwriting web font swaps in.
 * - It fails closed to 1 (no scaling) whenever canvas measurement is unavailable,
 *   e.g. in tests or very old browsers.
 * - The scale is applied with a CSS transform, so layout never shifts.
 */
/**
 * glyphFitScale — the pure rule behind useGlyphFit, exported for tests.
 * longest = ink's longest side in px, size = font size in px, box = tile box in px.
 * Returns 1 (untouched) when the ink already fills at least 0.78em; otherwise lifts it
 * toward 0.86em, never above 1.45× and never past 92% of the tile box.
 */
export function glyphFitScale(longest: number, size: number, box: number): number {
  if (longest <= 0 || size <= 0) return 1;
  const em = longest / size;
  if (em >= 0.78) return 1;
  const next = Math.min(0.86 / em, (box * 0.92) / longest, 1.45);
  return next > 1.02 ? next : 1;
}

export function useGlyphFit(ref: RefObject<HTMLElement | null>, glyph: string): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || !glyph) return;
    let cancelled = false;
    const measure = () => {
      try {
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize);
        if (!size) return;
        const px = Math.ceil(size * 3);
        const canvas = document.createElement('canvas');
        canvas.width = px;
        canvas.height = px;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(glyph, px / 2, px / 2);
        const data = ctx.getImageData(0, 0, px, px).data;
        let minX = px, maxX = -1, minY = px, maxY = -1;
        for (let y = 0; y < px; y++) {
          for (let x = 0; x < px; x++) {
            if ((data[(y * px + x) * 4 + 3] ?? 0) > 24) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0 || cancelled) return;
        const longest = Math.max(maxX - minX + 1, maxY - minY + 1);
        const box = el.closest('.decomposition-glyph')?.clientWidth || size * 1.45;
        setScale(glyphFitScale(longest, size, box));
      } catch {
        /* fail closed: keep scale 1 */
      }
    };
    measure();
    // Web fonts swap in asynchronously; measure again once they settle.
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [ref, glyph]);
  return scale;
}
