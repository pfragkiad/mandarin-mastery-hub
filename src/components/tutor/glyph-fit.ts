import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Ink measurement shared by the two glyph-tile rules below.
 *
 * Both rules need the *visible* pixels of a glyph, not the box the font reserves for
 * it: a font's advance box is symmetric while its ink rarely is (a question mark sits
 * left of its advance, a sparse radical sits high in its em square). So the glyph is
 * drawn on an offscreen canvas, centred, in the element's own computed font, and the
 * painted edges are read back relative to that centre.
 *
 * Returns null whenever canvas measurement is unavailable (tests, very old browsers),
 * which makes every caller fail closed to "leave the glyph exactly as drawn".
 */
type InkBounds = {
  /** left / right / top / bottom edge of the painted ink, px from the drawing centre */
  left: number; right: number; top: number; bottom: number;
  /** the font size the measurement was taken at */
  size: number;
};

function measureGlyphInk(el: HTMLElement, glyph: string): InkBounds | null {
  try {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    if (!size) return null;
    const px = Math.ceil(size * 3);
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
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
    if (maxX < 0) return null;
    return {
      left: minX - px / 2, right: maxX - px / 2,
      top: minY - px / 2, bottom: maxY - px / 2,
      size,
    };
  } catch {
    return null;
  }
}

/**
 * Runs `measure` now and again once web fonts have settled, because the handwriting
 * font swaps in asynchronously and the fallback font's metrics would otherwise be
 * the ones read. Every caller fails closed to its untouched state on null.
 */
function useInkOf(ref: RefObject<HTMLElement | null>, glyph: string): InkBounds | null {
  const [ink, setInk] = useState<InkBounds | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !glyph) return;
    let cancelled = false;
    const measure = () => {
      const next = measureGlyphInk(el, glyph);
      if (next && !cancelled) setInk(next);
    };
    measure();
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [ref, glyph]);
  return ink;
}

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
  const ink = useInkOf(ref, glyph);
  if (!ink) return 1;
  const longest = Math.max(ink.right - ink.left + 1, ink.bottom - ink.top + 1);
  const box = ref.current?.closest('.decomposition-glyph')?.clientWidth || ink.size * 1.45;
  return glyphFitScale(longest, ink.size, box);
}

/**
 * glyphInkShift — the pure rule behind useGlyphInkShift, exported for tests.
 *
 * Flex centring aligns the *advance box* the font reserves for a glyph, so a mark whose
 * ink is not symmetric inside that box (a question mark, whose stroke sits left of its
 * advance and whose height varies by font) reads as off-centre inside a bordered tile.
 * The measured edges give the ink's own centre; shifting by its negative puts that
 * centre on the tile's centre. Differences under 1px are dropped so the mark never
 * jitters between fonts that are already centred.
 */
export function glyphInkShift(ink: { left: number; right: number; top: number; bottom: number }): { dx: number; dy: number } {
  const dx = -(ink.left + ink.right) / 2;
  const dy = -(ink.top + ink.bottom) / 2;
  return { dx: Math.abs(dx) < 1 ? 0 : dx, dy: Math.abs(dy) < 1 ? 0 : dy };
}

/**
 * useGlyphInkShift — optically centres a single mark inside its tile.
 *
 * Inputs: a ref to the element holding the mark, and the mark itself ('' disables it).
 * Returns the px translate to apply; {0,0} until measured, and forever {0,0} when
 * canvas measurement is unavailable, so the mark simply stays where flex put it.
 *
 * Tricky logic: it must be applied to an element inside the tile, never to the tile
 * itself, or the tile's border would move with the ink.
 */
export function useGlyphInkShift(ref: RefObject<HTMLElement | null>, glyph: string): { dx: number; dy: number } {
  const ink = useInkOf(ref, glyph);
  if (!ink) return { dx: 0, dy: 0 };
  return glyphInkShift(ink);
}
