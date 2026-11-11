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
    // Measured from on-screen boxes, and again whenever any pill changes size (the
    // saved font/display size applies after hydration and widens the pills, which
    // shifts the current one); a learner's own sideways scroll resizes nothing, so
    // it is left alone.
    let live = true;
    const reveal = () => {
      if (!live || list.scrollWidth <= list.clientWidth) return;
      const row = list.getBoundingClientRect();
      const pill = active.getBoundingClientRect();
      if (pill.left < row.left) list.scrollLeft += pill.left - row.left - 16;
      else if (pill.right > row.right) list.scrollLeft += pill.right - row.right + 16;
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reveal);
    list.querySelectorAll("[role='tab']").forEach(tab => observer?.observe(tab));
    const frame = requestAnimationFrame(reveal);
    return () => { live = false; cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [value]);
  return ref;
}
