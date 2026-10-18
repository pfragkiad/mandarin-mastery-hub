import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, PenLine, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { libraryEntries, type LibraryEntry } from '@/lib/character-library';
import { reuseGroups } from '@/lib/component-reuse';
import { drawingKinds, drawingPool, shuffledDrawingDeck, type DrawingResult, type DrawingSearch } from '@/lib/drawing-game';
import { DrawingBoard } from './drawing-board';
import { useWorkspace } from './workspace';

type Answer = { entry: LibraryEntry; result: DrawingResult };
const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;
export function DrawingGamePage({ search, onSearch }: { search: DrawingSearch; onSearch: (search: DrawingSearch) => void }) {
  const { catalogVersion, preferences } = useWorkspace();
  const kind = search.kind ?? 'Characters';
  const [deckSize, setDeckSize] = useState<number | 'all'>(10);
  const [deck, setDeck] = useState<LibraryEntry[] | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [round, setRound] = useState(0);
  const entries = useMemo(() => libraryEntries(kind), [kind, catalogVersion]);
  const pool = useMemo(() => drawingPool(entries, search, preferences.includeTraditional), [entries, search, preferences.includeTraditional]);
  const strokeCounts = [...new Set(entries.flatMap(entry => entry.strokes ? [entry.strokes] : []))].sort((a, b) => a - b);
  const filtered = kind !== 'Characters';
  const card = deck?.[answers.length];
  const done = deck !== null && !card;
  const roundSize = deckSize === 'all' ? pool.length : Math.min(deckSize, pool.length);
  const review = answers.filter(answer => answer.result === 'missed' || answer.result === 'passed').map(answer => answer.entry);
  const correct = answers.filter(answer => answer.result === 'correct').length;
  const unavailable = answers.filter(answer => answer.result === 'unavailable').length;
  const start = (records: LibraryEntry[], next = false) => { setDeck(shuffledDrawingDeck(records, next || deckSize === 'all' ? records.length : deckSize)); setAnswers([]); setRound(value => value + 1); };
  const configure = (next: DrawingSearch) => { setDeck(null); setAnswers([]); onSearch(next); };

  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">RECALL · WRITE · REMEMBER</div><h1>Drawing game</h1></div><span className="heading-hanzi">写<span>xiě</span></span></div>
    <div className="flash-setup drawing-setup">
      <select className="filter-select" aria-label="Drawing category" value={kind} onChange={event => { const next = drawingKinds.find(value => value === event.target.value); if (next) configure({ kind: next, errors: search.errors }); }}>{drawingKinds.map(value => <option key={value}>{value}</option>)}</select>
      {filtered && <><select className="filter-select" aria-label="Stroke count" value={search.strokes ?? ''} onChange={event => configure({ ...search, strokes: event.target.value || undefined })}><option value="">All stroke counts</option>{strokeCounts.map(value => <option key={value} value={value}>{value} {value === 1 ? 'stroke' : 'strokes'}</option>)}</select>
        <select className="filter-select" aria-label="Usage category" value={search.usage ?? ''} onChange={event => configure({ ...search, usage: reuseGroups.find(group => group.value === event.target.value)?.value })}><option value="">All usage categories</option>{reuseGroups.map(group => <option key={group.value} value={group.value}>{group.label}</option>)}</select></>}
      <select className="filter-select" aria-label="Deck size" value={String(deckSize)} onChange={event => { setDeckSize(event.target.value === 'all' ? 'all' : Number(event.target.value)); setDeck(null); setAnswers([]); }}>
        {deckSizes.map(n => <option key={n} value={n}>{n} cards</option>)}
        <option value="all">All cards</option>
      </select>
      <label className="flash-option"><Switch aria-label="Allow errors" checked={Boolean(search.errors)} onCheckedChange={value => onSearch({ ...search, errors: value || undefined })}/><span>Allow errors</span></label>
      <div className="flash-start"><Button disabled={!pool.length} onClick={() => start(pool)}>{deck ? <RotateCcw/> : <Play/>}{deck ? 'New round' : 'Start'} · {roundSize}{roundSize < pool.length ? ` of ${pool.length}` : ''} cards</Button></div>
    </div>
    <p className="drawing-rule">{search.errors ? 'Incorrect strokes can be retried without revealing the guide.' : 'The first incorrect stroke sends the card to review.'}</p>
    {!deck && <section className="drawing-idle"><span className="eyebrow"><PenLine size={13}/>DRAW FROM MEMORY</span><div className="record-gap"><p>{!catalogVersion ? 'Loading the library…' : pool.length ? `${pool.length} cards match your filters. Press Start to shuffle ${roundSize === pool.length ? 'the whole deck' : `a deck of ${roundSize}`}.` : 'No cards with recorded pinyin and translation match these filters.'}</p></div></section>}
    {card && <div className="flash-stage drawing-stage"><div className="flash-meta"><span>Card {answers.length + 1} of {deck?.length}</span><span>{correct} correct · {review.length} to review</span></div><progress className="drawing-progress" value={answers.length} max={deck?.length ?? 1} aria-label="Round progress"/><DrawingBoard key={`${round}:${card.id}`} entry={card} allowErrors={Boolean(search.errors)} onFinish={result => setAnswers(previous => [...previous, { entry: card, result }])}/></div>}
    {done && <div className="flash-stage"><section className="drawing-results"><span className="eyebrow">ROUND COMPLETE</span><strong>{correct} / {answers.length - unavailable}</strong><p>{correct} correct · {review.length} to review{unavailable ? ` · ${unavailable} without writing data` : ''}</p>{review.length > 0 && <div className="flash-missed">{review.map(entry => <Link key={entry.id} to="/strokes" search={{ character: entry.hanzi }} title={`Practice ${entry.pinyin} · ${entry.meaning}`}><span lang="zh-CN">{entry.hanzi}</span><small>{entry.pinyin}</small></Link>)}</div>}<div className="drawing-actions">{review.length > 0 && <Button onClick={() => start(review, true)}><RotateCcw/>Review cards</Button>}<Button variant="outline" onClick={() => start(pool)}>New round<ArrowRight/></Button></div></section></div>}
  </div>;
}