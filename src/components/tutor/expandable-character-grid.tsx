import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shared detail-card parent grid. Inputs keep exact rendered records and source order;
 * local expansion reveals all rows in a bounded scrolling area. Key by the selected
 * record/sound so navigation starts compact; hidden rows cannot receive focus. */
export function ExpandableCharacterGrid({ cards, initialCount, totalCount = cards.length }: { cards: ReactNode[]; initialCount: number; totalCount?: number }) {
  const [expanded, setExpanded] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState(0);
  const id = useId();
  const canExpand = cards.length > initialCount;
  return <>
    <div ref={grid} id={id} style={expanded ? { '--character-grid-preview-height': `${previewHeight}px` } as CSSProperties : undefined} className={`glyph-usage-parents expandable-character-grid${expanded ? ' is-expanded' : ''}`} tabIndex={expanded ? 0 : undefined} role={expanded ? 'region' : undefined} aria-label={expanded ? 'All character examples' : undefined}>
      {(expanded ? cards : cards.slice(0, initialCount))}
    </div>
    {canExpand && <Button type="button" variant="ghost" size="sm" className={`more-examples-toggle${expanded ? ' is-open' : ''}`} aria-expanded={expanded} aria-controls={id} onClick={() => {
      // Animate from the actual preview height, including wrapped Comfortable cards.
      if (!expanded) setPreviewHeight(grid.current?.clientHeight ?? 0);
      else if (grid.current) grid.current.scrollTop = 0;
      setExpanded(value => !value);
    }}>
      <ChevronDown className="more-examples-icon" aria-hidden="true"/>{expanded ? 'Show fewer' : `Show all ${totalCount}`}
    </Button>}
  </>;
}