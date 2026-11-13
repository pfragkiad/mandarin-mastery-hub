import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Maximize2, Minimize2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchAll, type GlobalPinyinMode } from '@/lib/site-search';
import { SearchHitContent } from './search-hit-content';
import { useWorkspace } from './workspace';

/**
 * "Search everything" window opened from the header (or Ctrl/⌘K).
 *
 * Inputs: `open` / `onOpenChange` from the shell, which owns only whether the
 * window is showing. State: the typed draft (text + Pinyin/Exact mode), the
 * applied search, and the compact/expanded window size live here, so typing
 * rerenders only this window — never the side menu, header or page around it.
 *
 * Results follow the explicit-apply rule of the library filters: typing only
 * edits the draft; Apply (or Enter) runs the dictionary-wide search. Enter on an
 * already-applied search opens the first result. Emptying the box clears the
 * results at once, like the libraries' X. Apply stays in place (disabled when
 * there is nothing new to apply) so the input never changes width while typing.
 */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { preferences, items, catalogVersion } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!open) setExpanded(false); }, [open]);
  const [query, setQuery] = useState('');
  // Pinyin/Exact toggles inside the global search box, mirroring the library filters.
  const [py, setPy] = useState<GlobalPinyinMode>('any');
  const [applied, setApplied] = useState<{ query: string; py: GlobalPinyinMode }>({ query: '', py: 'any' });
  // A mode toggle alone filters nothing while the box is empty, so it never offers Apply.
  const changed = query.trim() !== '' && (query !== applied.query || py !== applied.py);
  const apply = () => { if (changed) setApplied({ query, py }); };
  const editQuery = (value: string) => {
    setQuery(value);
    if (value.trim() === '') setApplied({ query: '', py });
  };
  // Keep one ordered result set for both window sizes, including lazy catalogue
  // hydration. Expansion removes only the preview cap, not matching or ordering.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion re-runs the search when lazy catalogue data lands
  const allHits = useMemo(() => searchAll(items, applied.query, preferences.includeTraditional, Infinity, applied.py), [items, applied, preferences.includeTraditional, catalogVersion]);
  const hits = expanded ? allHits : allHits.slice(0, 50);
  const close = () => { onOpenChange(false); setQuery(''); setApplied({ query: '', py }); };
  const openHit = (hit: (typeof hits)[number]) => {
    close();
    if (hit.kind === 'Word') navigate({ to: '/vocabulary', search: { q: hit.word.hanzi, word: hit.word.id } });
    else navigate({ to: '/characters', search: { tab: hit.kind === 'Radical' ? 'Radicals' : hit.kind === 'Component' ? 'Components' : 'Characters', character: hit.hanzi } });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`global-search${expanded ? ' global-search-expanded' : ''}`}><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, components, and phrases.</DialogDescription><form className="global-search-bar" onSubmit={e => { e.preventDefault(); apply(); }}><div className="search-field"><Search/><input autoFocus aria-label="Search everything" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => editQuery(e.target.value)} onKeyDown={e => {
      // Enter is handled here, not by form submission: browsers skip implicit
      // submission while the Apply button is disabled, which would stop Enter
      // from opening the first result of an already-applied search.
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (changed) apply(); else if (hits[0]) openHit(hits[0]);
    }}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
    <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div><Button type="submit" variant="outline" className="global-search-apply" disabled={!changed}><Check/>Apply</Button></form>
    {applied.query.trim() === '' ? <p className="global-search-hint">Type, then press Apply or Enter to search. Press Enter again to open the first result.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results">{hits.map(hit => <Button variant="ghost" type="button" key={hit.kind === 'Word' ? `w-${hit.word.id}` : `${hit.kind}-${hit.hanzi}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><SearchHitContent hit={hit}/></Button>)}</div> : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}
    {applied.query.trim() !== '' && hits.length > 0 && <div className="global-search-foot"><span>{!expanded && allHits.length > 50 ? `50 of ${allHits.length.toLocaleString()} matches` : `${allHits.length.toLocaleString()} ${allHits.length === 1 ? 'match' : 'matches'}`}</span><Button variant="ghost" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2/> : <Maximize2/>}{expanded ? 'Compact window' : 'Show all results'}</Button></div>}
  </DialogContent></Dialog>;
}
