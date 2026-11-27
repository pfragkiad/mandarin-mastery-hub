import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { historyPosition } from '@/lib/detail-trail';
import { ChevronDown, ChevronUp, GitBranch, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EtymologyRequest } from '@/lib/etymology';
import { carriedEntries, carryTabOnCardSwitch, entryTabs, noteDetailEntry, takeRequestedTab, type DetailTab } from '@/lib/detail-tab-memory';
import { EtymologyInfo, EtymologyPanel, etymologyHasContent, useEtymologyViews } from './etymology-section';
import { WordEtymologyInfo, WordEtymologyPanel } from './word-etymology';

/**
 * Decomposition | Etymology drawer tabs on a glyph detail card, built exactly like Practice's
 * Strokes | Decomposition drawer (same .stroke-guide / .stroke-tab / .stroke-drawer styles):
 * plain text tabs with the open tab's source ⓘ beside it and a collapse chevron at the right.
 * Inputs:
 * - `decomposition`: the recorded breakdown (`info` ⓘ + `body`), or null when there is none.
 * - `etymology`: the exact etymology request, or null when etymology does not apply (strokes);
 *   a list (multi-character word cards) shows one block per character (word-etymology.tsx).
 * - `cardKey`: the card's identity (heading ID, so switching forms on one card keeps the tab).
 * State:
 * - open/collapsed is remembered on this device (owner's choice). A card opens on
 *   Decomposition (or the only tab offered) unless (a) it was reached from an Etymology tile
 *   link (requestDetailTab, consumed once by the next card), or (b) its history entry already
 *   had a tab chosen — so Back/Close to the previous card returns to its Etymology tab and
 *   scrolls the tabs into view. A form switch on the same card carries the tab without
 *   scrolling. Choices live in memory per history entry + card, never saved.
 * - Nothing in a collapsed drawer mounts or downloads. While open, etymology resolves even on
 *   the Decomposition tab, so the Etymology tab can hide itself when the card has no notes
 *   (owner's choice: it may vanish a moment after opening). Unresolved, the tab stays offered.
 * When no tab remains (no breakdown, empty etymology) the whole drawer renders nothing.
 */
const OPEN_KEY = 'tutor-detail-drawer-open';

/** The tab remembered for this history entry's card, taking a pending link request first.
 *  `returned` is true when the entry already had a choice (a Back/Close return). */
function useEntryTab(cardKey: string): { entry: string; tab: DetailTab | undefined; returned: boolean } {
  // Read from history.state during render: a link or Back changes the card's search, so the
  // card rerenders after the browser entry has already moved.
  const position = historyPosition();
  const historyKey = position.key ?? '';
  const entry = `${historyKey}|${cardKey}`;
  carryTabOnCardSwitch(position.index, historyKey, cardKey);
  noteDetailEntry(historyKey, cardKey);
  // Decided once per arrival on an entry (the sheet can stay mounted across links/Back):
  // an entry that already had a choice is a return; otherwise a pending link request applies.
  // A tab carried by a form switch (师 → 師) is the same card, never a return: no scroll.
  const arrival = useRef<{ entry: string; returned: boolean } | null>(null);
  if (arrival.current?.entry !== entry) arrival.current = { entry, returned: historyKey !== '' && entryTabs.has(entry) && !carriedEntries.has(entry) };
  // Leaving the entry ends its "just switched form" status, so a later Back/Close to it is a return.
  useEffect(() => () => { carriedEntries.delete(entry); }, [entry]);
  if (!entryTabs.has(entry)) {
    const requested = takeRequestedTab(historyKey, cardKey);
    if (requested) entryTabs.set(entry, requested);
  }
  return { entry, tab: entryTabs.get(entry), returned: arrival.current.returned };
}

/** Remembered open/collapsed flag, read after mount so server and first client render agree.
 *  `known` turns true once the saved choice is read: loading waits for it, so a remembered
 *  collapse never starts a download during the default-open first render. */
function useRememberedOpen(): [boolean, (next: boolean) => void, boolean, () => void] {
  const [state, setState] = useState({ open: true, known: false });
  useEffect(() => { let open = true; try { const saved = localStorage.getItem(OPEN_KEY); if (saved !== null) open = saved === '1'; } catch { /* storage unavailable */ } setState({ open, known: true }); }, []);
  const update = (next: boolean) => { setState({ open: next, known: true }); try { localStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* ignore */ } };
  // Show all asks for room without changing the learner's saved drawer preference.
  const collapseForNow = () => setState(current => ({ ...current, open: false }));
  return [state.open, update, state.known, collapseForNow];
}

