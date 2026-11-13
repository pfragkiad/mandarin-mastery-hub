import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Maximize2, Minimize2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchAll, type GlobalPinyinMode } from '@/lib/site-search';
import { SearchHitContent } from './search-hit-content';
import { useWorkspace } from './workspace';

/**
 * "Search everything" window opened from the header (or Ctrl/⌘K).
 *
 * Inputs: `open` / `onOpenChange` from the shell, which owns only whether the
 * window is showing. State: the typed query, the Pinyin/Exact mode and the
 * compact/expanded window size live here, so a keystroke rerenders only this
 * window — never the side menu, header or page around it.
 *
 * Tricky part: matching scans the whole dictionary, which is slow on phones.
 * The input is bound to `query` (always instant), while matching and the result
 * list use a deferred copy, so React keeps typing responsive and fills the
 * results in as soon as it can, dropping work for letters typed in between.
 */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { preferences, items, catalogVersion } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!open) setExpanded(false); }, [open]);
  const [query, setQuery] = useState('');
  // Pinyin/Exact toggles inside the global search box, mirroring the library filters.
  const [py, setPy] = useState<GlobalPinyinMode>('any');
  const deferredQuery = useDeferredValue(query);
  const deferredPy = useDeferredValue(py);
  const stale = deferredQuery !== query || deferredPy !== py;
  // Keep one ordered result set for both window sizes, including lazy catalogue
  // hydration. Expansion removes only the preview cap, not matching or ordering.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion re-runs the search when lazy catalogue data lands
  const allHits = useMemo(() => searchAll(items, deferredQuery, preferences.includeTraditional, Infinity, deferredPy), [items, deferredQuery, preferences.includeTraditional, deferredPy, catalogVersion]);
  const hits = expanded ? allHits : allHits.slice(0, 50);
  const close = () => { onOpenChange(false); setQuery(''); };
  const openHit = (hit: (typeof hits)[number]) => {
    close();
    if (hit.kind === 'Word') navigate({ to: '/vocabulary', search: { q: hit.word.hanzi, word: hit.word.id } });
    else navigate({ to: '/characters', search: { tab: hit.kind === 'Radical' ? 'Radicals' : hit.kind === 'Component' ? 'Components' : 'Characters', character: hit.hanzi } });
  };
  // Enter opens the first result of what is typed now, even if the list has not caught up yet.
  const firstHitNow = () => stale ? searchAll(items, query, preferences.includeTraditional, 1, py)[0] : hits[0];
  const shownQuery = deferredQuery;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`global-search${expanded ? ' global-search-expanded' : ''}`}><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, components, and phrases.</DialogDescription><div className="search-field"><Search/><input autoFocus aria-label="Search everything" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const first = firstHitNow(); if (first) { e.preventDefault(); openHit(first); } } }}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
    <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>
    {shownQuery.trim() === '' ? <p className="global-search-hint">Start typing — results appear as you go. Press Enter to open the first one.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results" aria-busy={stale}>{hits.map(hit => <Button variant="ghost" type="button" key={hit.kind === 'Word' ? `w-${hit.word.id}` : `${hit.kind}-${hit.hanzi}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><SearchHitContent hit={hit}/></Button>)}</div> : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}
    {shownQuery.trim() !== '' && hits.length > 0 && <div className="global-search-foot"><span>{!expanded && allHits.length > 50 ? `50 of ${allHits.length.toLocaleString()} matches` : `${allHits.length.toLocaleString()} ${allHits.length === 1 ? 'match' : 'matches'}`}</span><Button variant="ghost" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2/> : <Maximize2/>}{expanded ? 'Compact window' : 'Show all results'}</Button></div>}
  </DialogContent></Dialog>;
}
