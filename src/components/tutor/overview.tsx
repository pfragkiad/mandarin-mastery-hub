import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Search, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from './workspace';
import { SearchHitContent } from './search-hit-content';
import { IncrementalList } from './incremental-list';
import { overviewWordDestination } from '@/lib/overview';
import { libraryDestination } from '@/lib/character-library';
import { searchAll, type GlobalPinyinMode } from '@/lib/site-search';
import { DailyCharacterHero, SavedStrip } from './overview-hero';
import { DiscoveryTile, type DiscoveryCategory } from './overview-discovery';
import { SoundDiscoveryTile } from './overview-sound';
import { OverviewGames } from './overview-games';

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = ['Characters', 'Components', 'Radicals', 'word', 'phrase'];

export function OverviewPage() {
  const { items, preferences, catalogVersion } = useWorkspace();
  return <div className="page-enter overview-page">
    <DailyCharacterHero><OverviewSearch items={items} includeTraditional={preferences.includeTraditional} catalogVersion={catalogVersion}/></DailyCharacterHero>
    <section className="overview-discovery-row" aria-label="Learning library — totals and a random record per category">
      {DISCOVERY_CATEGORIES.map(category => <DiscoveryTile key={category} category={category}/>)}
      {/* Sixth card: a random Pinyin syllable that has at least one recording. */}
      <SoundDiscoveryTile/>
    </section>
    <SavedStrip/>
    {/* All five games, grouped as Hanzi games and Pinyin games. */}
    <OverviewGames/>
  </div>;
}

type SearchMode = GlobalPinyinMode;

/**
 * Start-page library search (inline preview + "Show all results" window).
 *
 * Inputs: the workspace items, the Traditional preference and catalogVersion
 * (re-runs the search when lazy catalogue data lands). State: the typed draft
 * (text + Pinyin/Exact), the applied search, and whether the window is open.
 *
 * Like "Search everything", typing only edits the draft — the dictionary-wide
 * search runs on Apply or Enter, and Enter on an already-applied search opens
 * the first result. Emptying the box clears results at once. The state lives
 * here, not in OverviewPage, so keystrokes never rerender the hero, the random
 * cards or the games around it. The inline box and the window share one draft,
 * so a search continues unchanged when the window opens or closes.
 */
function OverviewSearch({ items, includeTraditional, catalogVersion }: { items: ReturnType<typeof useWorkspace>['items']; includeTraditional: boolean; catalogVersion: unknown }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [py, setPy] = useState<SearchMode>('any');
  const [applied, setApplied] = useState<{ query: string; py: SearchMode }>({ query: '', py: 'any' });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  // A mode toggle alone filters nothing while the box is empty, so it never offers Apply.
  const changed = query.trim() !== '' && (query !== applied.query || py !== applied.py);
  const apply = () => { if (changed) setApplied({ query, py }); };
  const editQuery = (value: string) => {
    setQuery(value);
    if (value.trim() === '') setApplied({ query: '', py });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion re-runs the search when lazy catalogue data lands
  const hits = useMemo(() => applied.query.trim() === '' ? [] : searchAll(items, applied.query, includeTraditional, Infinity, applied.py), [items, applied, includeTraditional, catalogVersion]);
  const hasApplied = applied.query.trim() !== '';
  type Hit = (typeof hits)[number];
  // Preserve the result's exact library kind, even for duplicate glyph forms.
  const glyphSearch = (hit: Exclude<Hit, { kind: 'Word' }>) => {
    const destination = libraryDestination(hit.hanzi, includeTraditional);
    return destination ? { ...destination, tab: hit.kind === 'Radical' ? 'Radicals' as const : hit.kind === 'Component' ? 'Components' as const : 'Characters' as const } : null;
  };
  const openFirst = () => {
    const hit = hits[0];
    if (!hit) return;
    setOpen(false);
    if (hit.kind === 'Word') { navigate({ to: '/vocabulary', search: overviewWordDestination(hit.word) }); return; }
    const search = glyphSearch(hit);
    if (search) navigate({ to: '/characters', search });
  };
  const renderHit = (hit: Hit) => {
    if (hit.kind === 'Word') return <Link key={`w-${hit.word.id}`} to="/vocabulary" search={overviewWordDestination(hit.word)} onClick={() => setOpen(false)} className="hero-search-hit" role="option" aria-selected={false}><SearchHitContent hit={hit}/></Link>;
    const search = glyphSearch(hit);
    return search ? <Link key={`${hit.kind}-${hit.hanzi}`} to="/characters" search={search} onClick={() => setOpen(false)} className="hero-search-hit" role="option" aria-selected={false}><SearchHitContent hit={hit}/></Link> : null;
  };
  // One search bar for both places; `label`/`placeholder` keep each box's own wording.
  const bar = (label: string, placeholder: string, autoFocus = false) => <form className="global-search-bar" onSubmit={e => { e.preventDefault(); apply(); }}><div className="search-field"><Search/><input autoFocus={autoFocus} aria-label={label} placeholder={placeholder} value={query} onChange={event => editQuery(event.target.value)} onKeyDown={e => {
      // Enter is handled here: browsers skip implicit submission while Apply is
      // disabled, which would stop Enter from opening the first applied result.
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (changed) apply(); else openFirst();
    }}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
    <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div><Button type="submit" variant="outline" className="global-search-apply" disabled={!changed}><Check/>Apply</Button></form>;
  return <section className="overview-library-search"><div className="hero-search">{bar('Search the library', 'Discover a word, character, pinyin, or meaning…')}{hasApplied && !open && <div className="hero-search-results">{hits.length ? <><div className="global-search-foot"><span>{hits.length.toLocaleString()} {hits.length === 1 ? 'match' : 'matches'}</span><Button variant="ghost" type="button" onClick={() => { setExpanded(true); setOpen(true); }}><Maximize2/>Show all results</Button></div><div role="listbox" aria-label="Library search results">{hits.slice(0, 20).map(renderHit)}</div></> : <p className="hero-search-empty">No matches — try another word or meaning.</p>}</div>}</div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className={`global-search${expanded ? ' global-search-expanded' : ''}`}><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, components, and phrases.</DialogDescription>{bar('Search everything', 'Search Chinese, pinyin, or meaning…', true)}{!hasApplied ? <p className="global-search-hint">Type, then press Apply or Enter to search. Press Enter again to open the first result.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results"><IncrementalList items={expanded ? hits : hits.slice(0, 50)} renderItem={renderHit} resetKey={applied}/></div> : <p className="hero-search-empty">No matches — try another word or meaning.</p>}{hasApplied && hits.length > 0 && <div className="global-search-foot"><span>{!expanded && hits.length > 50 ? `50 of ${hits.length.toLocaleString()} matches` : `${hits.length.toLocaleString()} ${hits.length === 1 ? 'match' : 'matches'}`}</span><Button variant="ghost" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2/> : <Maximize2/>}{expanded ? 'Compact window' : 'Show all results'}</Button></div>}</DialogContent></Dialog>
  </section>;
}
