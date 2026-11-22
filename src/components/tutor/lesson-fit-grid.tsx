import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cardWidth, gridColumnsFor } from './use-footer-fit-columns';

/**
 * Lesson word/expression card grid: fewer cards per row rather than pinyin running out of a card.
 *
 * Purpose: a card's reading line (pinyin + speaker, `.lesson-term-reading`) stays on one line.
 * When the stylesheet packs so many cards into a row that the longest reading no longer fits a
 * card, the grid drops to fewer columns until it does. The stylesheet's own column count stays
 * the upper limit and one column is the floor; only there, when even a full-width card is too
 * narrow, the reading may wrap (`data-reading-wraps`), so nothing ever overflows the border.
 *
 * Inputs: `className` (the existing grid classes) and the cards as children.
 * State: only an inline `grid-template-columns` and a data attribute on the grid, so measuring
 * never rerenders the cards. Re-measured on resize, content changes and web-font loads.
 */
export function LessonFitGrid({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const measure = () => {
      grid.style.gridTemplateColumns = '';
      delete grid.dataset['readingWraps'];
      const tracks = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(t => parseFloat(t) > 0).length;
      const width = grid.clientWidth;
      // A collapsed lesson section has no width; the ResizeObserver measures again when it opens.
      if (!width) return;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      // Card width each reading needs: its one-line width plus the card's padding and border.
      let needed = 0;
      for (const reading of grid.querySelectorAll<HTMLElement>('.lesson-term-reading')) {
        const card = reading.closest<HTMLElement>('.lesson-card');
        if (!card) continue;
        const cs = getComputedStyle(card);
        const chrome = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
        // Tile-layout cards put the reading beside the hanzi box, so the box and gap count too.
        const term = reading.closest<HTMLElement>('.lesson-term.is-tile');
        const box = term?.querySelector<HTMLElement>('.lesson-word-tile');
        const beside = term && box ? box.offsetWidth + (parseFloat(getComputedStyle(term).columnGap) || 0) : 0;
        needed = Math.max(needed, reading.scrollWidth + chrome + beside);
      }
      if (!needed || tracks < 1) return;
      // gridColumnsFor keeps cards strictly wider than its `needed`, so ask for a hair less.
      const columns = gridColumnsFor({ natural: tracks, width, gap, needed: needed - 0.5 });
      if (columns < tracks) grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      if (cardWidth(width, gap, columns) < needed - 0.5) grid.dataset['readingWraps'] = '';
    };
    measure();
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    void document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resize?.observe(grid);
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
    mutations?.observe(grid, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      document.fonts?.removeEventListener('loadingdone', schedule);
      resize?.disconnect();
      mutations?.disconnect();
      grid.style.gridTemplateColumns = '';
    };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
