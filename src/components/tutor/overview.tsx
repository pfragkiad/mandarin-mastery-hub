import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Sparkles, Search, Play, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { SearchHitContent } from './search-hit-content';
import { overviewWordDestination } from '@/lib/overview';
import { libraryDestination } from '@/lib/character-library';
import { searchAll } from '@/lib/site-search';
import { DailyCharacterHero, SavedStrip, useDailyCharacter } from './overview-hero';
import { DiscoveryTile, type DiscoveryCategory } from './overview-discovery';

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = ['Characters', 'Components', 'Radicals', 'word', 'phrase'];

export function OverviewPage() {
  const { items, preferences } = useWorkspace();
  const [query, setQuery] = useState('');
  // Pinyin/Exact toggles inside the hero search box, mirroring the library filters.
  const [py, setPy] = useState<'any' | 'pinyin' | 'exact'>('any');
  const hits = searchAll(items, query, preferences.includeTraditional, 20, py);
  const daily = useDailyCharacter().entry?.hanzi;
  return <div className="page-enter overview-page">
    <DailyCharacterHero><OverviewSearch query={query} setQuery={setQuery} py={py} setPy={setPy} hits={hits} includeTraditional={preferences.includeTraditional}/></DailyCharacterHero>
    <section className="overview-discovery-row" aria-label="Learning library — totals and a random record per category">
      {DISCOVERY_CATEGORIES.map(category => <DiscoveryTile key={category} category={category}/>)}
    </section>
    <SavedStrip/>
    <section className="overview-flashcards" aria-label="Play flashcards"><div className="flashcard-fan" aria-hidden="true"><span lang="zh-CN">学</span><span lang="zh-CN">{daily ?? '习'}</span><Sparkles/></div><div><div className="eyebrow">A LITTLE CHALLENGE</div><h2>How much will you remember?</h2><p>A fresh round. A second chance at the ones you miss.</p></div><Button asChild className="overview-play"><Link to="/flashcards"><Play/>Play flashcards now <ArrowRight/></Link></Button></section>
    <section className="overview-flashcards overview-drawing" aria-label="Play the drawing game"><div className="drawing-badge" aria-hidden="true"><Pencil/></div><div><div className="eyebrow">PRACTICE YOUR HAND</div><h2>Can you write it without the guide?</h2><p>Draw characters, radicals, and words stroke by stroke.</p></div><Button asChild className="overview-play"><Link to="/drawing"><Play/>Play drawing game <ArrowRight/></Link></Button></section>
  </div>;
}

function OverviewSearch({ query, setQuery, py, setPy, hits, includeTraditional }: { query: string; setQuery: (value: string) => void; py: 'any' | 'pinyin' | 'exact'; setPy: (mode: 'any' | 'pinyin' | 'exact') => void; hits: ReturnType<typeof searchAll>; includeTraditional: boolean }) {
  return <section className="overview-library-search"><div className="hero-search"><div className="search-field"><Search/><input aria-label="Search the library" placeholder="Discover a word, character, pinyin, or meaning…" value={query} onChange={event => setQuery(event.target.value)}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
    <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>{query.trim() !== '' && <div className="hero-search-results" role="listbox" aria-label="Library search results">{hits.length ? hits.map(hit => {
      if (hit.kind === 'Word') return <Link key={`w-${hit.word.id}`} to="/vocabulary" search={overviewWordDestination(hit.word)} className="hero-search-hit" role="option" aria-selected={false}><SearchHitContent hit={hit}/></Link>;
      const destination = libraryDestination(hit.hanzi, includeTraditional);
      return destination ? <Link key={`${hit.kind}-${hit.hanzi}`} to="/characters" search={destination} className="hero-search-hit" role="option" aria-selected={false}><SearchHitContent hit={hit}/></Link> : null;
    }) : <p className="hero-search-empty">No matches — try another word or meaning.</p>}</div>}</div></section>;
}
