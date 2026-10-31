import type { Ref } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** One pagination row, used above and below the catalog grids. */
export function CatalogPagination({ range, current, pages, onPageChange, top = false, innerRef }: {
  range: string;
  current: number;
  pages: number;
  onPageChange: (page: number) => void;
  top?: boolean;
  innerRef?: Ref<HTMLDivElement>;
}) {
  return <div ref={innerRef} className={`catalog-pagination${top ? ' catalog-pagination-top' : ''}`}>
    <span>{range}</span>
    <div>
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}><ChevronLeft/></Button>
      <span>Page {current} / {pages}</span>
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= pages} onClick={() => onPageChange(current + 1)}><ChevronRight/></Button>
    </div>
    <span>{range}</span>
  </div>;
}
