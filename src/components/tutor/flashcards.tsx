import { useMemo, useState } from 'react';
import { RotateCcw, Shuffle, Volume2, Check, X, Play, Bookmark } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { includeScript, type CharacterScript } from '@/lib/learning-preferences';
import { collections, partOfSpeechList, partOfSpeechOptions } from '@/lib/mandarin';
import { audioCandidates, playPronunciation, type AudioAttachment } from '@/lib/audio';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { referenceCatalog, type LibraryKind, type ReferenceKind } from '@/lib/character-library';
import { displayMeaning } from '@/lib/glyph-presentation';
import { useWorkspace } from './workspace';
import { usageGroupLabel, usageGroups, usageGroupFor, usageRank, parseUsageGroup } from '@/lib/usage-frequency';

type Card = { id: string; hanzi: string; pinyin: string; meaning: string; libraryKind?: LibraryKind; script?: CharacterScript; audio?: AudioAttachment | null };
const libraryKinds: Record<ReferenceKind, LibraryKind> = { Radical: 'Radicals', Component: 'Components', Character: 'Characters' };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i] as T; b[i] = b[j] as T; b[j] = t; } return b; };

const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;

export function FlashcardsPage({ category: controlledCategory, onCategoryChange }: { category?: string; onCategoryChange?: (category: string) => void } = {}) {
  const { items, preferences, saved, toggleSaved, catalogVersion } = useWorkspace();
  const [categoryState, setCategoryState] = useState('All vocabulary');
  const category = controlledCategory ?? categoryState;
  const setCategory = (next: string) => { setCategoryState(next); onCategoryChange?.(next); };
  const [level, setLevel] = useState('All levels');
  const [pos, setPos] = useState('All types');
  const [usage, setUsage] = useState('');
  const [direction, setDirection] = useState<'zh' | 'en'>('zh');
  const [showFrontPinyin, setShowFrontPinyin] = useState(false);
  const [deckSize, setDeckSize] = useState<number | 'all'>(10);
  const [deck, setDeck] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<Card[]>([]);
  const [repeat, setRepeat] = useState(false);
  const [round, setRound] = useState(1);
  const [total, setTotal] = useState(0);
  const levels = useMemo(() => [...new Set(items.map(w => w.level))], [items]);
  const posOptions = useMemo(() => partOfSpeechOptions(items), [items]);
  const isReference = category.startsWith('Ref:');
  const isSaved = category === 'Saved';

  const pool = useMemo<Card[]>(() => {
    if (isReference || isSaved) {
      const referenceCards = (kind: ReferenceKind) => {
        const reference = referenceCatalog.find(c => c.kind === kind);
        if (!reference) return [];
        const libraryKind = libraryKinds[reference.kind];
        return reference.entries.filter(row => includeScript(row[4], preferences.includeTraditional)).map(([hanzi, pinyin, meaning, , script]) => ({ id: `${libraryKind}:${hanzi}`, libraryKind, hanzi, pinyin, meaning, ...(script ? { script } : {}) }));
      };
      if (isSaved) {
        const kinds = Object.keys(libraryKinds) as ReferenceKind[];
        return [...items.filter(w => saved.includes(w.id)), ...kinds.flatMap(kind => referenceCards(kind).filter(card => saved.includes(card.id)))];
      }
      const refKind = libraryKinds[category.slice(4) as ReferenceKind];
      const group = refKind ? parseUsageGroup(refKind, usage) : undefined;
      const kangxi = new Map(refKind === 'Radicals' ? referenceCatalog.find(c => c.kind === 'Radical')?.entries.map(row => [row[0], Number((row[3] ?? "").match(/\bRadical #(\d+)\b/i)?.[1]) || undefined] as const) ?? [] : []);
      return referenceCards(category.slice(4) as ReferenceKind).filter(card => !group || !refKind || usageGroupFor(refKind, usageRank({ ...card, ...(kangxi.get(card.hanzi) ? { kangxiIndex: kangxi.get(card.hanzi) as number } : {}) }, refKind, preferences.includeTraditional))?.value === group);
    }
    return items.filter(w => (category === 'All vocabulary' || w.collection === category) && (level === 'All levels' || w.level === level) && (pos === 'All types' || partOfSpeechList(w).includes(pos)));
  }, [items, category, level, pos, isReference, isSaved, saved, usage, preferences.includeTraditional, catalogVersion]);

  const roundSize = deckSize === 'all' ? pool.length : Math.min(deckSize, pool.length);
  const start = (cards: Card[], next = false) => {
    const dealt = next ? shuffle(cards) : shuffle(cards).slice(0, deckSize === 'all' ? cards.length : deckSize);
    setRound(r => next ? r + 1 : 1);
    if (!next) setTotal(dealt.length);
    setDeck(dealt);
    setIndex(0);
    setFlipped(false);
    setMissed([]);
  };
  const answer = (known: boolean) => {
    if (!deck) return;
    const current = deck[index]; if (!known && current) setMissed(m => [...m, current]);
    setFlipped(false);
    if (repeat && !known && current) { setTimeout(() => setDeck(d => d ? [...d, current] : d), 150); }
    setTimeout(() => setIndex(i => i + 1), 150);
  };
  const card = deck?.[index];
  const done = deck && index >= deck.length;
  const request = { ...characterAudioRequest(card?.hanzi ?? '', card?.pinyin), audio: card?.audio ?? null };
  const source = audioCandidates(request)[0]?.label;
  const audioAvailable = usePronunciationAvailability(audioCandidates(request).some(candidate => candidate.kind === 'recording'), card?.pinyin);

  const uniqueMissed = [...new Map(missed.map(m => [m.id, m])).values()];
  const unsavedMissed = uniqueMissed.filter(m => !saved.includes(m.id));
  const firstTry = repeat ? deck ? new Set(deck.map(c => c.id)).size - uniqueMissed.length : 0 : 0;
  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">REMEMBER · RECALL · REPEAT</div><h1>Turn a card, test your memory.</h1><p>Pick a category and level, then flip through a shuffled deck.</p></div><span className="heading-hanzi">记<span>jì</span></span></div>
    <div className="flash-setup">
      <select className="filter-select" aria-label="Category" value={category} onChange={e => { setCategory(e.target.value); setDeck(null); }}>
        <optgroup label="Vocabulary"><option>All vocabulary</option>{collections.map(c => <option key={c}>{c}</option>)}</optgroup>
        <optgroup label="Library">{referenceCatalog.map(c => <option key={c.kind} value={`Ref:${c.kind}`}>{c.kind}s</option>)}</optgroup>
        <optgroup label="Workspace"><option>Saved</option></optgroup>
      </select>
      {!isReference && !isSaved && <>
        <select className="filter-select" aria-label="HSK level" value={level} onChange={e => { setLevel(e.target.value); setDeck(null); }}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select>
        <select className="filter-select" aria-label="Part of speech" value={pos} onChange={e => { setPos(e.target.value); setDeck(null); }}><option>All types</option>{posOptions.map(p => <option key={p}>{p}</option>)}</select>
      </>}
      {isReference && <select className="filter-select" aria-label="Frequency" value={parseUsageGroup(libraryKinds[category.slice(4) as ReferenceKind], usage) ?? ''} onChange={e => { setUsage(e.target.value); setDeck(null); }}><option value="">All frequencies</option>{usageGroups(libraryKinds[category.slice(4) as ReferenceKind]).map(group => <option key={group.value} value={group.value}>{usageGroupLabel(group, libraryKinds[category.slice(4) as ReferenceKind], preferences.includeTraditional)}</option>)}</select>}
      <select className="filter-select" aria-label="Card front" value={direction} onChange={e => { setDirection(e.target.value as 'zh' | 'en'); setFlipped(false); }}><option value="zh">Chinese → English</option><option value="en">English → Chinese</option></select>
      <select className="filter-select" aria-label="Deck size" value={String(deckSize)} onChange={e => setDeckSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
        {deckSizes.map(n => <option key={n} value={n}>{n} cards</option>)}
        <option value="all">All cards</option>
      </select>
      <div className="flash-options">
        <label className={`flash-option ${direction === 'en' ? 'is-disabled' : ''}`}><Switch checked={showFrontPinyin} onCheckedChange={setShowFrontPinyin} disabled={direction === 'en'} aria-label="Show pinyin on card front" /><span>Show pinyin on front</span></label>
        <label className="flash-option"><Switch checked={repeat} onCheckedChange={setRepeat} aria-label="Repeat missed cards until all are known" /><span>Repeat missed until known</span></label>
      </div>
      <div className="flash-start"><Button onClick={() => start(pool)} disabled={!pool.length}><Play />{deck ? 'Restart' : 'Start'} · {roundSize}{roundSize < pool.length ? ` of ${pool.length}` : ''} cards</Button></div>
    </div>

    {!deck && <div className="empty-state"><h3>{pool.length ? 'Ready when you are.' : 'No cards in this selection.'}</h3><p>{pool.length ? `${pool.length} cards match your filters. Press Start to shuffle ${roundSize === pool.length ? 'the whole deck' : `a deck of ${roundSize}`}. Tap a card to flip it.` : 'Try another category or level.'}</p></div>}

    {card && !done && <div className={`flash-stage ${card.script === 'Traditional' ? 'is-traditional' : ''}`}>
      <div className="flash-meta"><span>Card {index + 1} of {deck?.length ?? 0}{round > 1 ? ` · round ${round}` : ''}</span><span>{missed.length} to review</span></div>
      <div className="flash-progress"><span style={{ width: `${(index / (deck?.length || 1)) * 100}%` }} /></div>
      <div className={`flash-card ${flipped ? 'is-flipped' : ''}`}>
        <div className="flash-inner">
          <div className="flash-face" aria-hidden={flipped} inert={flipped}>
            <Button variant="ghost" className="flash-face-flip" onClick={() => setFlipped(f => !f)} aria-label="Flip card"/>
            {direction === 'zh' ? <>{showFrontPinyin && <span className="pinyin flash-pinyin">{card.pinyin}</span>}<span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span></> : <span className="flash-word">{card.meaning}</span>}<span className="flash-hint">TAP TO FLIP</span>
          </div>
          <div className="flash-face back" aria-hidden={!flipped} inert={!flipped}>
            <Button variant="ghost" className="flash-face-flip" onClick={() => setFlipped(true)} aria-label="Card answer"/>
            <div className="flash-pinyin-row"><span className="pinyin flash-pinyin">{card.pinyin}</span><Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} title={audioAvailable ? `Listen · ${source}` : undefined} aria-label={audioAvailable ? `Listen to ${card.hanzi}` : `No audio available for ${card.hanzi}`} onClick={() => playPronunciation(request, preferences.slow)}><Volume2/></Button></div>
            <span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span><span className="flash-word">{card.meaning}</span>
          </div>
        </div>
      </div>
      <div className="flash-actions">
        <Button variant="outline" onClick={() => answer(false)} disabled={!flipped}><X />Still learning</Button>
        <Button onClick={() => answer(true)} disabled={!flipped}><Check />I knew it</Button>
      </div>
    </div>}

    {done && <div className="flash-stage"><div className="flash-result">
      <div className="eyebrow">DECK COMPLETE</div>
      {repeat ? <><strong>All {new Set(deck?.map(c => c.id)).size} known</strong><p>{uniqueMissed.length ? `${firstTry} on the first try. These took extra tries:` : 'Every card on the first try — well done.'}</p></>
        : <><strong>{(deck?.length ?? 0) - uniqueMissed.length} / {deck?.length ?? 0}</strong><p>{uniqueMissed.length ? 'These deserve another look — tap one to open it:' : 'A perfect round — well done.'}</p></>}
      {uniqueMissed.length > 0 && <div className="flash-missed">{uniqueMissed.map(m => m.libraryKind
        ? <Link key={m.id} to="/characters" search={{ tab: m.libraryKind, id: m.id }} title={`${m.pinyin} · ${m.meaning} — open in Glyphs`}><span lang="zh-CN">{m.hanzi}</span><small>{m.pinyin}</small></Link>
        : <Link key={m.id} to="/vocabulary" search={{ word: m.id }} title={`${m.pinyin} · ${m.meaning} — open in Vocabulary`}><span lang="zh-CN">{m.hanzi}</span><small>{m.pinyin}</small></Link>)}</div>}
      {uniqueMissed.length > 0 && <div className="flex justify-center mb-4"><Button variant="outline" disabled={!unsavedMissed.length} onClick={() => unsavedMissed.forEach(m => toggleSaved(m.id))}>{unsavedMissed.length ? <Bookmark/> : <Check/>}{unsavedMissed.length ? `Save ${unsavedMissed.length} unknown ${unsavedMissed.length === 1 ? 'card' : 'cards'}` : 'Unknown cards saved'}</Button></div>}
      <div className="flex gap-2 flex-wrap justify-center">
        {uniqueMissed.length > 0 && <Button onClick={() => start(uniqueMissed, true)}><RotateCcw />New round with {uniqueMissed.length} missed</Button>}
        <Button variant="outline" onClick={() => start(pool)}><Shuffle />New round</Button>
      </div>
      {uniqueMissed.length > 0 && !unsavedMissed.length && <p role="status">Bookmarked in Saved for this session.</p>}
    </div></div>}
  </div>;
}
