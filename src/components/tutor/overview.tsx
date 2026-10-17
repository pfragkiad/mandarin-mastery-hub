import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Sparkles, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { vocabularyKind } from '@/lib/mandarin';
import { overviewWordDestination } from '@/lib/overview';
import { libraryDestination } from '@/lib/character-library';
import { searchAll } from '@/lib/site-search';
import { DailyCharacterHero, SavedStrip, useDailyCharacter } from './overview-hero';
import { DiscoveryTile, type DiscoveryCategory } from './overview-discovery';

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = ['word', 'phrase', 'Characters', 'Components', 'Radicals'];

export function OverviewPage() {
  const { items, preferences } = useWorkspace();
  const [query, setQuery] = useState('');
  const hits = searchAll(items, query, preferences.includeTraditional);
  const daily = useDailyCharacter().entry?.hanzi;
  return <div className="page-enter overview-page">
    <DailyCharacterHero><OverviewSearch query={query} setQuery={setQuery} hits={hits} includeTraditional={preferences.includeTraditional}/></DailyCharacterHero>
    <section className="overview-discovery-row" aria-label="Learning library — totals and a random record per category">
      {DISCOVERY_CATEGORIES.map(category => <DiscoveryTile key={category} category={category}/>)}
    </section>
    <SavedStrip/>
    <section className="overview-flashcards" aria-label="Play flashcards"><div className="flashcard-fan" aria-hidden="true"><span lang="zh-CN">学</span><span lang="zh-CN">{daily ?? '习'}</span><Sparkles/></div><div><div className="eyebrow">A LITTLE CHALLENGE</div><h2>How much will you remember?</h2><p>A fresh round. A second chance at the ones you miss.</p></div><Button asChild className="overview-play"><Link to="/flashcards"><Play/>Play flashcards now <ArrowRight/></Link></Button></section>
  </div>;
}

function OverviewSearch({ query, setQuery, hits, includeTraditional }: { query: string; setQuery: (value: string) => void; hits: ReturnType<typeof searchAll>; includeTraditional: boolean }) {
  return <section className="overview-library-search"><div className="hero-search"><div className="search-field"><Search/><input aria-label="Search the library" placeholder="Discover a word, character, pinyin, or meaning…" value={query} onChange={event => setQuery(event.target.value)}/></div>{query.trim() !== '' && <div className="hero-search-results" role="listbox" aria-label="Library search results">{hits.length ? hits.map(hit => {
      if (hit.kind === 'Word') return <Link key={`w-${hit.word.id}`} to="/vocabulary" search={overviewWordDestination(hit.word)} className="hero-search-hit" role="option" aria-selected={false}><strong lang="zh-CN">{hit.word.hanzi}</strong><span className="pinyin">{hit.word.pinyin}</span><span className="hit-meaning" title={hit.word.meaning}>{hit.word.meaning}</span><span className="hit-kind">{vocabularyKind(hit.word)}</span></Link>;
      const destination = libraryDestination(hit.hanzi, includeTraditional);
      return destination ? <Link key={`${hit.kind}-${hit.hanzi}`} to="/characters" search={destination} className="hero-search-hit" role="option" aria-selected={false}><strong lang="zh-CN">{hit.hanzi}</strong><span className="pinyin">{hit.pinyin}</span><span className="hit-meaning" title={hit.meaning}>{hit.meaning}</span><span className="hit-kind">{hit.kind}</span></Link> : null;
    }) : <p className="hero-search-empty">No matches — try another word or meaning.</p>}</div>}</div></section>;
}
