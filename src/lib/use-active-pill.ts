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
    // Measured from on-screen boxes after layout (next frame), and again once web
    // fonts finish loading, because the font swap widens the pills.
    let live = true;
    const reveal = () => {
      if (!live || list.scrollWidth <= list.clientWidth) return;
      const row = list.getBoundingClientRect();
      const pill = active.getBoundingClientRect();
      if (pill.left < row.left) list.scrollLeft += pill.left - row.left - 16;
      else if (pill.right > row.right) list.scrollLeft += pill.right - row.right + 16;
    };
    const frame = requestAnimationFrame(reveal);
    void document.fonts?.ready.then(reveal);
    return () => { live = false; cancelAnimationFrame(frame); };
  }, [value]);
  return ref;
}
