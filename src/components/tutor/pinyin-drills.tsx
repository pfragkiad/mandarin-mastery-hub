// The three listening games of the Pinyin guide. Each plays one exact recording
// and asks for: its tone (Tone quiz), its spelling among real sound-alike
// syllables in the same tone (Sound-alikes), or the typed pinyin (Type what you
// hear). Inputs: loaded data, the shared player and URL-applied filters. Each game
// is a fixed round of 10, 20 or 50 random sounds (pinyin-round.ts). While playing, the
// setup collapses to a one-line bar; at the end the missed sounds are listed (each
// playable and tickable) and can be replayed alone or mixed into a new round.
// Local state only: the round's deck, position, answer and misses. Nothing is kept
// after the round. Filter changes and the round size affect the next round only.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Play, RotateCcw, SlidersHorizontal, Target, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { SPOKEN_TONES, TONE_NAMES, allSounds, checkTyped, finalFilterLabel, findSyllable, initialFilterLabel, hasRecording, isScored, matchesFinal, matchesInitial, soundAlikes, toneMark, type PinyinData, type PinyinSound, type Tone, type TypedVerdict } from '@/lib/pinyin-guide';
import { ROUND_SIZES, dealRound, mixedRound, reviewRound, shuffle, type RoundSize } from '@/lib/pinyin-round';
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
 * One round shared by all games. State: the dealt deck (null while the setup is shown),
 * the position, this question's answer, how many answers were given, the misses, the
 * missed sounds the learner unticked on the results, whether the round is finished, and
 * the one-line summary of the settings the round was dealt with (shown in the play bar).
 * `answer` scores once per sound; `next` moves on (or finishes after the last sound);
 * `finish` ends early with the answers so far; `quit` returns to the setup.
 */
function useRound(player: PinyinPlayer) {
  const [deck, setDeck] = useState<PinyinSound[] | null>(null);
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [label, setLabel] = useState('');
  const [result, setResult] = useState<{ correct: boolean; choice: string } | null>(null);
  const [answered, setAnswered] = useState(0);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const current = deck && !finished ? deck[index] ?? null : null;
  const begin = (dealt: PinyinSound[], isReview: boolean, roundLabel: string) => {
    setDeck(dealt); setIndex(0); setReview(isReview); setLabel(roundLabel); setResult(null); setAnswered(0); setMisses([]); setSkipped(new Set()); setFinished(false);
    if (dealt[0]) void player.play(dealt[0]);
  };
  const answer = (correct: boolean, choice: string) => {
    if (!current || result) return;
    setResult({ correct, choice });
    setAnswered(n => n + 1);
    if (!correct) setMisses(m => [...m, { sound: current, choice }]);
  };
  const finish = () => { player.stop(); setResult(null); setFinished(true); };
  const next = () => {
    if (!deck || !result) return;
    setResult(null);
    if (index + 1 >= deck.length) { finish(); return; }
    setIndex(index + 1);
    void player.play(deck[index + 1]!);
  };
  const quit = () => { player.stop(); setDeck(null); setResult(null); setFinished(false); };
  const toggleSkip = (id: string) => setSkipped(prev => { const out = new Set(prev); if (out.has(id)) out.delete(id); else out.add(id); return out; });
  return { deck, index, review, label, current, result, answered, misses, skipped, finished, begin, answer, next, finish, quit, toggleSkip, replay: () => { if (current) void player.play(current); } };
}
type Round = ReturnType<typeof useRound>;

type FrameProps = DrillProps & {
  mode: DrillMode; pool: PinyinSound[]; round: Round; size: RoundSize; onSize: (size: RoundSize) => void; prompt: string;
  /** Results line for a missed sound: what the learner chose ("You chose 1st tone"). */
  describeChoice: (miss: Miss) => string;
  /** Results line for a missed sound: the right answer ("Correct: 2nd"). */
  describeCorrect: (miss: Miss) => string;
  children: ReactNode; footer?: ReactNode;
};

/**
 * Screen shell shared by the three games, in three states:
 *  - setup (no deck): the full GameSetup card with Start listening;
 *  - playing: the setup collapses into one bar (round summary chip, Restart, End). The chip
 *    reopens the setup below the bar on demand; its changes only apply when restarting.
 *    End asks inline ("End now?") once an answer has been given, otherwise returns to setup;
 *  - results: score, answered count and the missed list with a tick per sound, then
 *    Practise missed (ticked only), New round + missed (ticked plus fresh sounds) and
 *    Change settings. Each new round lists only its own misses, so sounds answered right
 *    in a review drop off the list and nothing outlives the open page.
 * Keys: Space/R hear again, Enter next/start, Esc ends (Esc again keeps going).
 */
