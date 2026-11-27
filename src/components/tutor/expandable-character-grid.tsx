import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exampleSearchMatches } from '@/lib/example-search';

/** Shared detail-card parent grid. Inputs keep exact rendered records and source order;
 * local expansion reveals all rows; the grid uses the window's available screen-height
 * space and owns example scrolling. Key by the selected
 * record/sound so navigation starts compact; hidden rows cannot receive focus.
 * `defaultExpanded` opens the list immediately (e.g. when a deep-linked word sits past
 * `initialCount`) and scrolls any `.is-selected` card into view inside the grid.
 * `animateSelection` opts exact `data-layout-key` cards into measured layout motion;
 * other example grids keep their existing behaviour. */
export function ExpandableCharacterGrid({ cards, initialCount, totalCount = cards.length, defaultExpanded = false, selectedKey, animateSelection = false, layout = 'grid', label = 'All character examples', searchTexts }: { cards: ReactNode[]; initialCount: number; totalCount?: number; defaultExpanded?: boolean; selectedKey?: string; animateSelection?: boolean; layout?: 'grid' | 'list'; label?: string; searchTexts?: string[] }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Opt-in phrase/idiom search is local to this expanded list, never a library filter.
  const [query, setQuery] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState<number>();
  const id = useId();
  const previousLayout = useRef<{ key: string | undefined; width: number; boxes: Map<string, { x: number; y: number; width: number; height: number }> } | null>(null);
  useLayoutEffect(() => {
    const element = grid.current;
    if (!animateSelection || !element) return;
    const before = previousLayout.current;
    const boxes = new Map<string, { x: number; y: number; width: number; height: number }>();
    const bounds = element.getBoundingClientRect();
    const animations: Animation[] = [];
    const canAnimate = before && before.key !== selectedKey && Math.abs(before.width - bounds.width) < 1
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // FLIP measures the actual grid, not guessed card dimensions. Coordinates stay
    // inside its scroll content so selecting an offscreen word never moves the sheet.
    element.querySelectorAll<HTMLElement>('[data-layout-key]').forEach(card => {
      const key = card.dataset['layoutKey'];
      if (!key) return;
      const rect = card.getBoundingClientRect();
      const next = { x: rect.left - bounds.left + element.scrollLeft, y: rect.top - bounds.top + element.scrollTop, width: rect.width, height: rect.height };
      boxes.set(key, next);
      const old = before?.boxes.get(key);
      if (!canAnimate || !old || !next.width || !next.height || typeof card.animate !== 'function') return;
      const dx = old.x - next.x;
      const dy = old.y - next.y;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(old.width - next.width) + Math.abs(old.height - next.height) < 1) return;
      animations.push(card.animate([
        { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${old.width / next.width}, ${old.height / next.height})` },
        { transformOrigin: 'top left', transform: 'none' },
      ], { duration: 240, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' }));
    });
    previousLayout.current = { key: selectedKey, width: bounds.width, boxes };
    // Replacement picks and teardown cancel native runs, leaving no stale transforms.
    return () => { animations.forEach(animation => animation.cancel()); };
  }, [animateSelection, selectedKey, expanded]);
  const canExpand = cards.length > initialCount;
  const searching = expanded && canExpand && searchTexts !== undefined;
  const shown = expanded ? cards.filter((_, index) => !searching || exampleSearchMatches(searchTexts?.[index] ?? '', query)) : cards.slice(0, initialCount);
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
    {searching && <div className="example-results-toolbar"><div className="search-field"><Search aria-hidden="true"/><input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder="Hanzi, pinyin, English…" value={query} onChange={event => { setQuery(event.target.value); if (grid.current) grid.current.scrollTop = 0; }}/></div></div>}
    <div ref={grid} id={id} style={expanded && availableHeight !== undefined ? { '--character-grid-available-height': `${availableHeight}px` } as CSSProperties : undefined} className={`glyph-usage-parents expandable-character-grid${layout === 'list' ? ' example-list' : ''}${expanded ? ' is-expanded' : ''}`} tabIndex={expanded ? 0 : undefined} role={expanded ? 'region' : undefined} aria-label={expanded ? label : undefined}>
      {shown.length ? shown : <p className="library-note">No matching examples.</p>}
    </div>
    {canExpand && <Button type="button" variant="ghost" size="sm" className={`more-examples-toggle${expanded ? ' is-open' : ''}`} aria-expanded={expanded} aria-controls={id} onClick={() => {
      if (expanded && grid.current) grid.current.scrollTop = 0;
      // Ask a Decomposition/Etymology drawer in this card to collapse for the expansion.
      if (!expanded) grid.current?.dispatchEvent(new Event('character-grid-expand', { bubbles: true }));
      setExpanded(value => !value);
      setQuery('');
    }}>
      <ChevronDown className="more-examples-icon" aria-hidden="true"/>{expanded ? 'Show fewer' : `Show all ${totalCount}`}
    </Button>}
  </>;
}