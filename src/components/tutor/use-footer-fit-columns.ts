import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { footerItemsWrap } from './use-card-footer-fit';

/**
 * Card grids (Glyphs, Words, Phrases, Start's random cards): fewer cards per row rather than
 * wrapped buttons.
 *
 * Purpose: a card's footer holds Details / Trace / Recall and the bookmark. When the CSS grid
 * packs so many cards into a row that those buttons no longer share one line, this hook drops
 * the grid to fewer columns until they do — the stylesheet's own column rule stays the upper
 * limit, and a single column is the floor (there the footer may still wrap or shrink its font,
 * see use-card-footer-fit.ts).
 *
 * Inputs: `ref` — the grid element; `deps` — whatever changes the cards' buttons or text
 * (display size, font, reveal mode); `choices` — optional allowed column counts (Start's six
 * cards use 6/3/2/1 so no row is left with a lone card).
 * State: only an inline `grid-template-columns` on the grid while a cap applies, so measuring
 * never rerenders the cards.
 *
 * Tricky logic: the check is made at the view's own button size — any font step the footer took
 * to avoid wrapping is lifted while measuring and put back afterwards — so shrinking the font
 * never stands in for a wider card. `needed` remembers the widest card width that still wrapped;
 * it only grows while the content stays the same, so the column count can never flip back and
 * forth. Content changes (new page, shuffled card, web font) start the search afresh.
 */
export function useFooterFitColumns(ref: RefObject<HTMLElement | null>, deps: DependencyList, choices?: readonly number[]) {
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    let needed = 0;
    let lastWidth = -1;
    const measure = (force = false) => {
      const width = grid.clientWidth;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      grid.style.gridTemplateColumns = '';
      const natural = resolvedColumnCount(grid);
      if (natural <= 1) return;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      // At most `natural` rounds: every wrap strictly lowers the column count.
      for (let round = 0; round < natural; round += 1) {
        const columns = gridColumnsFor({ natural, width, gap, needed, choices });
        grid.style.gridTemplateColumns = columns < natural ? `repeat(${columns}, minmax(0, 1fr))` : '';
        if (columns <= 1) return;
        const wrapped = widestWrappedCard(grid);
        if (!wrapped) return;
        needed = Math.max(needed, wrapped, cardWidth(width, gap, columns));
      }
    };
    const restart = () => { needed = 0; measure(true); };
    restart();
    let alive = true;
    let frame = 0;
    const schedule = () => { if (!alive) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(restart); };
    void document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    // Cards arriving or changing (paging, a shuffled Start card, lazily loaded text) change what
    // the buttons need, so the search starts again on the next frame, still before paint.
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
    mutations?.observe(grid, { childList: true, subtree: true, characterData: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    resize?.observe(grid);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      document.fonts?.removeEventListener('loadingdone', schedule);
      mutations?.disconnect();
      resize?.disconnect();
      grid.style.gridTemplateColumns = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Width of one card when `columns` cards share a row of `width` with `gap` between them. */
export function cardWidth(width: number, gap: number, columns: number): number {
  return (width - (columns - 1) * gap) / columns;
}

/**
 * The most columns (never more than the stylesheet's `natural` count, never fewer than one)
 * whose cards are wider than `needed`, the widest card width known to wrap its buttons.
 * With `choices`, only those counts are used.
 */
export function gridColumnsFor({ natural, width, gap, needed, choices }: { natural: number; width: number; gap: number; needed: number; choices?: readonly number[] | undefined }): number {
  const allowed = (choices?.length ? [...choices] : Array.from({ length: natural }, (_, i) => i + 1))
    .filter(count => count >= 1 && count <= natural)
    .sort((a, b) => b - a);
  return allowed.find(count => cardWidth(width, gap, count) > needed) ?? 1;
}

/** Columns the stylesheet resolved (empty auto-fit tracks collapse to 0px and are not counted). */
function resolvedColumnCount(grid: HTMLElement): number {
  const tracks = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(track => parseFloat(track) > 0);
  return tracks.length;
}

/**
 * Width of the widest card whose footer buttons wrap at the view's own size, or 0 when none
 * does. Each footer's font step is lifted for the check and restored straight after.
 */
function widestWrappedCard(grid: HTMLElement): number {
  let widest = 0;
  for (const footer of grid.querySelectorAll<HTMLElement>('.word-card-bottom')) {
    const card = footer.closest<HTMLElement>('.word-card');
    if (!card) continue;
    const step = card.dataset['cardFootStep'];
    if (step) delete card.dataset['cardFootStep'];
    if (footerItemsWrap(footer)) widest = Math.max(widest, card.getBoundingClientRect().width);
    if (step) card.dataset['cardFootStep'] = step;
  }
  return widest;
}
