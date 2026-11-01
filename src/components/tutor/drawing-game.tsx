import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Bookmark, Check, PenLine, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { partOfSpeechOptions, vocabularyKind } from '@/lib/mandarin';
import { usageGroupLabel, usageGroups, parseUsageGroup } from '@/lib/usage-frequency';
import { drawingKinds, drawingPool, drawingWordPool, shuffledDrawingDeck, type DrawingCard, type DrawingResult, type DrawingSearch } from '@/lib/drawing-game';
import { DraftFilterForm } from './filter-form';
import { DrawingBoard } from './drawing-board';
import { useWorkspace } from './workspace';

type Answer = { entry: DrawingCard; result: DrawingResult };
const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;
export function DrawingGamePage({ search, onSearch }: { search: DrawingSearch; onSearch: (search: DrawingSearch) => void }) {
  const { items, catalogVersion, preferences, saved, toggleSaved } = useWorkspace();
  const kind = search.kind ?? 'Characters';
  const appliedFilters: DrawingSearch = { kind, collection: search.collection, level: search.level, pos: search.pos, strokes: search.strokes, usage: search.usage, saved: search.saved };
  const activeFilters = Boolean(search.collection || search.level || search.pos || search.strokes || search.usage || search.saved);
  const [deckSize, setDeckSize] = useState<number | 'all'>(10);
  const [deck, setDeck] = useState<DrawingCard[] | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [round, setRound] = useState(0);
  useEffect(() => { setDeck(null); setAnswers([]); }, [kind, search.collection, search.level, search.pos, search.strokes, search.usage, search.saved]);
  const entries = useMemo(() => kind === 'Words' ? [] : libraryEntries(kind), [kind, catalogVersion]);
  const words = useMemo(() => (items ?? []).filter(word => vocabularyKind(word) === 'word'), [items]);
  const collections = [...new Set(words.map(word => word.collection))].filter(name => name !== 'Sample collection').sort((a, b) => a.localeCompare(b));
  const posOptions = partOfSpeechOptions(words);
  const levels = [...new Set(words.map(word => word.level))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const pool = useMemo(() => kind === 'Words' ? drawingWordPool(words, search, preferences.includeTraditional, saved) : drawingPool(entries, search, preferences.includeTraditional, saved), [kind, words, entries, search, preferences.includeTraditional, saved]);
  const savedCount = useMemo(() => kind === 'Words' ? drawingWordPool(words, { ...search, saved: true }, preferences.includeTraditional, saved).length : drawingPool(entries, { ...search, saved: true }, preferences.includeTraditional, saved).length, [kind, words, entries, search, preferences.includeTraditional, saved]);
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
    <DraftFilterForm applied={appliedFilters} active={activeFilters} count={pool.length} onApply={configure} onClear={() => { const empty: DrawingSearch = { kind, collection: undefined, level: undefined, pos: undefined, strokes: undefined, usage: undefined, saved: undefined }; configure({ kind }); return empty; }}>{({ draft, patch, setDraft }) => { const draftKind = draft.kind ?? 'Characters'; const filtered = draftKind === 'Radicals' || draftKind === 'Components'; return <>
      <select className="filter-select" aria-label="Drawing category" value={draftKind} onChange={event => { const next = drawingKinds.find(value => value === event.target.value); if (next) setDraft({ kind: next, ...(draft.saved ? { saved: true } : {}) }); }}>{drawingKinds.map(value => <option key={value}>{value}</option>)}</select>
      <Button type="button" variant="ghost" className={draft.saved ? 'selected' : ''} aria-pressed={Boolean(draft.saved)} onClick={() => patch({ saved: draft.saved ? undefined : true })}>Saved<span className="catalog-tab-count">{savedCount}</span></Button>
      {draftKind === 'Words' && <><select className="filter-select" aria-label="Collection" value={draft.collection ?? ''} onChange={event => patch({ collection: event.target.value || undefined })}><option value="">All collections</option>{collections.map(value => <option key={value}>{value}</option>)}</select><select className="filter-select" aria-label="HSK level" value={draft.level ?? ''} onChange={event => patch({ level: event.target.value || undefined })}><option value="">All levels</option>{levels.map(value => <option key={value}>{value}</option>)}</select><select className="filter-select" aria-label="Part of speech" value={draft.pos ?? ''} onChange={event => patch({ pos: event.target.value || undefined })}><option value="">All types</option>{posOptions.map(value => <option key={value}>{value}</option>)}</select></>}
      {draftKind !== 'Words' && <select className="filter-select" aria-label="Frequency" value={draft.usage ?? ''} onChange={event => patch({ usage: parseUsageGroup(draftKind, event.target.value) })}><option value="">All frequencies</option>{usageGroups(draftKind).map(group => <option key={group.value} value={group.value}>{usageGroupLabel(group, draftKind, preferences.includeTraditional)}</option>)}</select>}
      {filtered && <select className="filter-select" aria-label="Stroke count" value={draft.strokes ?? ''} onChange={event => patch({ strokes: event.target.value || undefined })}><option value="">All stroke counts</option>{[...new Set(libraryEntries(draftKind).flatMap(entry => entry.strokes ? [entry.strokes] : []))].sort((a,b) => a-b).map(value => <option key={value} value={value}>{value} {value === 1 ? 'stroke' : 'strokes'}</option>)}</select>}
    </>; }}</DraftFilterForm>
    <div className="flash-setup game-options">
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
      : <Link key={entry.id} to="/strokes" search={{ character: entry.hanzi, ...(entry.radicalVariant ? { family: entry.kangxiIndex, variant: entry.radicalVariant } : {}) }} title={`Practice ${entry.pinyin} · ${entry.meaning}`}><span lang="zh-CN">{entry.hanzi}</span><small>{entry.pinyin}</small></Link>)}</div>}{review.length > 0 && <div className="flex justify-center mb-4"><Button variant="outline" disabled={!unsavedReview.length} onClick={() => unsavedReview.forEach(entry => toggleSaved(entry.id))}>{unsavedReview.length ? <Bookmark/> : <Check/>}{unsavedReview.length ? `Save ${unsavedReview.length} unknown ${unsavedReview.length === 1 ? 'card' : 'cards'}` : 'Unknown cards saved'}</Button></div>}{review.length > 0 && !unsavedReview.length && <p className="text-center mb-4" role="status">Bookmarked in Saved for this session.</p>}<div className="drawing-actions">{review.length > 0 && <Button onClick={() => start(review, true)}><RotateCcw/>Review cards</Button>}<Button variant="outline" onClick={() => start(pool)}>New round<ArrowRight/></Button></div></section></div>}
  </div>;
}