function DrillFrame({ mode, data, filters, onFilters, pool, round, size, onSize, slow, onSlow, player, prompt, describeChoice, describeCorrect, children, footer }: FrameProps) {
  const active = Boolean(filters.initial || filters.final);
  const roundLength = Math.min(size, pool.length);
  const [confirming, setConfirming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const unit = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'sound' : 'sounds'}`;
  const settingsLabel = `${initialFilterLabel(filters.initial)} · ${finalFilterLabel(filters.final)}`;
  const reset = () => { setConfirming(false); setSettingsOpen(false); };
  const startNew = () => { reset(); const dealt = dealRound(pool, size); round.begin(dealt, false, `${settingsLabel} · ${unit(dealt.length)}`); };
  const uniqueMisses = [...new Map(round.misses.map(m => [m.sound.id, m])).values()];
  const kept = uniqueMisses.filter(m => !round.skipped.has(m.sound.id)).map(m => m.sound);
  const startReview = () => { reset(); const dealt = reviewRound(kept); round.begin(dealt, true, `Review · ${unit(dealt.length)}`); };
  const startMixed = () => { reset(); const dealt = mixedRound(pool, size, kept); round.begin(dealt, false, `${settingsLabel} · ${unit(dealt.length)}`); };
  const requestEnd = () => { if (round.answered === 0) { reset(); round.quit(); } else setConfirming(true); };
  const confirmEnd = () => { reset(); round.finish(); };
  const changeSettings = () => { reset(); round.quit(); };
  const latest = useRef({ round, startNew, requestEnd, confirming });
  latest.current = { round, startNew, requestEnd, confirming };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { round: r, startNew: fresh, requestEnd: end, confirming: asking } = latest.current;
      if (event.key === 'Escape' && r.current) { event.preventDefault(); if (asking) setConfirming(false); else end(); return; }
      if (asking) return; // the inline confirmation's own buttons take Enter/Space
      if (event.key === 'Enter' && r.result) { event.preventDefault(); r.next(); return; }
      if (event.key === 'Enter' && !r.deck && !editable(event.target)) { event.preventDefault(); fresh(); return; }
      if (editable(event.target)) return;
      if ((event.key === ' ' || event.key.toLowerCase() === 'r') && r.current) { event.preventDefault(); r.replay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const { deck, current, result, misses, finished, index, answered } = round;
  const setup = (action?: ReactNode, summary?: ReactNode) => <GameSetup summary={summary}
    action={action}
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
  </GameSetup>;
  const poolSummary = pool.length ? `${unit(roundLength)} of ${pool.length.toLocaleString('en-US')}` : 'No sounds match';

  if (!deck) return <>
    {setup(<Button onClick={startNew} disabled={!pool.length} aria-label={`Start · ${unit(roundLength)}`}><Play />Start listening</Button>, poolSummary)}
    <section className="game-ready pinyin-drill-ready" role="status">
      <h2>{pool.length ? 'Ready when you are.' : 'No sounds in this selection.'}</h2>
      {pool.length > 0 && <p>{prompt}</p>}
    </section>
  </>;

  if (finished) {
    const correct = answered - new Set(misses.map(m => m.sound.id)).size;
    return <section className="pinyin-results" aria-label="Results">
      <div className="pinyin-results-eyebrow">{round.review ? 'Review complete' : answered < deck.length ? 'Session ended' : 'Session complete'}</div>
      <p className="pinyin-results-score"><strong>{correct} / {answered}</strong> correct</p>
      <p className="pinyin-results-sub">{answered} of {deck.length} answered{uniqueMisses.length ? ` · ${kept.length} to review` : ''}</p>
      {uniqueMisses.length > 0 ? <>
        <div className="pinyin-results-head"><span>Missed sounds</span><small>Untick any you want to skip</small></div>
        <ul className="pinyin-missed" aria-label="Missed sounds">{uniqueMisses.map(m => {
          const reading = toneMark(m.sound.base, m.sound.tone);
          return <li key={m.sound.id} className={round.skipped.has(m.sound.id) ? 'is-skipped' : ''}>
            <Checkbox checked={!round.skipped.has(m.sound.id)} onCheckedChange={() => round.toggleSkip(m.sound.id)} aria-label={`Review ${reading}`} />
            {/* Reading with the shared speaker beside it, as in every detail heading. */}
            <span className="pinyin-missed-reading example-pinyin-row">
              <strong className="pinyin" lang="zh-Latn-pinyin">{reading}</strong>
              <Button variant="ghost" size="icon" className={`example-listen${player.playing === m.sound.id ? ' is-playing' : ''}`} onClick={() => void player.play(m.sound)} aria-label={`Listen to ${reading}`} title="Listen · Recording"><Volume2 /></Button>
            </span>
            <span className="pinyin-missed-choice">{describeChoice(m)}</span>
            <span className="pinyin-missed-correct">{describeCorrect(m)}</span>
          </li>;
        })}</ul>
      </> : <p className="pinyin-results-perfect">{answered ? 'A perfect round — well done.' : 'No answers in this round.'}</p>}
      {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
      <div className="pinyin-results-actions">
        {uniqueMisses.length > 0 && <Button onClick={startReview} disabled={!kept.length}><Target />Practise missed ({kept.length})</Button>}
        <Button variant={uniqueMisses.length ? 'outline' : 'default'} onClick={startMixed} disabled={!pool.length && !kept.length}><Play />{kept.length ? 'New round + missed' : 'New round'}</Button>
        <Button variant="ghost" onClick={changeSettings}>Change settings</Button>
      </div>
      {uniqueMisses.length > 0 && <p className="pinyin-results-note">Sounds you get right in a review round drop off the missed list.</p>}
    </section>;
  }

  return <section className="pinyin-play" aria-label="Game">
    <div className="pinyin-play-bar">
      <button type="button" className="pinyin-play-chip" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(o => !o)} title="Change settings for the next round">
        <SlidersHorizontal />{round.label}{slow ? ' · Slower' : ''}
      </button>
      <div className="pinyin-play-actions">
        <Button variant="outline" onClick={round.review ? startReview : startNew} disabled={!round.review && !pool.length}><RotateCcw />Restart</Button>
        {confirming ? <span className="pinyin-play-confirm" role="group" aria-label="End this round?">
          <span>End now?</span>
          <Button variant="outline" className="pinyin-play-end-yes" onClick={confirmEnd} autoFocus>Yes, end</Button>
          <Button variant="outline" onClick={() => setConfirming(false)}>Keep going</Button>
        </span> : <Button variant="ghost" onClick={requestEnd}><X />End</Button>}
      </div>
    </div>
    {settingsOpen && setup(<Button onClick={startNew} disabled={!pool.length}><RotateCcw />Restart with these</Button>, `Changes apply to the next round · ${poolSummary}`)}
    {current && <div className="pinyin-drill">
      <div className="flash-meta"><span>Sound {index + 1} of {deck.length}{round.review ? ' · review' : ''}</span><span>{misses.length} wrong</span></div>
      <div className="flash-progress"><span style={{ width: `${(index / (deck.length || 1)) * 100}%` }} /></div>
      <div className="pinyin-drill-listen">
        <Button variant="outline" className={`pinyin-listen-button${player.playing === current.id ? ' is-playing' : ''}`} onClick={round.replay} aria-label="Hear it again"><Volume2 /></Button>
        <div><p className="pinyin-drill-prompt">{prompt}</p><p className="pinyin-drill-keys">Space hears it again · Enter for the next sound · Esc ends</p></div>
      </div>
      {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
      {children}
      <div className="pinyin-drill-feedback" aria-live="polite">{result && <>
        <span className={result.correct ? 'pinyin-right' : 'pinyin-wrong'}>{result.correct ? <Check /> : <X />}{result.correct ? 'Right' : 'Not quite'}</span>
        <span>It was <strong className="pinyin" lang="zh-Latn-pinyin">{toneMark(current.base, current.tone)}</strong> · {TONE_NAMES[current.tone]}</span>
        {footer}
        <Button size="sm" onClick={round.next} className="pinyin-next">{index + 1 >= deck.length ? 'See results' : 'Next sound'}<ArrowRight /></Button>
      </>}</div>
    </div>}
  </section>;
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
  return <DrillFrame mode="tones" {...props} pool={pool} round={drill} size={size} onSize={setSize} describeChoice={m => `You chose ${TONE_NAMES[Number(m.choice) as Tone]}`} describeCorrect={m => `Correct: ${TONE_NAMES[m.sound.tone].replace(' tone', '')}`} prompt={current ? `Which tone is “${current.base}”?` : 'Hear a syllable, then pick its tone.'}>
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
  return <DrillFrame mode="alikes" {...props} pool={pool} round={drill} size={size} onSize={setSize} describeChoice={m => `You chose ${toneMark(m.choice, m.sound.tone)}`} describeCorrect={m => `Correct: ${toneMark(m.sound.base, m.sound.tone)}`} prompt={current ? 'Which one did you hear?' : 'Hear a syllable, then pick it from sounds that are easy to mix up.'}
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
  return <DrillFrame mode="type" {...props} pool={pool} round={drill} size={size} onSize={setSize} describeChoice={m => { const { parsed } = checkTyped(m.choice, m.sound.base, m.sound.tone); return `You wrote ${parsed?.tone ? toneMark(parsed.base, parsed.tone) : m.choice}`; }} describeCorrect={m => `Correct: ${toneMark(m.sound.base, m.sound.tone)}`} prompt={current ? 'Type what you hear, with its tone.' : 'Hear a syllable, then type it in pinyin.'}
    footer={result && <>{verdictNote && <span>{verdictNote}</span>}<span className="pinyin-compare"><Button variant="ghost" size="sm" onClick={drill.replay}><Volume2 />Answer</Button>{typed && <Button variant="ghost" size="sm" onClick={() => void props.player.play(typed)}><Volume2 />What you typed</Button>}</span></>}>
    {current && <form className="pinyin-type-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <input ref={input} className="pinyin-type-input" aria-label="Your answer in pinyin" placeholder="e.g. ren2 or rén" autoComplete="off" autoCapitalize="off" spellCheck={false} value={text} disabled={Boolean(result)} onChange={e => { setText(e.target.value); setHint(''); }} />
      {!result && <Button type="submit" disabled={!text.trim()}><Check />Check</Button>}
      <p className={`pinyin-type-hint${hint ? ' is-prompt' : ''}`}>{hint || 'Numbers 1–4 or tone marks both work · v = ü'}</p>
    </form>}
  </DrillFrame>;
}
