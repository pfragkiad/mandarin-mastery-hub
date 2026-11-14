// The three listening games of the Pinyin guide. Each plays one exact recording
// and asks for: its tone (Tone quiz), its spelling among real sound-alike
// syllables in the same tone (Sound-alikes), or the typed pinyin (Type what you
// hear). Inputs: loaded data, the shared player and URL-applied filters. Each game
// is a fixed round of 10, 20 or 50 random sounds (pinyin-round.ts); at the end the
// missed sounds are listed (each playable) and can be replayed as their own round.
// Local state only: the round's deck, position, answer and misses. Nothing is kept
// after the round. Filter changes and the round size affect the next round only.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Play, RotateCcw, Shuffle, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SPOKEN_TONES, TONE_NAMES, allSounds, checkTyped, findSyllable, hasRecording, isScored, matchesFinal, matchesInitial, soundAlikes, toneMark, type PinyinData, type PinyinSound, type Tone, type TypedVerdict } from '@/lib/pinyin-guide';
import { ROUND_SIZES, dealRound, reviewRound, shuffle, type RoundSize } from '@/lib/pinyin-round';
import { DraftFilterForm } from './filter-form';
import { GameSetup } from './game-setup';
import { FinalSelect, InitialSelect } from './pinyin-chart';
import { ToneContour, sound, type PinyinPlayer } from './pinyin-shared';

export type DrillMode = 'tones' | 'alikes' | 'type';
export type DrillFilters = { initial: string; final: string };
type DrillProps = { data: PinyinData; player: PinyinPlayer; filters: DrillFilters; onFilters: (filters: DrillFilters) => void; slow: boolean; onSlow: (slow: boolean) => void };

const editable = (target: EventTarget | null) => { const el = target as HTMLElement | null; return Boolean(el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))); };

/** Sounds a game may ask: every recorded sound matching the filters; Sound-alikes also needs at least one real alternative. */
export function drillPool(data: PinyinData, mode: DrillMode, filters: DrillFilters): PinyinSound[] {
  const sounds = allSounds(data).filter(s => { const syllable = findSyllable(data, s.base); return syllable && matchesInitial(syllable, filters.initial) && matchesFinal(syllable, filters.final); });
  return mode === 'alikes' ? sounds.filter(s => soundAlikes(data, s.base, s.tone).length > 0) : sounds;
}

type Miss = { sound: PinyinSound; choice: string };

/**
 * One round shared by all games. State: the dealt deck (null before the first round),
 * the position, this question's answer, the misses and whether the round is finished.
 * `answer` scores once per sound; `next` moves on (or finishes after the last sound).
 */
function useRound(player: PinyinPlayer) {
  const [deck, setDeck] = useState<PinyinSound[] | null>(null);
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; choice: string } | null>(null);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [finished, setFinished] = useState(false);
  const current = deck && !finished ? deck[index] ?? null : null;
  const begin = (dealt: PinyinSound[], isReview: boolean) => {
    setDeck(dealt); setIndex(0); setReview(isReview); setResult(null); setMisses([]); setFinished(false);
    if (dealt[0]) void player.play(dealt[0]);
  };
  const answer = (correct: boolean, choice: string) => {
    if (!current || result) return;
    setResult({ correct, choice });
    if (!correct) setMisses(m => [...m, { sound: current, choice }]);
  };
  const next = () => {
    if (!deck || !result) return;
    setResult(null);
    if (index + 1 >= deck.length) { player.stop(); setFinished(true); return; }
    setIndex(index + 1);
    void player.play(deck[index + 1]!);
  };
  return { deck, index, review, current, result, misses, finished, begin, answer, next, replay: () => { if (current) void player.play(current); } };
}
type Round = ReturnType<typeof useRound>;

