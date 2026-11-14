import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Keeps a remounting page from briefly collapsing and scrolling the window.
 *
 * Purpose: Practice remounts its whole page when the learner picks another form (the route keys
 * StrokesPage by character). For a moment the new page lacks parts that wait on stroke data
 * (the Strokes tab row, an open drawer), so the document gets shorter; a reader scrolled near the
 * bottom is clamped upward and then sent back once the data lands, a visible flicker.
 *
 * Inputs: `holdKey` — changes exactly when the child remounts (the practised character).
 * State: the last settled height and scroll position, kept in refs (no rerenders).
 * Logic: when `holdKey` changes, the outer box is pinned (min-height) to the previous height
 * before the browser lays out the new page, so no clamp happens. The pin is released as soon as
 * the new content is at least that tall, or after RELEASE_MS for a page that is legitimately
 * shorter (or whose data failed to load), so a short page never keeps empty space.
 */
const RELEASE_MS = 1500;
export function HeldHeight({ holdKey, children }: { holdKey: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const settled = useRef(0);
  const scroll = useRef(0);
  const shownKey = useRef(holdKey);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const release = () => { clearTimeout(timer.current); if (outer.current) outer.current.style.minHeight = ''; };

  useEffect(() => {
    const box = outer.current, content = inner.current;
    if (!box || !content) return;
    const onScroll = () => { if (!box.style.minHeight) scroll.current = window.scrollY; };
    const measure = () => {
      if (!box.style.minHeight) { settled.current = content.offsetHeight; return; }
      if (content.offsetHeight >= settled.current - 1) { release(); settled.current = content.offsetHeight; }
    };
    onScroll(); measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(content);
    return () => { window.removeEventListener('scroll', onScroll); observer?.disconnect(); release(); };
  }, []);

  useLayoutEffect(() => {
    if (shownKey.current === holdKey) return;
    shownKey.current = holdKey;
    const box = outer.current;
    if (!box || !settled.current) return;
    box.style.minHeight = `${settled.current}px`;
    if (Math.abs(window.scrollY - scroll.current) > 1) window.scrollTo({ top: scroll.current, behavior: 'instant' });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { release(); if (inner.current) settled.current = inner.current.offsetHeight; }, RELEASE_MS);
  }, [holdKey]);

  return <div ref={outer}><div ref={inner}>{children}</div></div>;
}
