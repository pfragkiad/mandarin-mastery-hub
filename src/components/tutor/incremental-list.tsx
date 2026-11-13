import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * IncrementalList — renders a long result list in chunks as it scrolls into view.
 *
 * Inputs: `items` (already ordered), `renderItem`, a `resetKey` that restarts
 * from the first chunk (e.g. the applied search), and an optional `chunk` size.
 * State: how many items are mounted. A sentinel after the last mounted item
 * uses an IntersectionObserver (rooted at the nearest scrolling list) to mount
 * the next chunk, so "Show all results" for a 10,000-match search opens
 * instantly instead of freezing the page while every row mounts at once.
 * Ordering and matching never change — only how many rows are in the page.
 * Without IntersectionObserver (tests, old browsers) everything is mounted.
 */
export function IncrementalList<T>({ items, renderItem, resetKey, chunk = 80 }: { items: readonly T[]; renderItem: (item: T) => ReactNode; resetKey: unknown; chunk?: number }) {
  const [count, setCount] = useState(chunk);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => { setCount(chunk); }, [resetKey, chunk]);
  const more = count < items.length;
  useEffect(() => {
    const node = sentinel.current;
    if (!more || !node) return;
    if (typeof IntersectionObserver === 'undefined') { setCount(items.length); return; }
    // Root at the scrolling results box so rows load before the user reaches the end.
    const root = node.parentElement?.closest('.global-search-results') ?? null;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setCount(value => value + chunk);
    }, { root, rootMargin: '400px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, count, items.length, chunk]);
  return <>
    {items.slice(0, count).map(renderItem)}
    {more && <div ref={sentinel} aria-hidden className="incremental-list-sentinel"/>}
  </>;
}
