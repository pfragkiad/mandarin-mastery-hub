import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Bookmark, Check, PenLine, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { partOfSpeechOptions, vocabularyKind } from '@/lib/mandarin';
import { reuseGroups } from '@/lib/component-reuse';
import { drawingKinds, drawingPool, drawingWordPool, shuffledDrawingDeck, type DrawingCard, type DrawingResult, type DrawingSearch } from '@/lib/drawing-game';
import { DrawingBoard } from './drawing-board';
import { useWorkspace } from './workspace';

type Answer = { entry: DrawingCard; result: DrawingResult };
const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;
export function DrawingGamePage({ search, onSearch }: { search: DrawingSearch; onSearch: (search: DrawingSearch) => void }) {
  const { items, catalogVersion, preferences, saved, toggleSaved } = useWorkspace();
  const kind = search.kind ?? 'Characters';
  const [deckSize, setDeckSize] = useState<number | 'all'>(10);
  const [deck, setDeck] = useState<DrawingCard[] | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [round, setRound] = useState(0);
  useEffect(() => { setDeck(null); setAnswers([]); }, [kind, search.collection, search.level, search.pos, search.strokes, search.usage, search.saved]);
  const entries = useMemo(() => kind === 'Words' ? [] : libraryEntries(kind), [kind, catalogVersion]);
  const words = useMemo(() => (items ?? []).filter(word => vocabularyKind(word) === 'word'), [items]);
  const collections = [...new Set(words.map(word => word.collection))].sort((a, b) => a.localeCompare(b));
  const posOptions = partOfSpeechOptions(words);
  const levels = [...new Set(words.map(word => word.level))];
  const pool = useMemo(() => kind === 'Words' ? drawingWordPool(words, search, preferences.includeTraditional, saved) : drawingPool(entries, search, preferences.includeTraditional, saved), [kind, words, entries, search, preferences.includeTraditional, saved]);
  const savedCount = useMemo(() => kind === 'Words' ? drawingWordPool(words, { ...search, saved: true }, preferences.includeTraditional, saved).length : drawingPool(entries, { ...search, saved: true }, preferences.includeTraditional, saved).length, [kind, words, entries, search, preferences.includeTraditional, saved]);
  const strokeCounts = [...new Set(entries.flatMap(entry => entry.strokes ? [entry.strokes] : []))].sort((a, b) => a - b);
  const filtered = kind === 'Radicals' || kind === 'Components';
  const card = deck?.[answers.length];
  const done = deck !== null && !card;
  const roundSize = deckSize === 'all' ? pool.length : Math.min(deckSize, pool.length);
  const review = answers.filter(answer => answer.result === 'passed' || answer.result === 'guided').map(answer => answer.entry);
  const unsavedReview = review.filter(entry => !saved.includes(entry.id));
  const correct = answers.filter(answer => answer.result === 'correct').length;
  const unavailable = answers.filter(answer => answer.result === 'unavailable').length;
  const start = (records: DrawingCard[], next = false) => { setDeck(shuffledDrawingDeck(records, next || deckSize === 'all' ? records.length : deckSize)); setAnswers([]); setRound(value => value + 1); };
  const configure = (next: DrawingSearch) => { setDeck(null); setAnswers([]); onSearch(next); };

  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">RECALL · WRITE · REMEMBER</div><h1>Drawing game</h1></div><span className="heading-hanzi">写<span>xiě</span></span></div>
    <div className="flash-setup drawing-setup">
      <select className="filter-select" aria-label="Drawing category" value={kind} onChange={event => { const next = drawingKinds.find(value => value === event.target.value); if (next) configure({ kind: next, ...(search.saved ? { saved: true } : {}) }); }}>{drawingKinds.map(value => <option key={value}>{value}</option>)}</select>
      <Button variant="ghost" className={search.saved ? 'selected' : ''} aria-pressed={Boolean(search.saved)} onClick={() => configure({ ...search, saved: search.saved ? undefined : true })}>Saved<span className="catalog-tab-count">{savedCount}</span></Button>
      {kind === 'Words' && <><select className="filter-select" aria-label="Collection" value={search.collection ?? ''} onChange={event => configure({ ...search, collection: event.target.value || undefined })}><option value="">All collections</option>{collections.map(value => <option key={value}>{value}</option>)}</select><select className="filter-select" aria-label="HSK level" value={search.level ?? ''} onChange={event => configure({ ...search, level: event.target.value || undefined })}><option value="">All levels</option>{levels.map(value => <option key={value}>{value}</option>)}</select><select className="filter-select" aria-label="Part of speech" value={search.pos ?? ''} onChange={event => configure({ ...search, pos: event.target.value || undefined })}><option value="">All types</option>{posOptions.map(value => <option key={value}>{value}</option>)}</select></>}
      {filtered && <><select className="filter-select" aria-label="Stroke count" value={search.strokes ?? ''} onChange={event => configure({ ...search, strokes: event.target.value || undefined })}><option value="">All stroke counts</option>{strokeCounts.map(value => <option key={value} value={value}>{value} {value === 1 ? 'stroke' : 'strokes'}</option>)}</select>
        <select className="filter-select" aria-label="Usage category" value={search.usage ?? ''} onChange={event => configure({ ...search, usage: reuseGroups.find(group => group.value === event.target.value)?.value })}><option value="">All usage categories</option>{reuseGroups.map(group => <option key={group.value} value={group.value}>{group.label}</option>)}</select></>}
      <select className="filter-select" aria-label="Deck size" value={String(deckSize)} onChange={event => { setDeckSize(event.target.value === 'all' ? 'all' : Number(event.target.value)); setDeck(null); setAnswers([]); }}>
        {deckSizes.map(n => <option key={n} value={n}>{n} cards</option>)}
        <option value="all">All cards</option>
      </select>
      <div className="flash-start"><Button disabled={!pool.length} onClick={() => start(pool)}>{deck ? <RotateCcw/> : <Play/>}{deck ? 'New round' : 'Start'} · {roundSize}{roundSize < pool.length ? ` of ${pool.length}` : ''} cards</Button></div>
    </div>
    <p className="drawing-rule">Incorrect strokes can be retried — show the guide whenever you need it.</p>
    {!deck && <section className="drawing-idle"><span className="eyebrow"><PenLine size={13}/>DRAW FROM MEMORY</span><div className="record-gap"><p>{!catalogVersion ? 'Loading the library…' : pool.length ? `${pool.length} cards match your filters. Press Start to shuffle ${roundSize === pool.length ? 'the whole deck' : `a deck of ${roundSize}`}.` : 'No cards with recorded pinyin and translation match these filters.'}</p></div></section>}
    {card && <div className="flash-stage drawing-stage"><div className="flash-meta"><span>Card {answers.length + 1} of {deck?.length}</span><span>{correct} correct · {review.length} to review</span></div><progress className="drawing-progress" value={answers.length} max={deck?.length ?? 1} aria-label="Round progress"/><DrawingBoard key={`${round}:${card.id}`} entry={card} onFinish={result => setAnswers(previous => [...previous, { entry: card, result }])}/></div>}
    {done && <div className="flash-stage"><section className="drawing-results"><span className="eyebrow">ROUND COMPLETE</span><strong>{correct} / {answers.length - unavailable}</strong><p>{correct} correct · {review.length} to review{unavailable ? ` · ${unavailable} without writing data` : ''}</p>{review.length > 0 && <div className="flash-missed">{review.map(entry => entry.word
      ? <Link key={entry.id} to="/vocabulary" search={{ tab: 'word', word: entry.id }} title={`${entry.word.pinyin} · ${entry.word.meaning}`}><span lang="zh-CN">{entry.word.hanzi}</span><small>{entry.word.pinyin} · {entry.hanzi}</small></Link>
      : <Link key={entry.id} to="/strokes" search={{ character: entry.hanzi }} title={`Practice ${entry.pinyin} · ${entry.meaning}`}><span lang="zh-CN">{entry.hanzi}</span><small>{entry.pinyin}</small></Link>)}</div>}{review.length > 0 && <div className="flex justify-center mb-4"><Button variant="outline" disabled={!unsavedReview.length} onClick={() => unsavedReview.forEach(entry => toggleSaved(entry.id))}>{unsavedReview.length ? <Bookmark/> : <Check/>}{unsavedReview.length ? `Save ${unsavedReview.length} unknown ${unsavedReview.length === 1 ? 'card' : 'cards'}` : 'Unknown cards saved'}</Button></div>}{review.length > 0 && !unsavedReview.length && <p className="text-center mb-4" role="status">Bookmarked in Saved for this session.</p>}<div className="drawing-actions">{review.length > 0 && <Button onClick={() => start(review, true)}><RotateCcw/>Review cards</Button>}<Button variant="outline" onClick={() => start(pool)}>New round<ArrowRight/></Button></div></section></div>}
  </div>;
}