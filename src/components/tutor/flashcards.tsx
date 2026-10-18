import { useMemo, useState } from 'react';
import { RotateCcw, Shuffle, Volume2, Check, X, Play } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { includeScript, type CharacterScript } from '@/lib/learning-preferences';
import { collections } from '@/lib/mandarin';
import { audioCandidates, playPronunciation, type AudioAttachment } from '@/lib/audio';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { referenceCatalog } from '@/lib/character-library';
import { useWorkspace } from './workspace';

type Card = { hanzi: string; pinyin: string; meaning: string; script?: CharacterScript; audio?: AudioAttachment | null };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i] as T; b[i] = b[j] as T; b[j] = t; } return b; };

const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;

export function FlashcardsPage() {
  const { items, preferences } = useWorkspace();
  const [category, setCategory] = useState('All vocabulary');
  const [level, setLevel] = useState('All levels');
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
  const isReference = category.startsWith('Ref:');

  const pool = useMemo<Card[]>(() => {
    if (isReference) {
      const kind = category.slice(4);
      return (referenceCatalog.find(c => c.kind === kind)?.entries ?? []).filter(row => includeScript(row[4], preferences.includeTraditional)).map(([hanzi, pinyin, meaning, , script]) => ({ hanzi, pinyin, meaning, ...(script ? { script } : {}) }));
    }
    return items.filter(w => (category === 'All vocabulary' || w.collection === category) && (level === 'All levels' || w.level === level));
  }, [items, category, level, isReference, preferences.includeTraditional]);

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

  const uniqueMissed = [...new Map(missed.map(m => [m.hanzi, m])).values()];
  const firstTry = repeat ? deck ? new Set(deck.map(c => c.hanzi)).size - uniqueMissed.length : 0 : 0;
  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">REMEMBER · RECALL · REPEAT</div><h1>Turn a card, test your memory.</h1><p>Pick a category and level, then flip through a shuffled deck.</p></div><span className="heading-hanzi">记<span>jì</span></span></div>
    <div className="flash-setup">
      <select className="filter-select" aria-label="Category" value={category} onChange={e => { setCategory(e.target.value); setDeck(null); }}>
        <optgroup label="Vocabulary"><option>All vocabulary</option>{collections.map(c => <option key={c}>{c}</option>)}</optgroup>
        <optgroup label="Library">{referenceCatalog.map(c => <option key={c.kind} value={`Ref:${c.kind}`}>{c.kind}s</option>)}</optgroup>
      </select>
      <select className="filter-select" aria-label="HSK level" value={level} disabled={isReference} onChange={e => { setLevel(e.target.value); setDeck(null); }}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select>
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
            <Button variant="ghost" className="flash-face-flip" onClick={() => setFlipped(f => !f)} aria-label="Flip card"/>
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
      {repeat ? <><strong>All {new Set(deck?.map(c => c.hanzi)).size} known</strong><p>{uniqueMissed.length ? `${firstTry} on the first try. These took extra tries:` : 'Every card on the first try — well done.'}</p></>
        : <><strong>{(deck?.length ?? 0) - uniqueMissed.length} / {deck?.length ?? 0}</strong><p>{uniqueMissed.length ? 'These deserve another look — tap one to open it:' : 'A perfect round — well done.'}</p></>}
      {uniqueMissed.length > 0 && <div className="flash-missed">{uniqueMissed.map(m => isReference || !items.some(w => w.hanzi === m.hanzi)
        ? <Link key={m.hanzi} to="/strokes" search={{ character: m.hanzi }} title={`${m.pinyin} · ${m.meaning} — practise writing`}><span lang="zh-CN">{m.hanzi}</span><small>{m.pinyin}</small></Link>
        : <Link key={m.hanzi} to="/vocabulary" search={{ q: m.hanzi }} title={`${m.pinyin} · ${m.meaning} — open in Vocabulary`}><span lang="zh-CN">{m.hanzi}</span><small>{m.pinyin}</small></Link>)}</div>}
      <div className="flex gap-2 flex-wrap justify-center">
        {uniqueMissed.length > 0 && <Button onClick={() => start(uniqueMissed, true)}><RotateCcw />New round with {uniqueMissed.length} missed</Button>}
        <Button variant="outline" onClick={() => start(pool)}><Shuffle />New round</Button>
      </div>
    </div></div>}
  </div>;
}
