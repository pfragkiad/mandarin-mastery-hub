import { useState, type Ref } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LibraryRows } from '@/lib/learning-preferences';

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

/** One pagination row, used above and below the catalog grids. */
export function CatalogPagination({ range, current, pages, onPageChange, top = false, innerRef, rows, onRowsChange }: {
  range: string;
  current: number;
  pages: number;
  onPageChange: (page: number) => void;
  top?: boolean;
  innerRef?: Ref<HTMLDivElement>;
  rows?: LibraryRows;
  onRowsChange?: (rows: LibraryRows) => void;
}) {
  // Draft text for the "Go to" jump box; committed on Enter or blur.
  const [jump, setJump] = useState('');
  const commitJump = () => {
    const target = Number.parseInt(jump, 10);
    if (Number.isFinite(target)) onPageChange(Math.min(pages, Math.max(1, target)));
    setJump('');
  };
  return <div ref={innerRef} className={`catalog-pagination${top ? ' catalog-pagination-top' : ''}`}>
    <div>
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
      <div className="catalog-page-numbers" role="group" aria-label="Pages">
        {pageWindow(current, pages).map((p, i) => p === null
          ? <span key={`gap-${i}`} className="catalog-page-gap" aria-hidden="true">…</span>
          : <Button key={p} variant="ghost" size="sm" aria-label={`Page ${p}`} aria-current={p === current ? 'page' : undefined} className={p === current ? 'is-current' : undefined} onClick={() => onPageChange(p)}>{p}</Button>)}
      </div>
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
      <label className="catalog-page-jump">Go to
        <Input value={jump} inputMode="numeric" aria-label="Go to page" placeholder="…"
          onChange={e => setJump(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') commitJump(); }}
          onBlur={commitJump}/>
      </label>
      {rows && onRowsChange && <div className="library-row-picker" role="group" aria-label="Rows per page"><span>Rows</span>{([3, 5, 10] as const).map(value => <Button key={value} variant="ghost" size="sm" aria-label={`${value} rows`} aria-pressed={rows === value} onClick={() => onRowsChange(value)}>{value}</Button>)}</div>}
    </div>
    <span>{range}</span>
  </div>;
}
