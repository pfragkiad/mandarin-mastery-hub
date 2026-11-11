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
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const left = active.offsetLeft - list.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = Math.max(0, left - 16);
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth + 16;
  }, [value]);
  return ref;
}
