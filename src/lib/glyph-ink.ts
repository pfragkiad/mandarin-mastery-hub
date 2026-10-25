/**
 * Optical spacing for character forms.
 *
 * CJK glyphs sit inside a full-width advance box, so two forms can share an
 * equal box gap and still look far apart: a narrow component form such as 刂
 * carries wide empty side bearings. These helpers measure the real ink of a
 * glyph in the font actually being rendered and turn that into margins that
 * make the visible gaps equal.
 *
 * Measurement is the only source of truth here — nothing is guessed from
 * appearance. Where ink bounds cannot be measured (no DOM, unsupported
 * environment) the helpers fail closed to plain, equal box spacing.
 */

export type GlyphInk = {
  /** Text advance of the glyph in the measured font and size. */
  advance: number;
  /** Empty space between the left edge of the advance box and the start of the ink. */
  left: number;
  /** Empty space between the end of the ink and the right edge of the advance box. */
  right: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const cache = new Map<string, GlyphInk>();

/**
 * Measures one glyph's ink bounds in the given font. Returns null when the
 * environment cannot report ink bounds, so callers keep their plain spacing.
 */
export function measureGlyphInk(glyph: string, fontFamily: string, fontSize: number): GlyphInk | null {
  if (!glyph || !fontFamily || !(fontSize > 0)) return null;
  if (typeof document === 'undefined' || !document.body) return null;
  const key = `${glyph}|${fontFamily}|${fontSize}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden';
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', '0');
  text.style.fontFamily = fontFamily;
  text.style.fontSize = `${fontSize}px`;
  text.textContent = glyph;
  svg.appendChild(text);
  document.body.appendChild(svg);
  try {
    const box = text.getBBox();
    const advance = text.getComputedTextLength();
    if (!Number.isFinite(box.width) || box.width <= 0 || !Number.isFinite(advance) || advance <= 0) return null;
    const ink: GlyphInk = { advance, left: box.x, right: advance - (box.x + box.width) };
    cache.set(key, ink);
    return ink;
  } catch {
    return null;
  } finally {
    svg.remove();
  }
}

/**
 * Left margin for every glyph after the first so that each visible gap equals
 * `target`. A gap is the margin plus the empty bearings on both sides, so the
 * margin can be negative — that is what pulls a narrow form towards its
 * neighbour. The result can never let ink overlap, because the margin is
 * derived from the same bearings with a non-negative target.
 */
export function opticalMargins(inks: (GlyphInk | null)[], target: number): number[] {
  return inks.map((ink, index) => {
    if (index === 0) return 0;
    const previous = inks[index - 1];
    if (!ink || !previous) return target;
    return target - previous.right - ink.left;
  });
}
