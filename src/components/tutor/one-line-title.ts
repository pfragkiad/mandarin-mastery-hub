import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Keeps a page title on one line by lowering its font size, never by clipping it.
 *
 * The library titles ("Get to know the characters.", "Every sound of Mandarin." …) are
 * display-serif headings with an inline source-info icon trailing the text. On phones the
 * stylesheet size is too wide for the text plus that icon, so the title wrapped onto a
 * second or third line. The rule here measures the title's true single-line width and
 * lowers the font size only as far as that one line actually needs.
 *
 * Inputs: a ref to the heading element, plus a `key` naming the title's current text
 * (e.g. the active tab) so the measurement re-runs whenever the words change.
 *
 * Tricky logic:
 * - The single-line width is measured on a hidden clone (see naturalOneLineWidth), never on
 *   the heading itself, and the heading keeps its normal wrapping afterwards — so a title
 *   that cannot fit even at the floor size wraps instead of being clipped.
 * - The stylesheet size is read *after* clearing the inline font size, otherwise a
 *   previously applied smaller size would be treated as the base and shrink compound.
 * - ResizeObserver fires for height-only changes too, and shrinking the font changes the
 *   height; those callbacks are ignored so the hook can never loop on its own edit.
 * - Measurement also runs once `document.fonts.ready` settles, because the web display
 *   font swaps in asynchronously and the fallback font's metrics would otherwise win.
 * - It fails closed (leaves the stylesheet size alone) whenever measurement is
 *   unavailable, e.g. in tests or on a browser without ResizeObserver.
 */

/** Below this the title is no longer readable as a title, so it is allowed to wrap instead. */
export const ONE_LINE_TITLE_MIN_PX = 17;

/**
 * oneLineFontSize — the pure rule behind useOneLineTitle, exported for tests.
 * naturalWidth = the title's width on one line at baseSize, availableWidth = the box it
 * has to sit in. Returns baseSize untouched when the line already fits; otherwise the
 * size that makes exactly one line fit, floored at minSize so an impossibly narrow box
 * leaves the title wrapping rather than shrinking it into unreadability.
 */
export function oneLineFontSize({ naturalWidth, availableWidth, baseSize, minSize = ONE_LINE_TITLE_MIN_PX }: {
  naturalWidth: number; availableWidth: number; baseSize: number; minSize?: number;
}): number {
  if (!(naturalWidth > 0) || !(availableWidth > 0) || !(baseSize > 0)) return baseSize;
  if (naturalWidth <= availableWidth) return baseSize;
  // Floor to 0.1px: a rounded-up size would need a hair more room than the box has.
  const scaled = baseSize * (availableWidth / naturalWidth);
  return Math.max(minSize, Math.floor(scaled * 10) / 10);
}

/**
 * naturalOneLineWidth — the width the heading's contents need on a single line.
 *
 * Measured on a hidden clone inside the heading, never on the heading itself: `scrollWidth`
 * on a non-scrollable, overflow:visible element only reports overflowing *descendant boxes*,
 * so a long run of inline text that simply overflows the line box is missed and the title
 * would be left too big. The clone sits inside the heading so it inherits the exact same
 * font and the same rules for its inline source-info icon, is absolutely positioned so it
 * cannot disturb the page, and is removed in the same synchronous pass it was made.
 * Returns 0 when the browser gives no measurement, which makes the caller fail closed.
 */
function naturalOneLineWidth(el: HTMLElement): number {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-hidden', 'true');
  clone.style.position = 'absolute';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.visibility = 'hidden';
  clone.style.pointerEvents = 'none';
  clone.style.whiteSpace = 'nowrap';
  clone.style.width = 'max-content';
  clone.style.maxWidth = 'none';
  el.appendChild(clone);
  const width = clone.getBoundingClientRect().width;
  clone.remove();
  return width;
}

/**
 * fitOneLineTitle — measures one heading and applies the size that keeps it on one line.
 * Returns the size now applied (the stylesheet size when nothing had to change). Runs
 * before paint from useOneLineTitle, so the oversized line is never shown.
 */
/**
 * fitOneLineTitle — measures one heading and applies the size that keeps it on one line.
 * Returns the size now applied (the stylesheet size when nothing had to change). Runs
 * before paint from useOneLineTitle, so the oversized line is never shown.
 *
 * The size is found by iterating, not by one ratio: the heading's inline source-info icon
 * keeps a fixed size and margin whatever the font size is, so scaling the font shrinks only
 * the text part of the line. One pass therefore overshoots (measured: 28px needs 390px, a
 * single ratio says 20.1px, and at 20.1px the line still needs 286px in a 280px box). Each
 * pass re-measures the line at the size just applied and shrinks again until it fits or the
 * floor is reached, so the fixed parts are accounted for exactly.
 */
export function fitOneLineTitle(el: HTMLElement, minSize = ONE_LINE_TITLE_MIN_PX): number {
  // Drop the previous answer first so the stylesheet size is what gets read as the base.
  el.style.fontSize = '';
  const baseSize = parseFloat(getComputedStyle(el).fontSize) || 0;
  let size = baseSize;
  if (!(size > 0)) return size;
  for (let pass = 0; pass < 4; pass++) {
    const next = oneLineFontSize({ naturalWidth: naturalOneLineWidth(el), availableWidth: el.clientWidth, baseSize: size, minSize });
    if (next === size) break; // fits at this size, or already at the readable floor
    size = next;
    el.style.fontSize = `${size}px`;
  }
  // Nothing had to change: hand the element back to the stylesheet instead of pinning it.
  if (size === baseSize) el.style.fontSize = '';
  return size;
}

// SSR has no layout to measure; useEffect keeps the hook's hook order identical on both sides.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * useOneLineTitle — keeps a heading's text on a single line at every screen size.
 *
 * Inputs: a ref to the heading element and a `key` that changes when the heading's words
 * change. The element's inline font size is owned by this hook; components must not set
 * fontSize on it.
 */
export function useOneLineTitle(ref: RefObject<HTMLElement | null>, key: string) {
  const lastWidth = useRef(0);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const measure = () => { if (!cancelled) fitOneLineTitle(el); };
    lastWidth.current = el.clientWidth;
    measure();
    // The display font arrives after first paint, and a web font can start loading *after*
    // document.fonts.ready has already resolved, so re-measure on both signals: ready covers
    // fonts already in flight, loadingdone covers every font that lands later.
    document.fonts?.ready.then(measure);
    const onFontsLoaded = () => measure();
    document.fonts?.addEventListener('loadingdone', onFontsLoaded);
    // Safety net: a web font can land after both signals above have passed (the stylesheet
    // itself may arrive late), and the wider loaded font needs a re-fit. One deferred pass
    // costs nothing visible and guarantees the final size matches the font actually drawn.
    const settle = setTimeout(measure, 250);
    if (typeof ResizeObserver === 'undefined') return () => {
      cancelled = true;
      clearTimeout(settle);
      document.fonts?.removeEventListener('loadingdone', onFontsLoaded);
    };
    const observer = new ResizeObserver(entries => {
      const width = entries[entries.length - 1]?.contentRect.width ?? 0;
      // Only width changes can alter the answer; a height change is our own shrink.
      if (Math.abs(width - lastWidth.current) < 1) return;
      lastWidth.current = width;
      measure();
    });
    observer.observe(el);
    return () => {
      cancelled = true;
      clearTimeout(settle);
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', onFontsLoaded);
    };
  }, [ref, key]);
}
