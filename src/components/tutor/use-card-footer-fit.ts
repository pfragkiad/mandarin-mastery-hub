import { useLayoutEffect, type DependencyList, type RefObject } from 'react';

/**
 * Library card footers (Glyphs, Words, Phrases): keep the action buttons on one line.
 *
 * Purpose: the footer row holds Details / Trace / Recall and the bookmark. When the card is too
 * narrow, Recall and the bookmark drop to a second line (their shared wrap group). Before that
 * happens, the footer's own attempt is to set the buttons one pixel smaller at a time
 * (FOOT_FONT_STEPS, never below the 9px / 13px floors) and keep the first size that puts every
 * action back on one line. If none does, the buttons keep the view's size and the row wraps —
 * a smaller font is only kept when it actually avoided the wrap.
 *
 * This is deliberately independent of the card's top row: shrinking the header text never shrinks
 * these buttons (use-card-top-row-fit.ts owns the header), and shrinking the buttons never
 * touches the header. Each row is measured and stepped on its own.
 *
 * Inputs: `ref` — the card's `.word-card-bottom` row; `deps` — whatever changes its content or
 * width (record, which actions the card shows, view, hidden card faces).
 * State: only `data-card-foot-step` on the card, which styles.css maps to --card-foot-size, so
 * measuring never rerenders the results grid.
 *
 * Tricky logic: the check looks at the real action controls (links and buttons), because Compact
 * puts the bookmark outside the button group while Comfortable nests Recall and the bookmark in a
 * shared non-wrapping tail — in both cases a control that dropped a line is the wrap. The resize
 * observer re-measures only when the row's *width* changes: a smaller button font changes the
 * row's *height*, which would otherwise re-trigger the observer forever.
 */
export function useCardFooterFit(ref: RefObject<HTMLElement | null>, deps: DependencyList) {
  useLayoutEffect(() => {
    const footer = ref.current;
    if (!footer) return;
    const card = footer.closest('.word-card') as HTMLElement | null;
    if (!card) return;
    let lastWidth = -1;
    const measure = (force = false) => {
      const width = footer.clientWidth;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      const step = footerFontPlan(candidate => {
        applyFooterStep(card, candidate);
        return !footerItemsWrap(footer);
      });
      applyFooterStep(card, step);
    };
    measure(true);
    let alive = true;
    const remeasure = () => { if (alive) measure(true); };
    void document.fonts?.ready.then(remeasure);
    // The handwritten web font can arrive after fonts.ready; the labels it draws are narrower or
    // wider, so the row has to be judged again.
    document.fonts?.addEventListener('loadingdone', remeasure);
    if (typeof ResizeObserver === 'undefined') return () => { alive = false; document.fonts?.removeEventListener('loadingdone', remeasure); };
    const observer = new ResizeObserver(() => measure());
    observer.observe(footer);
    return () => { alive = false; document.fonts?.removeEventListener('loadingdone', remeasure); observer.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** One footer size below the view's own, then two: the floors are 9px (Compact) / 13px (Comfortable). */
export const FOOT_FONT_STEPS = [1, 2] as const;

/**
 * The view's own button size first, then one pixel smaller at a time; 0 (the view's own size)
 * when the row wraps anyway, so the buttons are never left smaller for nothing.
 */
export function footerFontPlan(fits: (step: number) => boolean): number {
  return [0, ...FOOT_FONT_STEPS].find(step => fits(step)) ?? 0;
}

/** Write one button font step to the card (0 hands the buttons back to the view's own size). */
function applyFooterStep(card: HTMLElement, step: number) {
  if (step) card.dataset['cardFootStep'] = String(step); else delete card.dataset['cardFootStep'];
}

/**
 * True when the footer's action controls no longer share one line: the row centres them, so a
 * wrapped control sits a whole line lower. Controls with no box (a hidden action) are ignored,
 * and a row with a single visible control never wraps.
 */
export function footerItemsWrap(footer: HTMLElement): boolean {
  const centres = [...footer.querySelectorAll<HTMLElement>('a, button')]
    .map(control => control.getBoundingClientRect())
    .filter(rect => rect.height > 0)
    .map(rect => rect.top + rect.height / 2);
  if (centres.length < 2) return false;
  return Math.max(...centres) - Math.min(...centres) > 2;
}
