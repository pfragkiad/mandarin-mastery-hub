import { useLayoutEffect, type DependencyList, type RefObject } from 'react';

/**
 * Side-by-side vocabulary card bodies (Compact Words/Phrases, Comfortable Phrases).
 *
 * Purpose: CSS lays the card body out with the hanzi box on the left and the pinyin+audio
 * line over the translation on its right, which saves two text lines. That only works when
 * both fit there uncut, so this hook measures the side layout and, when it doesn't fit,
 * marks the body `data-stacked` and CSS falls back to pinyin / box / translation stacked.
 *
 * Inputs: `ref` — the card's `.word-open` body; `enabled` — false where the layout is fixed
 * (Comfortable Words are always side by side); `deps` — whatever changes the text or box size
 * (record, visible lines, font style, view).
 * State: only the DOM attribute, set directly (re-measured on every resize and after web
 * fonts settle), so measuring never rerenders the results grid.
 *
 * Fit means: the box isn't squeezed, the pinyin stays on one line with its speaker beside
 * it, and the translation needs at most two lines (so the text column is no taller than
 * the box). The check always starts from the side layout, so the result is stable.
 */
export function useSideFit(ref: RefObject<HTMLElement | null>, enabled: boolean, deps: DependencyList) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) { delete el.dataset['stacked']; return; }
    const measure = () => {
      delete el.dataset['stacked'];
      if (!sideLayoutFits(el)) el.dataset['stacked'] = '';
    };
    measure();
    let alive = true;
    void document.fonts?.ready.then(() => { if (alive) measure(); });
    if (typeof ResizeObserver === 'undefined') return () => { alive = false; };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => { alive = false; observer.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}

/** True when the body (already in its side layout) shows the box, pinyin and translation uncut. */
function sideLayoutFits(open: HTMLElement): boolean {
  // Only judge when the side layout actually applies (CSS grid); otherwise leave it alone.
  if (getComputedStyle(open).display !== 'grid') return true;
  const tile = open.querySelector<HTMLElement>('.word-hanzi-tile');
  if (tile && tile.scrollWidth > tile.clientWidth + 1) return false;
  const text = open.querySelector<HTMLElement>('.pinyin-text');
  if (text) {
    if (lineCount(text) > 1) return false;
    // The speaker wrapped under the reading.
    const speaker = open.querySelector<HTMLElement>('.pinyin .tile-speaker');
    if (speaker && speaker.getBoundingClientRect().top >= text.getBoundingClientRect().bottom - 1) return false;
  }
  const meaning = open.querySelector<HTMLElement>('.word-meaning');
  if (meaning && (meaning.scrollHeight > meaning.clientHeight + 1 || lineCount(meaning) > 2)) return false;
  return true;
}

/** Rendered line count of an element's inline content (clusters line-box tops). */
function lineCount(el: HTMLElement): number {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => rect.top).sort((a, b) => a - b);
    if (!tops.length) return 1;
    // Rects on one line differ by a few px (nested spans); a new line starts ≥ ~1 line height lower.
    const step = (parseFloat(getComputedStyle(el).fontSize) || 12) * 0.6;
    let lines = 0;
    let last = -Infinity;
    for (const top of tops) if (top - last > step) { lines += 1; last = top; }
    return lines;
  } catch {
    return 1; // measurement unavailable (tests): keep the side layout
  }
}
