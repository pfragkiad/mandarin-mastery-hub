import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, BookOpen, Layers, PenLine, Type, Volume2, ArrowUpRight, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { WordCard } from './word-card';
import { referenceCatalog, type ReferenceKind } from './references';
import { speak, type Word } from '@/lib/mandarin';
import mountain from '@/assets/mountain-study.jpg';
import { includeScript } from '@/lib/learning-preferences';
import mountainNight from '@/assets/mountain-study-night.jpg';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type SearchHit =
  | { kind: 'Word'; word: Word }
  | { kind: ReferenceKind; hanzi: string; pinyin: string; meaning: string; note: string };

function searchAll(items: Word[], query: string, includeTraditional = false): SearchHit[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const wordHits: SearchHit[] = items
    .filter(w => normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.translation}`).includes(q))
    .map(word => ({ kind: 'Word' as const, word }));
  const refHits: SearchHit[] = referenceCatalog.flatMap(({ kind, entries }) =>
    entries
      .filter(([hanzi, pinyin, meaning, note, script]) => includeScript(script, includeTraditional) && normalize(`${hanzi} ${pinyin} ${meaning} ${note}`).includes(q))
      .map(([hanzi, pinyin, meaning, note]) => ({ kind, hanzi, pinyin, meaning, note }))
  );
  return [...wordHits, ...refHits].slice(0, 8);
}

export function OverviewPage() {
  const { items, preferences } = useWorkspace();
  const [query, setQuery] = useState('');
  const hits = searchAll(items, query, preferences.includeTraditional);
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">YOUR DAILY DOSE OF MANDARIN</div><h1>Your Mandarin journey</h1><p>A little curiosity. A little practice. A little closer.</p></div><span className="heading-hanzi" lang="zh-CN">你好<span>nǐ hǎo</span></span></div>
    <section className="journey-banner"><img className="banner-day" src={mountain} width={1536} height={640} alt="Misty mountains and a quiet Chinese pavilion beside a river"/><img className="banner-night" src={mountainNight} width={1536} height={640} alt="" aria-hidden="true"/><div className="banner-copy"><span className="banner-eyebrow">学无止境 · LEARNING NEVER ENDS</span><h2>Small steps.<br/><em>A world of meaning.</em></h2><p>Discover the words. Hear the tones.<br/>Make the language your own.</p><div className="hero-search"><div className="search-field"><Search/><input aria-label="Search everything" placeholder="Search a word, character, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)}/></div>{query.trim() !== '' && <div className="hero-search-results" role="listbox" aria-label="Search results">{hits.length ? hits.map(hit => hit.kind === 'Word' ? <Link key={`w-${hit.word.id}`} to="/vocabulary" className="hero-search-hit" role="option" aria-selected={false} onClick={() => setQuery('')}><strong lang="zh-CN">{hit.word.hanzi}</strong><span className="pinyin">{hit.word.pinyin}</span><span className="hit-meaning">{hit.word.meaning}</span><span className="hit-kind">Word</span></Link> : <Link key={`${hit.kind}-${hit.hanzi}`} to="/strokes" search={{ character: hit.hanzi }} className="hero-search-hit" role="option" aria-selected={false} onClick={() => setQuery('')}><strong lang="zh-CN">{hit.hanzi}</strong><span className="pinyin">{hit.pinyin}</span><span className="hit-meaning">{hit.meaning}</span><span className="hit-kind">{hit.kind}</span></Link>) : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}</div>}</div><Button asChild><Link to="/vocabulary">Explore vocabulary <ArrowRight/></Link></Button></div><span className="banner-seal" lang="zh-CN">一步<br/>一步</span></section>
    <section className="stats-row" aria-label="Learning library statistics">{[{ icon: BookOpen, number: items.length, label: 'Words & phrases', note: 'Ready to explore' }, { icon: Layers, number: 4, label: 'Collections', note: 'For everyday life' }, { icon: PenLine, number: 18, label: 'Stroke types', note: 'Build your foundation' }, { icon: Type, number: 3, label: 'Character styles', note: 'Find your way to read' }].map(s => <div className="stat" key={s.label}><span className="stat-icon"><s.icon size={19}/></span><div><div className="stat-top"><strong>{s.number}</strong><span>{s.label}</span></div><span className="stat-note">{s.note}</span></div></div>)}</section>
    <section className="collection-section"><div className="section-heading"><div><div className="eyebrow">START SOMEWHERE SMALL</div><h2>Your vocabulary collection</h2></div><Button asChild variant="ghost" className="text-link"><Link to="/vocabulary">View all words <ArrowRight/></Link></Button></div><div className="word-grid overview-words">{items.slice(0,4).map(w => <WordCard word={w} key={w.id}/>)}</div></section>
    <div className="discovery-row"><section className="practice-feature"><div className="practice-feature-copy"><span className="eyebrow">FROM SEEING TO WRITING</span><h2>Get a feel for every stroke.</h2><p>Slow down. Follow the movement.<br/>Bring a character to life, one stroke at a time.</p><Button asChild variant="outline"><Link to="/strokes">Practice writing <ArrowRight/></Link></Button></div><div className="mini-character-grid" lang="zh-CN">永<span>yǒng</span></div></section><section className="daily-word"><div className="daily-word-top"><span className="eyebrow"><Sparkles size={13}/> A WORD TO TAKE WITH YOU</span><Button variant="ghost" size="icon" title="Listen to learning" aria-label="Listen to 学习" onClick={() => speak('学习', preferences.slow)}><Volume2/></Button></div><Link to="/vocabulary" search={{ q: '学习', word: 'xuexi' }} className="daily-word-content" aria-label="Open 学习 in dictionary"><div><span className="pinyin">xué xí</span><strong lang="zh-CN">学习</strong></div><div><h3>To learn</h3><p>Every new word is<br/>a new way to see.</p></div></Link><Button asChild variant="link"><Link to="/vocabulary" search={{ q: '学习', word: 'xuexi' }}>Open in dictionary <ArrowUpRight/></Link></Button></section></div>
  </div>;
}