export function GlyphDetailTabs({ decomposition, etymology, cardKey }: { decomposition: { info: ReactNode; body: ReactNode } | null; etymology: EtymologyRequest | EtymologyRequest[] | null; cardKey: string }) {
  const drawerId = `detail-drawer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [open, setOpen, known, collapseForNow] = useRememberedOpen();
  const list = Array.isArray(etymology);
  const requests = useMemo(() => etymology === null ? [] : Array.isArray(etymology) ? etymology : [etymology], [etymology]);
  const views = useEtymologyViews(requests, known && open);
  const view = views === undefined ? undefined : views[0] ?? null;
  // Offered while unresolved; hidden once resolved with nothing to show (for a word: no character has notes).
  const hasEtymology = requests.length > 0 && (views === undefined || views.some(etymologyHasContent));
  const offered: DetailTab[] = [...(decomposition ? ['decomposition' as const] : []), ...(hasEtymology ? ['etymology' as const] : [])];
  // The chosen tab belongs to one history entry's card; a tab that vanished falls back to the first offered.
  const remembered = useEntryTab(cardKey);
  const [, rerender] = useState(0);
  const tab: DetailTab | undefined = remembered.tab && offered.includes(remembered.tab) ? remembered.tab : offered[0];
  const rootRef = useRef<HTMLDivElement>(null);
  // An expanded example grid in the same card collapses the drawer below it, giving
  // the tile scroller room; the next card still follows the remembered preference.
  useEffect(() => {
    const card = rootRef.current?.closest('.detail-sheet-body') ?? rootRef.current?.parentElement;
    if (!card) return;
    card.addEventListener('character-grid-expand', collapseForNow);
    return () => card.removeEventListener('character-grid-expand', collapseForNow);
  });
  // Returning to a card left on Etymology: bring the tabs back into view once its notes resolve.
  const scrolledFor = useRef('');
  const returnedToEtymology = remembered.returned && remembered.tab === 'etymology' && tab === 'etymology' && views !== undefined;
  useEffect(() => {
    if (!returnedToEtymology || scrolledFor.current === remembered.entry) return;
    scrolledFor.current = remembered.entry;
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [returnedToEtymology, remembered.entry]);
  if (!tab) return null;
  // Clicking the tab that is already open collapses the drawer (same as the chevron);
  // any other tab selects it and opens. While collapsed, a tab click selects and reopens.
  const select = (next: DetailTab) => {
    if (next === tab && open) { setOpen(false); return; }
    entryTabs.set(remembered.entry, next); rerender(n => n + 1); setOpen(true);
  };
  const tabId = (name: DetailTab) => `${drawerId}-${name}`;
  // Until the saved choice is read, the row shows but no drawer mounts (its breakdown fetches its own data).
  const showDecomposition = known && open && tab === 'decomposition' && decomposition;
  const showEtymology = known && open && tab === 'etymology';
  return <div ref={rootRef} className={`stroke-guide detail-tabs${open ? ' is-open' : ''}`}>
    <div className="stroke-tabs">
      <div className="stroke-tab-list" role="tablist" aria-label="Character notes">
        {decomposition && <span className="stroke-tab-item">
          <button type="button" role="tab" id={tabId('decomposition')} className="stroke-tab" aria-selected={Boolean(showDecomposition)} aria-controls={showDecomposition ? drawerId : undefined} title="Show the decomposition" onClick={() => select('decomposition')}><GitBranch size={13} aria-hidden="true"/>Decomposition</button>
          {showDecomposition && decomposition.info}
        </span>}
        {hasEtymology && <span className="stroke-tab-item">
          <button type="button" role="tab" id={tabId('etymology')} className="stroke-tab" aria-selected={showEtymology} aria-controls={showEtymology ? drawerId : undefined} title="Show the etymology notes" onClick={() => select('etymology')}><History size={13} aria-hidden="true"/>Etymology</button>
          {showEtymology && views && (list ? <WordEtymologyInfo views={views}/> : view && <EtymologyInfo view={view}/>)}
        </span>}
      </div>
      {/* Collapsed keeps the chevron pointing down, so the row never loses its control; it reopens the current tab. */}
      {open
        ? <Button variant="ghost" size="icon" className="stroke-tabs-collapse" aria-label="Collapse details" title="Collapse" aria-expanded="true" onClick={() => setOpen(false)}><ChevronUp size={18} aria-hidden="true"/></Button>
        : <Button variant="ghost" size="icon" className="stroke-tabs-collapse" aria-label="Expand details" title="Expand" aria-expanded="false" onClick={() => setOpen(true)}><ChevronDown size={18} aria-hidden="true"/></Button>}
    </div>
    {showDecomposition && <div className="stroke-drawer stroke-drawer-decomposition" id={drawerId} role="tabpanel" aria-labelledby={tabId('decomposition')}>{decomposition.body}</div>}
    {showEtymology && <div className="stroke-drawer detail-drawer-etymology etymology-section" id={drawerId} role="tabpanel" aria-labelledby={tabId('etymology')}>{list ? <WordEtymologyPanel requests={requests} views={views}/> : <EtymologyPanel view={view}/>}</div>}
  </div>;
}
