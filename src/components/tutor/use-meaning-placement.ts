import { useLayoutEffect, useState, type RefObject } from 'react';

// Where a detail heading's translation goes relative to its pinyin line.
// Purpose: keep the translation beside the pinyin when it fits; when it doesn't, but it fits on
// one full line, move it whole to the line below rather than breaking it; only a translation
// longer than a full line flows on after the pinyin and wraps underneath.
// Inputs: refs to the pinyin row, its unbreakable reading unit (pinyin + speakers) and the
// translation; `text` re-runs the measurement when the translation changes.
// Tricky: the translation's one-line width is read by briefly forcing it to nowrap
// inline-block inside a layout effect (no paint in between), and a ResizeObserver on the row
// repeats it when the panel width or display size changes.
export type MeaningPlacement = 'inline' | 'below' | 'flow';

/** Pure rule: widths in px; `gap` is the space kept between the reading unit and translation. */
export function meaningPlacement(rowWidth: number, readingWidth: number, meaningWidth: number, gap = 10): MeaningPlacement {
  if (readingWidth + gap + meaningWidth <= rowWidth + 0.5) return 'inline';
  if (meaningWidth <= rowWidth + 0.5) return 'below';
  return 'flow';
}

export function useMeaningPlacement(row: RefObject<HTMLElement | null>, reading: RefObject<HTMLElement | null>, meaning: RefObject<HTMLElement | null>, text: string): MeaningPlacement {
  const [placement, setPlacement] = useState<MeaningPlacement>('inline');
  useLayoutEffect(() => {
    const rowEl = row.current, readingEl = reading.current, meaningEl = meaning.current;
    if (!rowEl || !readingEl || !meaningEl) return;
    const measure = () => {
      const saved = meaningEl.getAttribute('style');
      meaningEl.style.cssText += ';display:inline-block;white-space:nowrap;max-width:none;margin-left:0';
      const meaningWidth = meaningEl.getBoundingClientRect().width;
      if (saved === null) meaningEl.removeAttribute('style'); else meaningEl.setAttribute('style', saved);
      setPlacement(meaningPlacement(rowEl.clientWidth, readingEl.getBoundingClientRect().width, meaningWidth));
    };
    measure();
    // Fails closed to the inline flow (which still wraps) where ResizeObserver is unavailable.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(rowEl);
    void document.fonts?.ready.then(measure);
    return () => observer?.disconnect();
  }, [row, reading, meaning, text]);
  return placement;
}
