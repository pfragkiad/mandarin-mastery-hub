import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shared stationary card navigator. Exact neighbouring labels come from the
 * caller's filtered list, never from a separate lookup. Labels remain visible
 * at every width; missing neighbours remain disabled, without a label. */
export function DetailNeighbours({ position, total, neighbourLabel = 'card', previousLabel, nextLabel, labelKind = 'hanzi', onPrevious, onNext }: {
  position: number; total: number; neighbourLabel?: string;
  previousLabel?: string | undefined; nextLabel?: string | undefined;
  labelKind?: 'hanzi' | 'pinyin' | 'text';
  onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined;
}) {
  return <div className="detail-sheet-nav" role="group" aria-label={`Neighbouring ${neighbourLabel}s in this list`}>
    <Button variant="ghost" size="icon" className={previousLabel && onPrevious ? 'detail-neighbour-button' : undefined} aria-label={`Previous ${neighbourLabel} in this list`} title={`Previous ${neighbourLabel}${previousLabel ? `: ${previousLabel}` : ' in this list'}`} disabled={!onPrevious} onClick={onPrevious}>
      <ChevronLeft/>{previousLabel && onPrevious && <span className={`detail-neighbour-label detail-neighbour-${labelKind}`}>{previousLabel}</span>}
    </Button>
    <span className="detail-sheet-position">{(position + 1).toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
    <Button variant="ghost" size="icon" className={nextLabel && onNext ? 'detail-neighbour-button' : undefined} aria-label={`Next ${neighbourLabel} in this list`} title={`Next ${neighbourLabel}${nextLabel ? `: ${nextLabel}` : ' in this list'}`} disabled={!onNext} onClick={onNext}>
      {nextLabel && onNext && <span className={`detail-neighbour-label detail-neighbour-${labelKind}`}>{nextLabel}</span>}<ChevronRight/>
    </Button>
  </div>;
}