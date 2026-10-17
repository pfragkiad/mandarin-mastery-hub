import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Volume2, ArrowUpRight, Sparkles, Search, Shuffle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { words, vocabularyKind } from '@/lib/mandarin';
import { randomOverviewWord, overviewWordDestination } from '@/lib/overview';
import { catalog, characterAudioRequest } from '@/lib/catalog-store';
import { libraryDestination } from '@/lib/character-library';
import { audioCandidates, playPronunciation, audioMessage } from '@/lib/audio';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { searchAll } from '@/lib/site-search';
import { OverviewCharacter } from './overview-character';

export function OverviewPage() {
  const { items, preferences, catalogVersion } = useWorkspace();
  const [query, setQuery] = useState('');
  const [featuredId, setFeaturedId] = useState<string>();
  const [audioError, setAudioError] = useState<string | null>(null);
  useEffect(() => {
    setFeaturedId(randomOverviewWord(words)?.id);
  }, []);
  const featured = items.find(word => word.id === featuredId) ?? items.find(word => vocabularyKind(word) === 'word' && word.script !== 'Traditional');
  const request = featured ? { ...characterAudioRequest(featured.hanzi, featured.pinyin), audio: featured.audio ?? null } : { text: '', reading: null };
  const candidates = audioCandidates(request);
  const hasRecording = candidates.some(candidate => candidate.kind === 'recording');
  const audioAvailable = usePronunciationAvailability(hasRecording, featured?.pinyin);
  const hits = searchAll(items, query, preferences.includeTraditional);
  const wordCount = items.filter(word => vocabularyKind(word) === 'word').length;
  const phraseCount = items.filter(word => vocabularyKind(word) === 'phrase').length;
  const nextWord = () => { setFeaturedId(randomOverviewWord(items, featured?.id)?.id); setAudioError(null); };
  const listen = async (preferTts = false) => {
    const result = await playPronunciation(request, preferences.slow, preferTts);
    setAudioError(audioMessage(result));
  };
  return <div className="page-enter overview-page">
    <div className="page-heading"><div><div className="eyebrow">一步一步 · ONE STEP AT A TIME</div><h1>Your Mandarin workspace</h1><p>A word to discover. A character to understand. A little more each day.</p></div><span className="heading-hanzi" lang="zh-CN">学<span>xué · learn</span></span></div>
    <OverviewSearch query={query} setQuery={setQuery} hits={hits} includeTraditional={preferences.includeTraditional}/>
    <section className="stats-row" aria-label="Learning library statistics">{([
      { glyph: '词', number: wordCount, label: 'Words', note: 'HSK & everyday vocabulary', to: '/vocabulary', search: { tab: 'word' } },
      { glyph: '句', number: phraseCount, label: 'Phrases', note: 'Including unofficial practice phrases', to: '/vocabulary', search: { tab: 'phrase' } },
      { glyph: '字', number: catalogVersion ? catalog.characters.length.toLocaleString('en-US') : '—', label: 'Characters', note: 'Full imported catalogue · all scripts', to: '/characters', search: { tab: 'Characters' } },
      { glyph: '口', number: catalogVersion ? catalog.components.length.toLocaleString('en-US') : '—', label: 'Components', note: 'Structural building blocks', to: '/characters', search: { tab: 'Components' } },
      { glyph: '氵', number: catalogVersion ? catalog.radicals.length : '—', label: 'Radicals', note: 'Dictionary reference library', to: '/characters', search: { tab: 'Radicals' } },
    ] as const).map(stat => <Button asChild variant="ghost" className="stat" key={stat.label}><Link to={stat.to} search={stat.search} aria-label={`Browse ${stat.label.toLowerCase()}`}><span className="stat-icon" aria-hidden="true" lang="zh-CN">{stat.glyph}</span><div><div className="stat-top"><strong>{stat.number}</strong><span>{stat.label}</span></div><span className="stat-note">{stat.note}</span></div></Link></Button>)}</section>
    <div className="overview-study-row">
      <section className="daily-word overview-featured" aria-label="A word to take with you"><div className="daily-word-top"><span className="eyebrow"><Sparkles size={14}/> A WORD TO TAKE WITH YOU</span><Button variant="ghost" size="icon" title="Show another random word" aria-label="Show another random word" onClick={nextWord} disabled={wordCount < 2}><Shuffle/></Button></div>
        {featured && <><div className="overview-featured-word" aria-live="polite"><div className="catalog-detail-title overview-record-title"><Link to="/vocabulary" search={overviewWordDestination(featured)} className="overview-record-link" aria-label={`Open ${featured.hanzi} in dictionary`}><strong lang="zh-CN">{featured.hanzi}</strong><div>{preferences.pinyin && <span className="pinyin">{featured.pinyin}</span>}{preferences.meaning && <h2>{featured.meaning}</h2>}</div></Link><Button variant="ghost" size="icon" disabled={!audioAvailable} className={audioAvailable ? '' : 'audio-tts-only'} aria-label={audioAvailable ? `Listen to ${featured.hanzi}` : `No audio available for ${featured.hanzi}`} title={audioAvailable ? `Listen · ${candidates[0]?.label ?? 'Browser TTS'}` : undefined} onClick={() => listen()}><Volume2/></Button></div></div><div className="overview-featured-actions"><Button asChild variant="outline" size="sm"><Link to="/vocabulary" search={overviewWordDestination(featured)}>Open in dictionary <ArrowUpRight/></Link></Button></div>{audioError && <p className="library-note" role="status">{audioError}</p>}</>}
      </section>
      <OverviewCharacter/>
      <OverviewCharacter tab="Components"/>
    </div>
    <section className="overview-flashcards" aria-label="Play flashcards"><div className="flashcard-fan" aria-hidden="true"><span lang="zh-CN">学</span><span lang="zh-CN">习</span><Sparkles/></div><div><div className="eyebrow">A LITTLE CHALLENGE</div><h2>How much will you remember?</h2><p>A fresh round. A second chance at the ones you miss.</p></div><Button asChild className="overview-play"><Link to="/flashcards"><Play/>Play flashcards now <ArrowRight/></Link></Button></section>
  </div>;
}

