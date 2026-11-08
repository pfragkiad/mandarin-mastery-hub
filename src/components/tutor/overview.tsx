import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from './workspace';
import { SearchHitContent } from './search-hit-content';
import { overviewWordDestination } from '@/lib/overview';
import { libraryDestination } from '@/lib/character-library';
import { searchAll } from '@/lib/site-search';
import { DailyCharacterHero, SavedStrip } from './overview-hero';
import { DiscoveryTile, type DiscoveryCategory } from './overview-discovery';
import { SoundDiscoveryTile } from './overview-sound';
import { OverviewGames } from './overview-games';

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = ['Characters', 'Components', 'Radicals', 'word', 'phrase'];

export function OverviewPage() {
  const { items, preferences, catalogVersion } = useWorkspace();
  const [query, setQuery] = useState('');
  // Pinyin/Exact toggles inside the hero search box, mirroring the library filters.
  const [py, setPy] = useState<'any' | 'pinyin' | 'exact'>('any');
  const hits = useMemo(() => searchAll(items, query, preferences.includeTraditional, Infinity, py), [items, query, preferences.includeTraditional, py, catalogVersion]);
  return <div className="page-enter overview-page">
    <DailyCharacterHero><OverviewSearch query={query} setQuery={setQuery} py={py} setPy={setPy} hits={hits} includeTraditional={preferences.includeTraditional}/></DailyCharacterHero>
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

function OverviewSearch({ query, setQuery, py, setPy, hits, includeTraditional }: { query: string; setQuery: (value: string) => void; py: 'any' | 'pinyin' | 'exact'; setPy: (mode: 'any' | 'pinyin' | 'exact') => void; hits: ReturnType<typeof searchAll>; includeTraditional: boolean }) {
  // Start keeps its inline preview; the same query and reading mode continue in
  // the expanded modal. Closing it preserves the Start-page search exactly.
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const renderHit = (hit: (typeof hits)[number]) => {
    if (hit.kind === 'Word') return <Link key={`w-${hit.word.id}`} to="/vocabulary" search={overviewWordDestination(hit.word)} onClick={() => setOpen(false)} className="hero-search-hit" role="option" aria-selected={false}><SearchHitContent hit={hit}/></Link>;
    const destination = libraryDestination(hit.hanzi, includeTraditional);
    // Preserve the result's exact library kind, even for duplicate glyph forms.
    return destination ? <Link key={`${hit.kind}-${hit.hanzi}`} to="/characters" search={{ ...destination, tab: hit.kind === 'Radical' ? 'Radicals' : hit.kind === 'Component' ? 'Components' : 'Characters' }} onClick={() => setOpen(false)} className="hero-search-hit" role="option" aria-selected={false}><SearchHitContent hit={hit}/></Link> : null;
  };
  return <section className="overview-library-search"><div className="hero-search"><div className="search-field"><Search/><input aria-label="Search the library" placeholder="Discover a word, character, pinyin, or meaning…" value={query} onChange={event => setQuery(event.target.value)}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
    <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>{query.trim() !== '' && !open && <div className="hero-search-results">{hits.length ? <><div className="global-search-foot"><span>{hits.length.toLocaleString()} matches</span><Button variant="ghost" onClick={() => { setExpanded(true); setOpen(true); }}><Maximize2/>Show all results</Button></div><div role="listbox" aria-label="Library search results">{hits.slice(0, 20).map(renderHit)}</div></> : <p className="hero-search-empty">No matches — try another word or meaning.</p>}</div>}</div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className={`global-search${expanded ? ' global-search-expanded' : ''}`}><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, components, and phrases.</DialogDescription><div className="search-field"><Search/><input aria-label="Search everything" value={query} placeholder="Search Chinese, pinyin, or meaning…" onChange={event => setQuery(event.target.value)}/><Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>{hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results">{(expanded ? hits : hits.slice(0, 50)).map(renderHit)}</div> : <p className="hero-search-empty">No matches — try another word or meaning.</p>}<div className="global-search-foot"><span>{!expanded && hits.length > 50 ? `50 of ${hits.length.toLocaleString()} matches` : `${hits.length.toLocaleString()} matches`}</span><Button variant="ghost" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <Minimize2/> : <Maximize2/>}{expanded ? 'Compact window' : 'Show all results'}</Button></div></DialogContent></Dialog>
  </section>;
}
