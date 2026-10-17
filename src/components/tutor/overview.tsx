import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, BookOpen, Layers, Languages, Volume2, ArrowUpRight, Sparkles, Search, Shuffle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { words, vocabularyKind } from '@/lib/mandarin';
import { includeScript } from '@/lib/learning-preferences';
import { randomOverviewWord, overviewWordDestination } from '@/lib/overview';
import { catalog, characterAudioRequest } from '@/lib/catalog-store';
import { libraryDestination } from '@/lib/character-library';
import { audioCandidates, playPronunciation, audioMessage } from '@/lib/audio';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { searchAll } from '@/lib/site-search';
import mountain from '@/assets/mountain-study.jpg';
import mountainNight from '@/assets/mountain-study-night.jpg';

export function OverviewPage() {
  const { items, preferences, catalogVersion } = useWorkspace();
  const [query, setQuery] = useState('');
  const [featuredId, setFeaturedId] = useState<string>();
  const [audioError, setAudioError] = useState<string | null>(null);
  useEffect(() => {
    setFeaturedId(randomOverviewWord(words.filter(word => includeScript(word.script, preferences.includeTraditional)))?.id);
  }, [preferences.includeTraditional]);
  const featured = items.find(word => word.id === featuredId) ?? items.find(word => vocabularyKind(word) === 'word');
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
    <section className="journey-banner"><img className="banner-day" src={mountain} width={1536} height={640} alt="Misty mountains and a quiet Chinese pavilion beside a river"/><img className="banner-night" src={mountainNight} width={1536} height={640} alt="" aria-hidden="true"/><div className="banner-copy"><span className="banner-eyebrow">学无止境 · LEARNING NEVER ENDS</span><h2>Mandarin Tutor</h2><p>Words in context. Characters with meaning.<br/>Find your next small step.</p><div className="overview-banner-actions"><Button asChild><Link to="/vocabulary">Explore vocabulary <ArrowRight/></Link></Button><Button asChild variant="outline"><Link to="/characters">Browse characters <ArrowUpRight/></Link></Button></div></div><span className="banner-seal" lang="zh-CN">一步<br/>一步</span></section>
    <section className="stats-row" aria-label="Learning library statistics">{[
      { icon: BookOpen, number: wordCount, label: 'Words', note: 'HSK & everyday vocabulary' },
      { icon: Layers, number: phraseCount, label: 'Phrases', note: 'Including unofficial practice phrases' },
      { icon: Languages, number: catalogVersion ? catalog.characters.length.toLocaleString('en-US') : '—', label: 'Characters', note: 'Full imported catalogue · all scripts' },
      { icon: PenLine, number: catalogVersion ? catalog.radicals.length : '—', label: 'Radicals', note: 'Dictionary reference library' },
    ].map(stat => <div className="stat" key={stat.label}><span className="stat-icon"><stat.icon size={19}/></span><div><div className="stat-top"><strong>{stat.number}</strong><span>{stat.label}</span></div><span className="stat-note">{stat.note}</span></div></div>)}</section>
    <div className="overview-study-row">
      <section className="daily-word overview-featured" aria-label="A word to take with you"><div className="daily-word-top"><span className="eyebrow"><Sparkles size={14}/> A WORD TO TAKE WITH YOU</span><Button variant="ghost" size="icon" title="Show another random word" aria-label="Show another random word" onClick={nextWord} disabled={wordCount < 2}><Shuffle/></Button></div>
        {featured && <><div className="overview-featured-word" aria-live="polite"><span className="word-level-wrap"><span className="word-level">{featured.level}</span>{featured.hskId != null && <span className="word-hsk-id" title="Official id in the HSK 3.0 syllabus">ID {featured.hskId}</span>}</span><Link to="/vocabulary" search={overviewWordDestination(featured)} className="daily-word-content" aria-label={`Open ${featured.hanzi} in dictionary`}><div>{preferences.pinyin && <span className="pinyin">{featured.pinyin}</span>}<strong lang="zh-CN" className={featured.script === 'Traditional' ? 'traditional-character' : ''}>{featured.hanzi}</strong></div><div>{preferences.meaning && <h3>{featured.meaning}</h3>}<p>{featured.type} · {featured.collection}</p>{featured.script === 'Traditional' && <span className="traditional-label">Traditional</span>}</div></Link></div><div className="overview-featured-actions"><Button asChild variant="outline" size="sm"><Link to="/vocabulary" search={overviewWordDestination(featured)}>Open in dictionary <ArrowUpRight/></Link></Button><Button variant="ghost" size="icon" disabled={!audioAvailable} className={audioAvailable ? '' : 'audio-tts-only'} aria-label={audioAvailable ? `Listen to ${featured.hanzi}` : `No audio available for ${featured.hanzi}`} title={audioAvailable ? `Listen · ${candidates[0]?.label ?? 'Browser TTS'}` : undefined} onClick={() => listen()}><Volume2/></Button></div>{audioError && <p className="library-note" role="status">{audioError}</p>}</>}
      </section>
      <section className="overview-paths" aria-label="Keep learning"><div className="eyebrow">KEEP YOUR CURIOSITY MOVING</div><h2>Where will you go next?</h2><Link to="/vocabulary" search={{ tab: 'phrase' }} className="overview-path"><span className="stat-icon"><BookOpen size={19}/></span><div><h3>From words to conversation</h3><p>Everyday expressions and Level 1 practice phrases.</p></div><ArrowUpRight/></Link><Link to="/characters" className="overview-path"><span className="stat-icon"><Languages size={19}/></span><div><h3>Look inside a character</h3><p>Radicals, components and sourced breakdowns.</p></div><ArrowUpRight/></Link><Link to="/flashcards" className="overview-path"><span className="stat-icon"><Layers size={19}/></span><div><h3>A little recall</h3><p>Test what you know. Revisit what you missed.</p></div><ArrowUpRight/></Link></section>
    </div>
    <section className="overview-library-search"><div><div className="eyebrow">FOLLOW A WORD OR A CHARACTER</div><h2>What are you curious about?</h2></div><div className="hero-search"><div className="search-field"><Search/><input aria-label="Search Overview library" placeholder="Chinese, pinyin, or meaning…" value={query} onChange={event => setQuery(event.target.value)}/></div>{query.trim() !== '' && <div className="hero-search-results" role="listbox" aria-label="Overview search results">{hits.length ? hits.map(hit => {
      if (hit.kind === 'Word') return <Link key={`w-${hit.word.id}`} to="/vocabulary" search={overviewWordDestination(hit.word)} className="hero-search-hit" role="option" aria-selected={false}><strong lang="zh-CN">{hit.word.hanzi}</strong><span className="pinyin">{hit.word.pinyin}</span><span className="hit-meaning" title={hit.word.meaning}>{hit.word.meaning}</span><span className="hit-kind">{vocabularyKind(hit.word)}</span></Link>;
      const destination = libraryDestination(hit.hanzi, preferences.includeTraditional);
      return destination ? <Link key={`${hit.kind}-${hit.hanzi}`} to="/characters" search={destination} className="hero-search-hit" role="option" aria-selected={false}><strong lang="zh-CN">{hit.hanzi}</strong><span className="pinyin">{hit.pinyin}</span><span className="hit-meaning" title={hit.meaning}>{hit.meaning}</span><span className="hit-kind">{hit.kind}</span></Link> : null;
    }) : <p className="hero-search-empty">No matches — try another word or meaning.</p>}</div>}</div></section>
  </div>;
}
