import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Phone page-pill rows (.page-pills) scroll sideways with the scrollbar hidden,
 * so pills past the right edge are invisible and learners can't tell more exist.
 * PillRow wraps the TabsList and adds edge arrows: each renders only while the
 * row can actually scroll that way, and clicking scrolls one viewport of pills.
 *
 * Inputs: the TabsList as children and a short `label` naming what the pills
 * switch (used in the arrows' aria-labels). State: two booleans tracking
 * scrollability in each direction, refreshed on scroll and on resize (pills
 * widen when the saved font/display size applies after hydration). CSS shows
 * the arrows only at phone widths, where the pills actually scroll; on wide
 * layouts the row never overflows, so both booleans stay false anyway.
 */
export function PillRow({ children, label }: { children: ReactNode; label: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const list = rowRef.current?.querySelector<HTMLElement>("[role='tablist']");
    if (!list) return;
    const update = () => {
      setCanLeft(list.scrollLeft > 1);
      setCanRight(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
    };
    update();
    list.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(list);
    return () => { list.removeEventListener('scroll', update); observer?.disconnect(); };
  }, []);

  const scrollByViewport = (direction: 1 | -1) => {
    const list = rowRef.current?.querySelector<HTMLElement>("[role='tablist']");
    list?.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: 'smooth' });
  };

  return <div className="pill-row" ref={rowRef}>
    {children}
    {canLeft && <button type="button" className="pill-row-arrow pill-row-prev" aria-label={`Earlier ${label}`} onClick={() => scrollByViewport(-1)}><ChevronLeft /></button>}
    {canRight && <button type="button" className="pill-row-arrow pill-row-next" aria-label={`More ${label}`} onClick={() => scrollByViewport(1)}><ChevronRight /></button>}
  </div>;
}
