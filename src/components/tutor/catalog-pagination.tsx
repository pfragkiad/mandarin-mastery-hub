import { useEffect, useState, type Ref, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LibraryPerPage } from '@/lib/learning-preferences';
import { NavigationShortcuts } from './navigation-shortcuts';

/**
 * Builds the visible page-number sequence for the pagination bar:
 * always the first and last page, a window of two neighbours around the
 * current page, and null markers where ellipses collapse the gaps.
 */
function pageWindow(current: number, pages: number): (number | null)[] {
  const wanted = new Set<number>([1, pages]);
  for (let p = current - 2; p <= current + 2; p++) if (p >= 1 && p <= pages) wanted.add(p);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * One pagination row, used above and below the catalog grids. The jump field
 * is labelled by what it accepts ("Page", and "Rank" on tabs that carry
 * frequency ranks); the per-page picker shows plain record counts.
 */
export function CatalogPagination({ range, current, pages, onPageChange, top = false, innerRef, perPage, onPerPageChange, onRankChange }: {
  range: string;
  current: number;
  pages: number;
  onPageChange: (page: number) => void;
  top?: boolean;
  innerRef?: Ref<HTMLDivElement>;
  perPage?: LibraryPerPage;
  onPerPageChange?: (perPage: LibraryPerPage) => void;
  /** Resolves a frequency rank to the page holding it; absent on tabs without ranks. */
  onRankChange?: (rank: number) => void;
}) {
  // Draft text for the direct-jump boxes; committed on Enter or blur.
  const [jump, setJump] = useState('');
  const [rankJump, setRankJump] = useState('');
  const commitJump = () => {
    const target = Number.parseInt(jump, 10);
    if (Number.isFinite(target)) onPageChange(Math.min(pages, Math.max(1, target)));
    setJump('');
  };
  const commitRank = () => {
    const target = Number.parseInt(rankJump, 10);
    if (Number.isFinite(target)) onRankChange?.(target);
    setRankJump('');
  };
  return <div ref={innerRef} className={`catalog-pagination${top ? ' catalog-pagination-top' : ''}`}>
    <div className="catalog-pagination-navigation">
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
      <div className="catalog-page-numbers" role="group" aria-label="Pages">
        {pageWindow(current, pages).map((p, i) => p === null
          ? <span key={`gap-${i}`} className="catalog-page-gap" aria-hidden="true">…</span>
          : <Button key={p} variant="ghost" size="sm" aria-label={`Page ${p}`} aria-current={p === current ? 'page' : undefined} className={p === current ? 'is-current' : undefined} onClick={() => onPageChange(p)}>{p}</Button>)}
      </div>
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
      <NavigationShortcuts context="pages"/>
      <label className="catalog-page-jump">Page
        <Input value={jump} inputMode="numeric" aria-label="Jump to page" placeholder="#"
          onChange={e => setJump(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') commitJump(); }}
          onBlur={commitJump}/>
      </label>
      {onRankChange && <label className="catalog-page-jump">Rank
        <Input value={rankJump} inputMode="numeric" aria-label="Jump to rank" placeholder="#"
          onChange={e => setRankJump(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') commitRank(); }}
          onBlur={commitRank}/>
      </label>}
    </div>
    {/* Range first, then the count picker after a dot separator. */}
    <div className="catalog-pagination-summary">
      <span className="catalog-page-range">{range}</span>
      {perPage && onPerPageChange && <><span aria-hidden="true" className="catalog-page-range">·</span><div className="library-per-page" role="group" aria-label="Records per page"><span>Per page</span>{([10, 20, 50] as const).map(value => <Button key={value} variant="ghost" size="sm" aria-label={`${value} per page`} aria-pressed={perPage === value} onClick={() => onPerPageChange(value)}>{value}</Button>)}</div></>}
    </div>
  </div>;
}

/**
 * Slim paging strip pinned to the top of the results column. It appears only
 * after the static top pagination bar has scrolled out of view (observed via
 * IntersectionObserver), so the default 10-per-page view rarely shows it and
 * it earns its place at 20/50 per page. It shares the static bar's page state
 * and handlers, so keyboard shortcuts, first/last-page disabling and the
 * scroll-to-top-on-paging effect all keep working unchanged. Render it with a
 * per-tab `key` so the observer re-attaches when the tab swaps the top bar.
 */
export function StickyPagination({ label, current, pages, onPageChange, watchRef }: {
  /** Position label, e.g. "Ranks 151–170 of 9,933" on ranked tabs, else "Page 7 / 382". */
  label: string;
  current: number;
  pages: number;
  onPageChange: (page: number) => void;
  /** Ref to the static top pagination bar whose disappearance reveals the strip. */
  watchRef: RefObject<HTMLDivElement | null>;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = watchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      // Show only when the bar has passed above the viewport top, never when
      // it is still below the fold (initial render on a long page).
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [watchRef]);
  if (!visible) return null;
  return <div className="sticky-pagination" role="navigation" aria-label="Page navigation">
    <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
    <span>{label}</span>
    <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
  </div>;
}
