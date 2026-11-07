import { useEffect, useState, type Ref, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { LibraryPerPage } from '@/lib/learning-preferences';
import { NavigationShortcuts } from './navigation-shortcuts';

/**
 * Shared top/bottom row. Only the modal owns jump mode/value drafts; owners
 * supply applied result totals and exact recorded rank bounds, never inferred ranks.
 */
export function CatalogPagination({ range, total, current, pages, onPageChange, top = false, innerRef, perPage, onPerPageChange, onRankChange, ranks, currentRank }: {
  range: string;
  total: number;
  current: number;
  pages: number;
  onPageChange: (page: number) => void;
  top?: boolean;
  innerRef?: Ref<HTMLDivElement>;
  perPage?: LibraryPerPage;
  onPerPageChange?: (perPage: LibraryPerPage) => void;
  /** Resolves a frequency rank to the page holding it; absent on tabs without ranks. */
  onRankChange?: ((rank: number) => number | void) | undefined;
  ranks?: { count: number; min: number; max: number } | undefined;
  /** First recorded rank in the current page, never a result index or inferred rank. */
  currentRank?: number | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'page' | 'rank'>('page');
  const [jump, setJump] = useState('');
  const [nearestRank, setNearestRank] = useState<number>();
  const rankAvailable = Boolean(onRankChange && ranks?.count);
  const min = mode === 'rank' && ranks ? ranks.min : 1;
  const max = mode === 'rank' && ranks ? ranks.max : pages;
  const target = Number(jump);
  const valid = jump !== '' && Number.isSafeInteger(target) && target >= min && target <= max;
  return <div ref={innerRef} className={`catalog-pagination${top ? ' catalog-pagination-top' : ''}`}>
    <div className="catalog-pagination-left">
    {pages > 1 && <div className="catalog-pagination-navigation">
      {pages >= 7 && <Button variant="ghost" size="icon" aria-label="First page" title="First page" disabled={current <= 1} onClick={() => onPageChange(1)}><ChevronsLeft/></Button>}
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
      {pages >= 7 ? <span aria-label={`Current page ${current} of ${pages}`} aria-current="page" className="min-w-20 whitespace-nowrap text-center tabular-nums">Page {current.toLocaleString('en-US')} of {pages.toLocaleString('en-US')}</span> : Array.from({ length: pages }, (_, index) => index + 1).map(page => <Button key={page} variant={current === page ? 'secondary' : 'ghost'} size="sm" aria-label={`Go to page ${page}`} aria-pressed={current === page} onClick={() => onPageChange(page)}>{page}</Button>)}
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
      {pages >= 7 && <><Button variant="ghost" size="icon" aria-label="Last page" title="Last page" disabled={current >= pages} onClick={() => onPageChange(pages)}><ChevronsRight/></Button>
      <Button variant="ghost" size="sm" disabled={!total} onClick={() => { setNearestRank(undefined); setMode('page'); setJump(String(current)); setOpen(true); }}><Crosshair aria-hidden="true"/>Go to</Button>
      </>}
    </div>}
      <span className="catalog-page-range">{range} of {total.toLocaleString('en-US')}</span>
      {nearestRank !== undefined && <span role="status" className="text-primary whitespace-nowrap">Nearest: #{nearestRank.toLocaleString('en-US')}</span>}
    </div>
    <div className="catalog-pagination-summary">
      {perPage && onPerPageChange && <div className="library-per-page" role="group" aria-label="Records per page"><span>Per page</span>{([10, 20, 50] as const).map(value => <Button key={value} variant="ghost" size="sm" aria-label={`${value} per page`} aria-pressed={perPage === value} onClick={() => onPerPageChange(value)}>{value}</Button>)}</div>}
      {pages >= 7 && <NavigationShortcuts context="pages"/>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="catalog-jump-dialog"><DialogTitle>Go to</DialogTitle><DialogDescription><span className="block">Page {current.toLocaleString('en-US')} of {pages.toLocaleString('en-US')} pages</span>{onRankChange && <span className="block">{(ranks?.count ?? 0).toLocaleString('en-US')} ranked, {(total - (ranks?.count ?? 0)).toLocaleString('en-US')} unranked</span>}</DialogDescription>
      <form onSubmit={event => { event.preventDefault(); if (!valid) return; if (mode === 'rank') { const resolved = onRankChange?.(target); setNearestRank(typeof resolved === 'number' && resolved !== target ? resolved : undefined); } else { setNearestRank(undefined); onPageChange(target); } setOpen(false); }}>
        <div className="catalog-jump-modes" role="group" aria-label="Jump by"><Button type="button" variant={mode === 'page' ? 'secondary' : 'ghost'} aria-pressed={mode === 'page'} onClick={() => { setMode('page'); setJump(String(current)); }}>Page</Button>{onRankChange && <Button type="button" variant={mode === 'rank' ? 'secondary' : 'ghost'} aria-pressed={mode === 'rank'} disabled={!rankAvailable} onClick={() => { setMode('rank'); setJump(currentRank === undefined ? '' : String(currentRank)); }}>Rank</Button>}</div>
        <label className="catalog-jump-field">{mode === 'rank' ? 'Rank' : 'Page'}<Input type="number" inputMode="numeric" min={min} max={max} step={1} aria-label={mode === 'rank' ? 'Jump to rank' : 'Jump to page'} value={jump} onChange={event => setJump(event.target.value)} required/></label>
        <Button type="submit" disabled={!valid}>Go</Button>
      </form>
    </DialogContent></Dialog>
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
