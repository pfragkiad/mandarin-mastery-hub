import { useLayoutEffect, useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Shared position-label column for one breakdown tree (root, top, upper-left-enclosure…).
 *
 * Every row starts with its position label, then the tile. A fixed 42px label column lets
 * long labels such as "upper-left-enclosure" wrap with their last word ("enclosure")
 * running into the tile. CSS alone fixes the overlap (each label is at least as wide as
 * its longest word, `min-width: min-content`), but then one long label pushes only its
 * own tile right and siblings stop lining up.
 *
 * So the tree measures every label's natural width (never below the 42px default) and
 * publishes the widest as --decomposition-label-width on the tree's root list. All labels
 * then share that width, and because each nesting level indents by the same amount,
 * tiles at the same depth are all left-aligned — siblings and cousins alike.
 *
 * Tricky logic:
 * - Labels are measured with the variable cleared, otherwise a previous, wider value
 *   would be read back and the column could never shrink (e.g. after a character change).
 * - It re-measures after web fonts settle and whenever the tree's box resizes (display
 *   size changes the label font size); setting the same value again is a no-op, so the
 *   resize observer cannot loop.
 * - Without measurement (tests, SSR) the CSS floor still prevents any overlap.
 */
export const DEFAULT_LABEL_WIDTH = 42;

/** Pure rule: the shared column is the widest natural label, never below the default. */
export function labelColumnWidth(widths: readonly number[], min = DEFAULT_LABEL_WIDTH): number {
  return Math.ceil(Math.max(min, ...widths.filter(width => Number.isFinite(width))));
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useSharedLabelColumn(ref: RefObject<HTMLElement | null>, key: unknown) {
  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const previous = root.style.getPropertyValue('--decomposition-label-width');
      root.style.removeProperty('--decomposition-label-width');
      const labels = Array.from(root.querySelectorAll<HTMLElement>('.decomposition-node > span:first-child'));
      const next = `${labelColumnWidth(labels.map(label => label.getBoundingClientRect().width))}px`;
      root.style.setProperty('--decomposition-label-width', next);
      void previous;
    };
    measure();
    void document.fonts?.ready.then(measure);
    let last = '';
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
      const size = entries.map(entry => `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`).join();
      if (size === last) return;
      last = size;
      measure();
    });
    observer?.observe(root);
    return () => { cancelled = true; observer?.disconnect(); };
  }, [ref, key]);
}
