import { useEffect, useRef } from 'react';

/**
 * Phone page pills (a sideways-scrolling tablist): keeps the current pill
 * visible, e.g. "Strokes" or "Type what you hear" that would start off-screen.
 * Input: the current tab value; returns a ref for the TabsList element. It
 * scrolls only the pill row itself (scrollLeft), never the page, so selecting a
 * section or returning through history never moves the page's own scroll.
 * Wider windows lay the tabs out without overflow, so this is a no-op there.
 */
export function useActivePill<T extends HTMLElement = HTMLDivElement>(value: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const list = ref.current;
    const active = list?.querySelector<HTMLElement>("[role='tab'][data-state='active']");
    if (!list || !active) return;
    // Measured after layout (next frame), from on-screen boxes, so pill fonts and
    // the row's own padding are already applied.
    const frame = requestAnimationFrame(() => {
      if (list.scrollWidth <= list.clientWidth) return;
      const row = list.getBoundingClientRect();
      const pill = active.getBoundingClientRect();
      if (pill.left < row.left) list.scrollLeft += pill.left - row.left - 16;
      else if (pill.right > row.right) list.scrollLeft += pill.right - row.right + 16;
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return ref;
}
