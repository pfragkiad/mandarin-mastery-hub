import { useMemo, useState } from 'react';
import { RotateCcw, Shuffle, Volume2, Check, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collections, speak } from '@/lib/mandarin';
import { referenceCatalog } from './references';
import { useWorkspace } from './workspace';

type Card = { hanzi: string; pinyin: string; meaning: string };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i] as T; b[i] = b[j] as T; b[j] = t; } return b; };

export function FlashcardsPage() {
  const { items, preferences } = useWorkspace();
  const [category, setCategory] = useState('All vocabulary');
  const [level, setLevel] = useState('All levels');
  const [direction, setDirection] = useState<'zh' | 'en'>('zh');
  const [deck, setDeck] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<Card[]>([]);
  const levels = useMemo(() => [...new Set(items.map(w => w.level))], [items]);
  const isReference = category.startsWith('Ref:');

  const pool = useMemo<Card[]>(() => {
    if (isReference) {
      const kind = category.slice(4);
      return (referenceCatalog.find(c => c.kind === kind)?.entries ?? []).map(([hanzi, pinyin, meaning]) => ({ hanzi, pinyin, meaning }));
    }
    return items.filter(w => (category === 'All vocabulary' || w.collection === category) && (level === 'All levels' || w.level === level));
  }, [items, category, level, isReference]);

  const start = (cards: Card[]) => { setDeck(shuffle(cards)); setIndex(0); setFlipped(false); setMissed([]); };
  const answer = (known: boolean) => {
    if (!deck) return;
    const current = deck[index]; if (!known && current) setMissed(m => [...m, current]);
    setFlipped(false);
    setTimeout(() => setIndex(i => i + 1), 150);
  };
  const card = deck?.[index];
  const done = deck && index >= deck.length;

  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">REMEMBER · RECALL · REPEAT</div><h1>Turn a card, test your memory.</h1><p>Pick a category and level, then flip through a shuffled deck.</p></div><span className="heading-hanzi">记<span>jì</span></span></div>
    <div className="flash-setup">
      <label>CATEGORY<select className="filter-select" value={category} onChange={e => { setCategory(e.target.value); setDeck(null); }}>
        <optgroup label="Vocabulary"><option>All vocabulary</option>{collections.map(c => <option key={c}>{c}</option>)}</optgroup>
        <optgroup label="References">{referenceCatalog.map(c => <option key={c.kind} value={`Ref:${c.kind}`}>{c.kind}s</option>)}</optgroup>
      </select></label>
      <label>LEVEL<select className="filter-select" value={level} disabled={isReference} onChange={e => { setLevel(e.target.value); setDeck(null); }}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select></label>
      <label>CARD FRONT<select className="filter-select" value={direction} onChange={e => { setDirection(e.target.value as 'zh' | 'en'); setFlipped(false); }}><option value="zh">Chinese → English</option><option value="en">English → Chinese</option></select></label>
      <label>&nbsp;<Button onClick={() => start(pool)} disabled={!pool.length}><Play />{deck ? 'Restart' : 'Start'} · {pool.length} cards</Button></label>
    </div>

    {!deck && <div className="empty-state"><h3>{pool.length ? 'Ready when you are.' : 'No cards in this selection.'}</h3><p>{pool.length ? 'Press Start to shuffle the deck. Tap a card to flip it.' : 'Try another category or level.'}</p></div>}

    {card && !done && <div className="flash-stage">
      <div className="flash-meta"><span>Card {index + 1} of {deck!.length}</span><span>{missed.length} to review</span></div>
      <div className="flash-progress"><span style={{ width: `${(index / deck!.length) * 100}%` }} /></div>
      <button className={`flash-card ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(f => !f)} aria-label="Flip card">
        <div className="flash-inner">
          <div className="flash-face">{direction === 'zh' ? <span className="flash-big" lang="zh-CN">{card.hanzi}</span> : <span className="flash-word">{card.meaning}</span>}<span className="flash-hint">TAP TO FLIP</span></div>
          <div className="flash-face back"><span className="flash-big" lang="zh-CN">{card.hanzi}</span><span className="pinyin" style={{ fontSize: 16 }}>{card.pinyin}</span><span className="flash-word">{card.meaning}</span></div>
        </div>
      </button>
      <div className="flash-actions">
        <Button variant="outline" onClick={() => answer(false)} disabled={!flipped}><X />Still learning</Button>
        <Button onClick={() => answer(true)} disabled={!flipped}><Check />I knew it</Button>
      </div>
      <Button variant="ghost" onClick={() => speak(card.hanzi, preferences.slow)}><Volume2 />Listen</Button>
    </div>}

    {done && <div className="flash-stage"><div className="flash-result">
      <div className="eyebrow">DECK COMPLETE</div>
      <strong>{deck!.length - missed.length} / {deck!.length}</strong>
      <p>{missed.length ? 'These deserve another look:' : 'A perfect round — well done.'}</p>
      {missed.length > 0 && <div className="flash-missed">{missed.map(m => <span key={m.hanzi} lang="zh-CN">{m.hanzi}</span>)}</div>}
      <div className="flex gap-2 flex-wrap justify-center">
        {missed.length > 0 && <Button onClick={() => start(missed)}><RotateCcw />Review missed</Button>}
        <Button variant="outline" onClick={() => start(pool)}><Shuffle />New round</Button>
      </div>
    </div></div>}
  </div>;
}