function DrillFrame({ mode, data, filters, onFilters, pool, round, size, onSize, slow, onSlow, player, prompt, describeChoice, children, footer }: DrillProps & { mode: DrillMode; pool: PinyinSound[]; round: Round; size: RoundSize; onSize: (size: RoundSize) => void; prompt: string; describeChoice: (miss: Miss) => string; children: ReactNode; footer?: ReactNode }) {
  const active = Boolean(filters.initial || filters.final);
  const roundLength = Math.min(size, pool.length);
  const startNew = () => round.begin(dealRound(pool, size), false);
  const startReview = () => round.begin(reviewRound(round.misses.map(m => m.sound)), true);
  // Enter = next sound once answered, or a new round before/after one; Space/R = hear it again.
  const latest = useRef({ round, startNew });
  latest.current = { round, startNew };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { round: r, startNew: fresh } = latest.current;
      if (event.key === 'Enter' && r.result && !(editable(event.target) && !r.result)) { event.preventDefault(); r.next(); return; }
      if (event.key === 'Enter' && !r.current && !editable(event.target)) { event.preventDefault(); fresh(); return; }
      if (editable(event.target)) return;
      if ((event.key === ' ' || event.key.toLowerCase() === 'r') && r.current) { event.preventDefault(); r.replay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const { deck, current, result, misses, finished, index } = round;
  const unit = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'sound' : 'sounds'}`;
  const uniqueMisses = [...new Map(misses.map(m => [m.sound.id, m])).values()];
  return <>
    <GameSetup summary={pool.length ? `${unit(roundLength)} of ${pool.length.toLocaleString('en-US')}` : 'No sounds match'}
      action={<Button onClick={startNew} disabled={!pool.length} aria-label={`${deck ? 'Restart' : 'Start'} · ${unit(roundLength)}`}><Play />{deck ? 'Restart' : 'Start listening'}</Button>}
      filters={<DraftFilterForm applied={filters} active={active} count={pool.length} showCount={false} autoApply onApply={onFilters} onClear={() => { const empty: DrillFilters = { initial: '', final: '' }; onFilters(empty); return empty; }}>
      {({ draft, patch }) => <>
        <InitialSelect value={draft.initial} onChange={initial => patch({ initial })} />
        <FinalSelect value={draft.final} onChange={final => patch({ final })} />
      </>}
    </DraftFilterForm>}>
      <select className="filter-select" aria-label="Round size" value={size} onChange={e => onSize(Number(e.target.value) as RoundSize)}>
        {ROUND_SIZES.map(n => <option key={n} value={n}>{n} sounds</option>)}
      </select>
      <label className="pinyin-slow"><Switch checked={slow} onCheckedChange={onSlow} aria-label="Slower pronunciation" />Slower</label>
    </GameSetup>
    {!deck ? <section className="game-ready pinyin-drill-ready" role="status">
      <h2>{pool.length ? 'Ready when you are.' : 'No sounds in this selection.'}</h2>
      {pool.length > 0 && <p>{prompt}</p>}
    </section> : finished ? <div className="flash-stage"><div className="flash-result pinyin-round-result">
      <div className="eyebrow">{round.review ? 'REVIEW COMPLETE' : 'ROUND COMPLETE'}</div>
      <strong>{deck.length - uniqueMisses.length} / {deck.length}</strong>
      <p>{uniqueMisses.length ? 'These deserve another listen — tap one to hear it:' : 'A perfect round — well done.'}</p>
      {uniqueMisses.length > 0 && <ul className="pinyin-missed" aria-label="Missed sounds">{uniqueMisses.map(m => <li key={m.sound.id}>
        <Button variant="ghost" size="sm" className={player.playing === m.sound.id ? 'is-playing' : ''} onClick={() => void player.play(m.sound)} aria-label={`Hear ${toneMark(m.sound.base, m.sound.tone)}`}><Volume2 /><strong className="pinyin" lang="zh-Latn-pinyin">{toneMark(m.sound.base, m.sound.tone)}</strong></Button>
        <span>{TONE_NAMES[m.sound.tone]} · you chose <span lang="zh-Latn-pinyin">{describeChoice(m)}</span></span>
      </li>)}</ul>}
      {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
      <div className="flex gap-2 flex-wrap justify-center">
        {uniqueMisses.length > 0 && <Button onClick={startReview}><RotateCcw />New round with {uniqueMisses.length} missed</Button>}
        <Button variant="outline" onClick={startNew} disabled={!pool.length}><Shuffle />New round</Button>
      </div>
    </div></div> : current && <section className="pinyin-drill" aria-label="Question">
      <div className="flash-meta"><span>Sound {index + 1} of {deck.length}{round.review ? ' · review' : ''}</span><span>{misses.length} wrong</span></div>
      <div className="flash-progress"><span style={{ width: `${(index / (deck.length || 1)) * 100}%` }} /></div>
      <div className="pinyin-drill-listen">
        <Button variant="outline" className={`pinyin-listen-button${player.playing === current.id ? ' is-playing' : ''}`} onClick={round.replay} aria-label="Hear it again"><Volume2 /></Button>
        <div><p className="pinyin-drill-prompt">{prompt}</p><p className="pinyin-drill-keys">Space hears it again · Enter for the next sound</p></div>
      </div>
      {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
      {children}
      <div className="pinyin-drill-feedback" aria-live="polite">{result && <>
        <span className={result.correct ? 'pinyin-right' : 'pinyin-wrong'}>{result.correct ? <Check /> : <X />}{result.correct ? 'Right' : 'Not quite'}</span>
        <span>It was <strong className="pinyin" lang="zh-Latn-pinyin">{toneMark(current.base, current.tone)}</strong> · {TONE_NAMES[current.tone]}</span>
        {footer}
        <Button size="sm" onClick={round.next} className="pinyin-next">{index + 1 >= deck.length ? 'See results' : 'Next sound'}<ArrowRight /></Button>
      </>}</div>
    </section>}
  </>;
}

/** Round size choice, local to the open game page; it applies to the next round. */
function useRoundSize() { return useState<RoundSize>(10); }

export function ToneDrill(props: DrillProps) {
  const pool = useMemo(() => drillPool(props.data, 'tones', props.filters), [props.data, props.filters]);
  const [size, setSize] = useRoundSize();
  const drill = useRound(props.player);
  const { current, result } = drill;
  const choose = (tone: Tone) => { if (current) drill.answer(tone === current.tone, String(tone)); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (editable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return; const t = Number(event.key); if (t >= 1 && t <= 4) { event.preventDefault(); choose(t as Tone); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return <DrillFrame mode="tones" {...props} pool={pool} round={drill} size={size} onSize={setSize} describeChoice={m => toneMark(m.sound.base, Number(m.choice) as Tone)} prompt={current ? `Which tone is “${current.base}”?` : 'Hear a syllable, then pick its tone.'}>
    {current && <div className="pinyin-options pinyin-tone-options" role="group" aria-label="Tones">{SPOKEN_TONES.map(t => {
      const state = !result ? '' : t === current.tone ? ' is-answer' : String(t) === result.choice ? ' is-wrong' : '';
      return <button key={t} type="button" className={`pinyin-option${state}`} disabled={Boolean(result)} onClick={() => choose(t)}>
        <ToneContour tone={t} /><strong lang="zh-Latn-pinyin">{toneMark(current.base, t)}</strong><small>{t} · {TONE_NAMES[t]}</small>
      </button>;
    })}</div>}
  </DrillFrame>;
}

export function SoundAlikeDrill(props: DrillProps) {
  const pool = useMemo(() => drillPool(props.data, 'alikes', props.filters), [props.data, props.filters]);
  const [size, setSize] = useRoundSize();
  const drill = useRound(props.player);
  const { current, result } = drill;
  // Up to three real alternatives in the same tone, shuffled once per sound.
  const options = useMemo(() => current ? shuffle([current.base, ...shuffle(soundAlikes(props.data, current.base, current.tone)).slice(0, 3)]) : [], [current, props.data]);
  const choose = (base: string) => { if (current) drill.answer(base === current.base, base); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (editable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return; const i = Number(event.key) - 1; if (i >= 0 && i < options.length) { event.preventDefault(); choose(options[i]!); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return <DrillFrame mode="alikes" {...props} pool={pool} round={drill} size={size} onSize={setSize} describeChoice={m => toneMark(m.choice, m.sound.tone)} prompt={current ? 'Which one did you hear?' : 'Hear a syllable, then pick it from sounds that are easy to mix up.'}
    footer={result && <span className="pinyin-compare">Compare:{options.map(base => <Button key={base} variant="ghost" size="sm" className={props.player.playing === `${base}${current!.tone}` ? 'is-playing' : ''} onClick={() => void props.player.play(sound(base, current!.tone))}><Volume2 /><span lang="zh-Latn-pinyin">{toneMark(base, current!.tone)}</span></Button>)}</span>}>
    {current && <div className="pinyin-options" role="group" aria-label="Spellings">{options.map((base, index) => {
      const state = !result ? '' : base === current.base ? ' is-answer' : base === result.choice ? ' is-wrong' : '';
      return <button key={base} type="button" className={`pinyin-option${state}`} disabled={Boolean(result)} onClick={() => choose(base)}>
        <strong lang="zh-Latn-pinyin">{toneMark(base, current.tone)}</strong><small>{index + 1}</small>
      </button>;
    })}</div>}
  </DrillFrame>;
}

const typedPrompts: Partial<Record<TypedVerdict, string>> = { 'missing-tone': 'Add the tone: a number (ma3) or a mark (mǎ).', invalid: 'That isn’t a pinyin syllable. Use letters, then a tone number or mark; v stands for ü.' };

export function TypeDrill(props: DrillProps) {
  const pool = useMemo(() => drillPool(props.data, 'type', props.filters), [props.data, props.filters]);
  const [size, setSize] = useRoundSize();
  const drill = useRound(props.player);
  const { current, result } = drill;
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');
  const [typed, setTyped] = useState<PinyinSound | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(''); setHint(''); setTyped(null); if (current) input.current?.focus(); }, [current]);
  const submit = () => {
    if (!current || result) return;
    const { verdict, parsed } = checkTyped(text, current.base, current.tone);
    if (!isScored(verdict)) { setHint(typedPrompts[verdict] ?? ''); return; }
    setHint('');
    // Offer "hear what you typed" only when that exact sound has a recording.
    setTyped(parsed?.tone && verdict !== 'correct' && findSyllable(props.data, parsed.base) && hasRecording(props.data, parsed.base, parsed.tone) ? sound(parsed.base, parsed.tone) : null);
    drill.answer(verdict === 'correct', text);
  };
  const verdictNote = result && !result.correct ? (() => { const { verdict, parsed } = checkTyped(result.choice, current!.base, current!.tone); return verdict === 'wrong-tone' ? `Right syllable, wrong tone: you wrote ${toneMark(parsed!.base, parsed!.tone!)}.` : parsed?.tone ? `You wrote ${toneMark(parsed.base, parsed.tone)}.` : null; })() : null;
  return <DrillFrame mode="type" {...props} pool={pool} round={drill} size={size} onSize={setSize} describeChoice={m => { const { parsed } = checkTyped(m.choice, m.sound.base, m.sound.tone); return parsed?.tone ? toneMark(parsed.base, parsed.tone) : m.choice; }} prompt={current ? 'Type what you hear, with its tone.' : 'Hear a syllable, then type it in pinyin.'}
    footer={result && <>{verdictNote && <span>{verdictNote}</span>}<span className="pinyin-compare"><Button variant="ghost" size="sm" onClick={drill.replay}><Volume2 />Answer</Button>{typed && <Button variant="ghost" size="sm" onClick={() => void props.player.play(typed)}><Volume2 />What you typed</Button>}</span></>}>
    {current && <form className="pinyin-type-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <input ref={input} className="pinyin-type-input" aria-label="Your answer in pinyin" placeholder="e.g. ren2 or rén" autoComplete="off" autoCapitalize="off" spellCheck={false} value={text} disabled={Boolean(result)} onChange={e => { setText(e.target.value); setHint(''); }} />
      {!result && <Button type="submit" disabled={!text.trim()}><Check />Check</Button>}
      <p className={`pinyin-type-hint${hint ? ' is-prompt' : ''}`}>{hint || 'Numbers 1–4 or tone marks both work · v = ü'}</p>
    </form>}
  </DrillFrame>;
}