function OverviewSearch({ query, setQuery, hits, includeTraditional }: { query: string; setQuery: (value: string) => void; hits: ReturnType<typeof searchAll>; includeTraditional: boolean }) {
  return <section className="overview-library-search"><div className="hero-search"><div className="search-field"><Search/><input aria-label="Search Overview library" placeholder="Discover a word, character, pinyin, or meaning…" value={query} onChange={event => setQuery(event.target.value)}/></div>{query.trim() !== '' && <div className="hero-search-results" role="listbox" aria-label="Overview search results">{hits.length ? hits.map(hit => {
      if (hit.kind === 'Word') return <Link key={`w-${hit.word.id}`} to="/vocabulary" search={overviewWordDestination(hit.word)} className="hero-search-hit" role="option" aria-selected={false}><strong lang="zh-CN">{hit.word.hanzi}</strong><span className="pinyin">{hit.word.pinyin}</span><span className="hit-meaning" title={hit.word.meaning}>{hit.word.meaning}</span><span className="hit-kind">{vocabularyKind(hit.word)}</span></Link>;
      const destination = libraryDestination(hit.hanzi, includeTraditional);
      return destination ? <Link key={`${hit.kind}-${hit.hanzi}`} to="/characters" search={destination} className="hero-search-hit" role="option" aria-selected={false}><strong lang="zh-CN">{hit.hanzi}</strong><span className="pinyin">{hit.pinyin}</span><span className="hit-meaning" title={hit.meaning}>{hit.meaning}</span><span className="hit-kind">{hit.kind}</span></Link> : null;
    }) : <p className="hero-search-empty">No matches — try another word or meaning.</p>}</div>}</div></section>;
}
