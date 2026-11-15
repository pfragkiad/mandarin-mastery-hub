import { useLayoutEffect, type DependencyList, type RefObject } from 'react';

/**
 * Library card top rows that carry a "Radical #N" pill.
 *
 * Purpose: the top row (rank · strokes, then pills) stays on one line whenever its content fits
 * the card and wraps to a second line when it does not. The gold Radical pill is the widest of
 * those labels, so before letting it drop to a second line the row first tries the abbreviated
 * "Rad. #N": this hook measures the row with the full label and marks it `data-radical-short`
 * only when the full label really would wrap (styles.css "Radical pill abbreviation"). If even
 * the abbreviation does not fit, the row wraps as before — shortening is the last resort, not a
 * way to force one line.
 *
 * Inputs: `ref` — the card's `.word-level-wrap` row; `enabled` — false when the card has no
 * radical pill, so nothing is measured; `deps` — whatever changes the row's content or size
 * (record, visible forms, view, font style, hidden card faces).
 * State: only the DOM attribute, set directly (re-measured whenever the row's width changes and
 * after web fonts settle), so measuring never rerenders the results grid.
 *
 * Tricky logic: the decision is always taken from the full label (the attribute is removed
 * first), so it is stable. The resize observer re-measures only when the row's *width* changes,
 * because shortening the pill changes the row's *height*, which would otherwise re-trigger the
 * observer forever.
 */
export function useRadicalPillLabel(ref: RefObject<HTMLElement | null>, enabled: boolean, deps: DependencyList) {
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    if (!enabled) { delete row.dataset['radicalShort']; return; }
    let lastWidth = -1;
    const measure = (force = false) => {
      const width = row.clientWidth;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      delete row.dataset['radicalShort'];
      if (rowItemsWrap(row)) row.dataset['radicalShort'] = '';
    };
    measure(true);
    let alive = true;
    const remeasure = () => { if (alive) measure(true); };
    void document.fonts?.ready.then(remeasure);
    // A web font that arrives after fonts.ready (the handwritten face) changes the text width,
    // so a row that fit in the fallback font must be re-checked.
    document.fonts?.addEventListener('loadingdone', remeasure);
    if (typeof ResizeObserver === 'undefined') return () => { alive = false; document.fonts?.removeEventListener('loadingdone', remeasure); };
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    return () => { alive = false; document.fonts?.removeEventListener('loadingdone', remeasure); observer.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}

/**
 * True when the row's items no longer share one line. The row centres its items, so on a single
 * line every item has the same vertical centre; a wrapped item sits a whole line lower. Items
 * with no box (a `display:none` label) are ignored, and a row with one visible item never wraps.
 */
export function rowItemsWrap(row: HTMLElement): boolean {
  const centres = [...row.children]
    .map(child => (child as HTMLElement).getBoundingClientRect())
    .filter(rect => rect.height > 0)
    .map(rect => rect.top + rect.height / 2);
  if (centres.length < 2) return false;
  return Math.max(...centres) - Math.min(...centres) > 2;
}
