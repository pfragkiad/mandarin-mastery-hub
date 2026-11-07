import { useEffect, useRef, useState, type Ref, type RefObject } from 'react';
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
export function CatalogPagination({ range, total, current, pages, onPageChange, top = false, innerRef, perPage, onPerPageChange, onRankChange, ranks, currentRank, onUnrankedChange, filterKey }: {
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
  onRankChange?: ((rank: number) => number | { rank: number; page: number } | void) | undefined;
  ranks?: { count: number; min: number; max: number } | undefined;
  /** First recorded rank in the current page, never a result index or inferred rank. */
  currentRank?: number | undefined;
  /** Jumps to the page containing the first exact unranked record in the applied pool. */
  onUnrankedChange?: (() => void) | undefined;
  /** Applied filter identity, independent of page and result count. */
  filterKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'page' | 'rank'>('page');
  const [jump, setJump] = useState('');
  const [nearestRank, setNearestRank] = useState<number>();
  const [jumpNotice, setJumpNotice] = useState('');
  const [feedbackPage, setFeedbackPage] = useState(current);
  const previousPage = useRef(current);
  useEffect(() => {
    setNearestRank(undefined);
    setJumpNotice('');
  }, [filterKey]);
  // Bind feedback to its destination, not the page from which Go was submitted.
  // Any subsequent page change (including history/keyboard/bottom row) clears it.
  useEffect(() => {
    const changed = previousPage.current !== current;
    previousPage.current = current;
    if (!changed || current === feedbackPage) return;
    setNearestRank(undefined);
    setJumpNotice('');
  }, [current, feedbackPage]);
  const rankAvailable = Boolean(onRankChange && ranks?.count);
  const min = mode === 'rank' && ranks ? ranks.min : 1;
  const max = mode === 'rank' && ranks ? ranks.max : pages;
  const target = Number(jump);
  const valid = jump !== '' && Number.isSafeInteger(target) && (mode === 'rank' ? rankAvailable : target >= min && target <= max);
  const boundedTarget = Math.max(min, Math.min(max, target));
  // Read the display preference only on interaction, never during SSR. Both rows
  // share this preference; unavailable Rank tabs fall back without overwriting it.
  const chooseMode = (next: 'page' | 'rank', remember = true) => {
    setMode(next);
    setJump(next === 'page' ? String(current) : currentRank === undefined ? '' : String(currentRank));
    if (remember) { try { localStorage.setItem('mandarin-jump-mode', next); } catch { /* Preference storage may be unavailable. */ } }
  };
  return <div ref={innerRef} className={`catalog-pagination${top ? ' catalog-pagination-top' : ''}`}>
    <div className="catalog-pagination-left">
    {pages > 1 && <div className="catalog-pagination-navigation">
      {pages >= 7 && <Button variant="ghost" size="icon" aria-label="First page" title="First page" disabled={current <= 1} onClick={() => onPageChange(1)}><ChevronsLeft/></Button>}
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
      {pages >= 7 ? <span aria-label={`Current page ${current} of ${pages}`} aria-current="page" className="min-w-20 whitespace-nowrap text-center tabular-nums">Page {current.toLocaleString('en-US')} of {pages.toLocaleString('en-US')}</span> : Array.from({ length: pages }, (_, index) => index + 1).map(page => <Button key={page} variant={current === page ? 'secondary' : 'ghost'} size="sm" aria-label={`Go to page ${page}`} aria-pressed={current === page} onClick={() => onPageChange(page)}>{page}</Button>)}
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
      {pages >= 7 && <><Button variant="ghost" size="icon" aria-label="Last page" title="Last page" disabled={current >= pages} onClick={() => onPageChange(pages)}><ChevronsRight/></Button>
      <Button variant="ghost" size="sm" className="catalog-jump-trigger" aria-label="Go to" title="Go to page or rank" disabled={!total} onClick={() => { setNearestRank(undefined); setJumpNotice(''); let saved: string | null = null; try { saved = localStorage.getItem('mandarin-jump-mode'); } catch { /* Use the default when storage is unavailable. */ } chooseMode(rankAvailable && saved !== 'page' ? 'rank' : 'page', false); setOpen(true); }}><Crosshair aria-hidden="true"/><span className="catalog-jump-label">Go to</span></Button>
      </>}
    </div>}
      <span className="catalog-page-range">{range} of {total.toLocaleString('en-US')}</span>
      {nearestRank !== undefined && <span role="status" className="text-primary whitespace-nowrap">Nearest: #{nearestRank.toLocaleString('en-US')}</span>}
      {jumpNotice && <span role="status" className="text-primary">{jumpNotice}</span>}
    </div>
    <div className="catalog-pagination-summary">
      {perPage && onPerPageChange && <div className="library-per-page" role="group" aria-label="Records per page"><span className="library-per-page-label">Per page</span>{([10, 20, 50] as const).map(value => <Button key={value} variant="ghost" size="sm" aria-label={`${value} per page`} aria-pressed={perPage === value} onClick={() => onPerPageChange(value)}>{value}</Button>)}</div>}
      {pages >= 7 && <NavigationShortcuts context="pages"/>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="catalog-jump-dialog"><DialogTitle>Go to</DialogTitle>
      <div className="catalog-jump-modes" role="group" aria-label="Jump by"><Button type="button" variant={mode === 'page' ? 'secondary' : 'ghost'} aria-pressed={mode === 'page'} onClick={() => chooseMode('page')}>Page</Button>{onRankChange && <Button type="button" variant={mode === 'rank' ? 'secondary' : 'ghost'} aria-pressed={mode === 'rank'} disabled={!rankAvailable} onClick={() => chooseMode('rank')}>Rank</Button>}</div>
      <DialogDescription>{mode === 'page' ? <span>Page {current.toLocaleString('en-US')} of {pages.toLocaleString('en-US')} (1 to {pages.toLocaleString('en-US')})</span> : <><span className="catalog-jump-rank-range">Ranks #{ranks?.min.toLocaleString('en-US')} to #{ranks?.max.toLocaleString('en-US')}</span><span className="block text-muted-foreground">{(ranks?.count ?? 0).toLocaleString('en-US')} ranked · {(total - (ranks?.count ?? 0)).toLocaleString('en-US')} unranked</span></>}</DialogDescription>
      <form noValidate onSubmit={event => { event.preventDefault(); if (!valid) return; if (mode === 'rank') { const result = onRankChange?.(boundedTarget); const resolved = typeof result === 'object' ? result.rank : result; setFeedbackPage(typeof result === 'object' ? result.page : current); setNearestRank(typeof resolved === 'number' && resolved !== target && boundedTarget === target ? resolved : undefined); setJumpNotice(boundedTarget !== target && typeof resolved === 'number' ? `Clamped to #${resolved.toLocaleString('en-US')}` : ''); } else { setNearestRank(undefined); setJumpNotice(''); onPageChange(target); } setOpen(false); }}>
        <label className="catalog-jump-field">{mode === 'rank' ? 'Rank' : 'Page'}<Input key={mode} type="number" inputMode="numeric" min={min} max={max} step={1} aria-label={mode === 'rank' ? 'Jump to rank' : 'Jump to page'} value={jump} onFocus={event => event.currentTarget.select()} onChange={event => setJump(event.target.value)} required/></label>
        {mode === 'rank' && <p className="text-muted-foreground text-sm">Missing ranks jump to the nearest recorded rank.{valid && boundedTarget !== target && <span className="block" role="status">Will clamp to #{boundedTarget.toLocaleString('en-US')}.</span>}</p>}
        <Button type="submit" disabled={!valid}>Go</Button>
        {onUnrankedChange && total - (ranks?.count ?? 0) > 0 && <Button type="button" variant="ghost" className="text-primary" onClick={() => { onUnrankedChange(); setNearestRank(undefined); setJumpNotice('Jumped to first unranked record'); setOpen(false); }}>Jump to unranked</Button>}
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
