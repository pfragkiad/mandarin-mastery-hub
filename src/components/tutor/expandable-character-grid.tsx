import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shared detail-card parent grid. Inputs keep exact rendered records and source order;
 * local expansion reveals all rows; the grid uses the window's available screen-height
 * space and owns example scrolling. Key by the selected
 * record/sound so navigation starts compact; hidden rows cannot receive focus.
 * `defaultExpanded` opens the list immediately (e.g. when a deep-linked word sits past
 * `initialCount`) and scrolls any `.is-selected` card into view inside the grid. */
export function ExpandableCharacterGrid({ cards, initialCount, totalCount = cards.length, defaultExpanded = false, selectedKey }: { cards: ReactNode[]; initialCount: number; totalCount?: number; defaultExpanded?: boolean; selectedKey?: string }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const grid = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState<number>();
  const id = useId();
  const canExpand = cards.length > initialCount;
  useEffect(() => {
    if (defaultExpanded && canExpand) setExpanded(true);
  }, [defaultExpanded, canExpand]);
  useEffect(() => {
    const element = grid.current;
    if (!expanded || !element) return;
    const body = element.closest<HTMLElement>('.detail-sheet-body');
    const sheet = element.closest<HTMLElement>('.detail-sheet');
    const measure = () => {
      const rect = element.getBoundingClientRect();
      let height = window.innerHeight - rect.top - 24;
      if (body && sheet) {
        // Use the window's maximum height, not its current height: expanding the
        // grid may grow the card. Reserve all content before/after the grid,
        // including Show fewer, without making those controls part of its scroll.
        const bodyRect = body.getBoundingClientRect();
        const before = rect.top - bodyRect.top + body.scrollTop;
        const after = body.scrollHeight - before - element.offsetHeight;
        const sheetLimit = Number.parseFloat(getComputedStyle(sheet).maxHeight);
        height = sheetLimit - (bodyRect.top - sheet.getBoundingClientRect().top) - before - after - 2;
      } else {
        height -= element.nextElementSibling?.getBoundingClientRect().height ?? 0;
      }
      if (Number.isFinite(height)) setAvailableHeight(Math.max(120, Math.floor(height)));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(body ?? element.parentElement ?? element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [expanded]);
  useEffect(() => {
    const element = grid.current;
    if (!expanded || !element || !selectedKey) return;
    const selected = element.querySelector<HTMLElement>('.is-selected');
    if (!selected) return;
    // Scroll only inside the grid container so the outer detail sheet stays anchored.
    const top = selected.offsetTop - element.offsetTop;
    const bottom = top + selected.offsetHeight;
    if (top < element.scrollTop || bottom > element.scrollTop + element.clientHeight) {
      element.scrollTop = Math.max(0, top - Math.floor((element.clientHeight - selected.offsetHeight) / 2));
    }
  }, [expanded, availableHeight, selectedKey]);
  return <>
    <div ref={grid} id={id} style={expanded && availableHeight !== undefined ? { '--character-grid-available-height': `${availableHeight}px` } as CSSProperties : undefined} className={`glyph-usage-parents expandable-character-grid${expanded ? ' is-expanded' : ''}`} tabIndex={expanded ? 0 : undefined} role={expanded ? 'region' : undefined} aria-label={expanded ? 'All character examples' : undefined}>
      {(expanded ? cards : cards.slice(0, initialCount))}
    </div>
    {canExpand && <Button type="button" variant="ghost" size="sm" className={`more-examples-toggle${expanded ? ' is-open' : ''}`} aria-expanded={expanded} aria-controls={id} onClick={() => {
      if (expanded && grid.current) grid.current.scrollTop = 0;
      // Ask a Decomposition/Etymology drawer in this card to collapse for the expansion.
      if (!expanded) grid.current?.dispatchEvent(new Event('character-grid-expand', { bubbles: true }));
      setExpanded(value => !value);
    }}>
      <ChevronDown className="more-examples-icon" aria-hidden="true"/>{expanded ? 'Show fewer' : `Show all ${totalCount}`}
    </Button>}
  </>;
}