import type { Ref } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LibraryRows } from '@/lib/learning-preferences';

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
  return <div ref={innerRef} className={`catalog-pagination${top ? ' catalog-pagination-top' : ''}`}>
    <div>
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
      <span>Page {current} / {pages}</span>
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
      {rows && onRowsChange && <div className="library-row-picker" role="group" aria-label="Rows per page"><span>Rows</span>{([3, 5, 10] as const).map(value => <Button key={value} variant="ghost" size="sm" aria-label={`${value} rows`} aria-pressed={rows === value} onClick={() => onRowsChange(value)}>{value}</Button>)}</div>}
    </div>
    <span>{range}</span>
  </div>;
}
