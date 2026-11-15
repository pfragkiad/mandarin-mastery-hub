import { useLayoutEffect, type DependencyList, type RefObject } from 'react';

/**
 * Library card top rows (Glyphs, Words, Phrases): keep the row on one line with the least change.
 *
 * Purpose: the top row (rank · strokes, then pills) is one line whenever its content fits the
 * card, and wraps to a second line when it does not. Before that happens the row gets two
 * attempts, in this order:
 *   1. the gold Radical pill drops to its abbreviated "Rad. #N" form (only on cards that carry
 *      one — the full "Radical #N" stays everywhere else);
 *   2. the card's chrome font steps down one size at a time (CHROME_STEPS), which shrinks the
 *      top-row text AND the footer Details/Trace/Recall buttons together, since both read
 *      --card-chrome-size (styles.css "Card chrome font steps").
 * If neither attempt fits the row, the last (smallest) chrome stays and the row wraps — wrapping
 * is the final fallback the user chose, and the smaller chrome gives the wrapped lines the best
 * chance of holding their content.
 *
 * Inputs: `ref` — the card's `.word-level-wrap` row; `allowRadicalAbbreviation` — true when the
 * card renders a Radical pill; `deps` — whatever changes the row's content or size (record,
 * visible forms, view, font style, hidden card faces).
 * State: only DOM attributes (`data-radical-short` on the row, `data-card-chrome-step` on the
 * card), set directly and re-measured whenever the row's width changes or web fonts settle, so
 * measuring never rerenders the results grid.
 *
 * Tricky logic: every attempt is measured from the previous DOM state, so the ladder is stable;
 * the resize observer re-measures only when the row's *width* changes, because a smaller chrome
 * changes the row's *height*, which would otherwise re-trigger the observer forever.
 */
export function useCardChromeFit(ref: RefObject<HTMLElement | null>, allowRadicalAbbreviation: boolean, deps: DependencyList) {
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const card = row.closest('.word-card') as HTMLElement | null;
    if (!card) { delete row.dataset['radicalShort']; return; }
    let lastWidth = -1;
    const measure = (force = false) => {
      const width = row.clientWidth;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      const fit = chromeFitPlan(candidate => {
        applyChromeFit(card, row, candidate);
        return !rowItemsWrap(row);
      }, allowRadicalAbbreviation);
      applyChromeFit(card, row, fit);
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
  }, [allowRadicalAbbreviation, ...deps]);
}

/** One chrome size below the view's own, then two: the floors are 9px (Compact) / 13px (Comfortable). */
export const CHROME_STEPS = [1, 2] as const;

/** A row presentation: abbreviated Radical label or not, plus how many chrome font steps down. */
export type ChromeFit = { abbreviate: boolean; step: number };

/**
 * The first row presentation that fits, tried in the user's order: full label at the view's
 * chrome size, then the abbreviated Radical label, then one chrome font step at a time (the
 * abbreviation kept, since it was already accepted). `fits` is called once per candidate, in
 * order, and the last candidate is returned when none fits.
 */
export function chromeFitPlan(fits: (fit: ChromeFit) => boolean, allowRadicalAbbreviation: boolean): ChromeFit {
  const ladder: ChromeFit[] = [{ abbreviate: false, step: 0 }];
  if (allowRadicalAbbreviation) ladder.push({ abbreviate: true, step: 0 });
  for (const step of CHROME_STEPS) ladder.push({ abbreviate: allowRadicalAbbreviation, step });
  return ladder.find(fit => fits(fit)) ?? ladder[ladder.length - 1]!;
}

/** Write one presentation to the DOM: the row's Radical label and the card's chrome font step. */
function applyChromeFit(card: HTMLElement, row: HTMLElement, fit: ChromeFit) {
  if (fit.abbreviate) row.dataset['radicalShort'] = ''; else delete row.dataset['radicalShort'];
  if (fit.step) card.dataset['cardChromeStep'] = String(fit.step); else delete card.dataset['cardChromeStep'];
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
