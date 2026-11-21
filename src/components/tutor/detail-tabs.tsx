import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EtymologyRequest } from '@/lib/etymology';
import { EtymologyInfo, EtymologyPanel, etymologyHasContent, useEtymologyView } from './etymology-section';

/**
 * Decomposition | Etymology drawer tabs on a glyph detail card, built exactly like Practice's
 * Strokes | Decomposition drawer (same .stroke-guide / .stroke-tab / .stroke-drawer styles):
 * plain text tabs with the open tab's source ⓘ beside it and a collapse chevron at the right.
 * Inputs:
 * - `decomposition`: the recorded breakdown (`info` ⓘ + `body`), or null when there is none.
 * - `etymology`: the exact etymology request, or null when etymology does not apply (strokes).
 * - `cardKey`: the card's identity (heading ID, so switching forms on one card keeps the tab).
 * State:
 * - open/collapsed is remembered on this device (owner's choice); the tab is not — every card
 *   opens on Decomposition (or the only tab offered).
 * - Nothing in a collapsed drawer mounts or downloads. While open, etymology resolves even on
 *   the Decomposition tab, so the Etymology tab can hide itself when the card has no notes
 *   (owner's choice: it may vanish a moment after opening). Unresolved, the tab stays offered.
 * When no tab remains (no breakdown, empty etymology) the whole drawer renders nothing.
 */
type DetailTab = 'decomposition' | 'etymology';
const OPEN_KEY = 'tutor-detail-drawer-open';

/** Remembered open/collapsed flag, read after mount so server and first client render agree.
 *  `known` turns true once the saved choice is read: loading waits for it, so a remembered
 *  collapse never starts a download during the default-open first render. */
function useRememberedOpen(): [boolean, (next: boolean) => void, boolean] {
  const [state, setState] = useState({ open: true, known: false });
  useEffect(() => { let open = true; try { const saved = localStorage.getItem(OPEN_KEY); if (saved !== null) open = saved === '1'; } catch { /* storage unavailable */ } setState({ open, known: true }); }, []);
  const update = (next: boolean) => { setState({ open: next, known: true }); try { localStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* ignore */ } };
  return [state.open, update, state.known];
}

export function GlyphDetailTabs({ decomposition, etymology, cardKey }: { decomposition: { info: ReactNode; body: ReactNode } | null; etymology: EtymologyRequest | null; cardKey: string }) {
  const drawerId = `detail-drawer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [open, setOpen, known] = useRememberedOpen();
  const view = useEtymologyView(etymology, known && open);
  // Offered while unresolved; hidden once resolved with nothing to show.
  const hasEtymology = Boolean(etymology) && (view === undefined || etymologyHasContent(view));
  const offered: DetailTab[] = [...(decomposition ? ['decomposition' as const] : []), ...(hasEtymology ? ['etymology' as const] : [])];
  // The chosen tab belongs to one card; a new card (or a tab that vanished) falls back to the first offered.
  const [chosen, setChosen] = useState<{ card: string; tab: DetailTab } | null>(null);
  const tab: DetailTab | undefined = chosen && chosen.card === cardKey && offered.includes(chosen.tab) ? chosen.tab : offered[0];
  if (!tab) return null;
  const select = (next: DetailTab) => { setChosen({ card: cardKey, tab: next }); setOpen(true); };
  const tabId = (name: DetailTab) => `${drawerId}-${name}`;
  // Until the saved choice is read, the row shows but no drawer mounts (its breakdown fetches its own data).
  const showDecomposition = known && open && tab === 'decomposition' && decomposition;
  const showEtymology = known && open && tab === 'etymology';
  return <div className={`stroke-guide detail-tabs${open ? ' is-open' : ''}`}>
    <div className="stroke-tabs">
      <div className="stroke-tab-list" role="tablist" aria-label="Character notes">
        {decomposition && <span className="stroke-tab-item">
          <button type="button" role="tab" id={tabId('decomposition')} className="stroke-tab" aria-selected={Boolean(showDecomposition)} aria-controls={showDecomposition ? drawerId : undefined} title="Show the decomposition" onClick={() => select('decomposition')}>Decomposition</button>
          {showDecomposition && decomposition.info}
        </span>}
        {hasEtymology && <span className="stroke-tab-item">
          <button type="button" role="tab" id={tabId('etymology')} className="stroke-tab" aria-selected={showEtymology} aria-controls={showEtymology ? drawerId : undefined} title="Show the etymology notes" onClick={() => select('etymology')}>Etymology</button>
          {showEtymology && view && <EtymologyInfo view={view}/>}
        </span>}
      </div>
      {/* Collapsed keeps the chevron pointing down, so the row never loses its control; it reopens the current tab. */}
      {open
        ? <Button variant="ghost" size="icon" className="stroke-tabs-collapse" aria-label="Collapse details" title="Collapse" aria-expanded="true" onClick={() => setOpen(false)}><ChevronUp size={18} aria-hidden="true"/></Button>
        : <Button variant="ghost" size="icon" className="stroke-tabs-collapse" aria-label="Expand details" title="Expand" aria-expanded="false" onClick={() => setOpen(true)}><ChevronDown size={18} aria-hidden="true"/></Button>}
    </div>
    {showDecomposition && <div className="stroke-drawer stroke-drawer-decomposition" id={drawerId} role="tabpanel" aria-labelledby={tabId('decomposition')}>{decomposition.body}</div>}
    {showEtymology && <div className="stroke-drawer detail-drawer-etymology etymology-section" id={drawerId} role="tabpanel" aria-labelledby={tabId('etymology')}><EtymologyPanel view={view}/></div>}
  </div>;
}
