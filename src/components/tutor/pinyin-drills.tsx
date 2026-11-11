// The three listening quizzes of the Pinyin guide. Each plays one exact
// recording and asks for: its tone (Tone quiz), its spelling among real
// sound-alike syllables in the same tone (Sound-alikes), or the typed pinyin
// (Type what you hear). Inputs: loaded data, progress + record callback, the
// shared player and URL-applied filters. Local state: the current sound, the
// answer given and this visit's score. Filter changes affect the next sound only.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Play, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SPOKEN_TONES, TONE_NAMES, allSounds, checkTyped, findSyllable, hasRecording, isScored, matchesFinal, matchesInitial, soundAlikes, toneMark, type PinyinData, type PinyinSound, type Tone, type TypedVerdict } from '@/lib/pinyin-guide';
import { filterByFocus, needsReview, pickNextSound, type PinyinProgress, type PracticeFocus } from '@/lib/pinyin-progress';
import { DraftFilterForm } from './filter-form';
import { GameSetup } from './game-setup';
import { FinalSelect, InitialSelect } from './pinyin-chart';
import { ToneContour, sound, type PinyinPlayer } from './pinyin-shared';

export type DrillMode = 'tones' | 'alikes' | 'type';
export type DrillFilters = { initial: string; final: string; focus: '' | 'review' | 'new' };
type DrillProps = { data: PinyinData; progress: PinyinProgress; record: (id: string, action: 'right' | 'wrong') => void; player: PinyinPlayer; filters: DrillFilters; onFilters: (filters: DrillFilters) => void; slow: boolean; onSlow: (slow: boolean) => void };

const editable = (target: EventTarget | null) => { const el = target as HTMLElement | null; return Boolean(el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))); };
const shuffle = <T,>(list: T[]) => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!]; } return out; };

/** Sounds a quiz may ask: every recorded sound matching the filters; Sound-alikes also needs at least one real alternative. */
export function drillPool(data: PinyinData, mode: DrillMode, filters: DrillFilters, progress: PinyinProgress): PinyinSound[] {
  const sounds = allSounds(data).filter(s => { const syllable = findSyllable(data, s.base); return syllable && matchesInitial(syllable, filters.initial) && matchesFinal(syllable, filters.final); });
  const usable = mode === 'alikes' ? sounds.filter(s => soundAlikes(data, s.base, s.tone).length > 0) : sounds;
  return filterByFocus(usable, progress, (filters.focus || 'all') as PracticeFocus);
}

/** Round state shared by all quizzes. `answer` scores once per sound; `next` picks with review weighting and plays it. */
function useDrill(pool: PinyinSound[], progress: PinyinProgress, record: DrillProps['record'], player: PinyinPlayer) {
  const [current, setCurrent] = useState<PinyinSound | null>(null);
  const [result, setResult] = useState<{ correct: boolean; choice: string } | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const next = () => {
    const picked = pickNextSound(pool, progress, current?.id);
    setCurrent(picked);
    setResult(null);
    if (picked) void player.play(picked);
  };
  const answer = (correct: boolean, choice: string) => {
    if (!current || result) return;
    record(current.id, correct ? 'right' : 'wrong');
    setResult({ correct, choice });
    setScore(s => ({ right: s.right + Number(correct), total: s.total + 1, streak: correct ? s.streak + 1 : 0 }));
  };
  return { current, result, score, next, answer, replay: () => { if (current) void player.play(current); } };
}

function DrillFrame({ mode, data, progress, filters, onFilters, pool, drill, slow, onSlow, player, prompt, children, footer }: Omit<DrillProps, 'record'> & { mode: DrillMode; pool: PinyinSound[]; drill: ReturnType<typeof useDrill>; prompt: string; children: ReactNode; footer?: ReactNode }) {
  const active = Boolean(filters.initial || filters.final || filters.focus);
  const reviewCount = useMemo(() => drillPool(data, mode, { ...filters, focus: '' }, progress).filter(s => needsReview(progress[s.id])).length, [data, mode, filters, progress]);
  // Enter = next sound once answered (or start); Space/R = hear it again.
  const latest = useRef(drill);
  latest.current = drill;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const d = latest.current;
      if (event.key === 'Enter' && (d.result || !d.current) && !(editable(event.target) && !d.result)) { event.preventDefault(); d.next(); return; }
      if (editable(event.target)) return;
      if ((event.key === ' ' || event.key.toLowerCase() === 'r') && d.current) { event.preventDefault(); d.replay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const { current, result, score } = drill;
  return <>
    <GameSetup summary={<>{pool.length ? `${pool.length.toLocaleString('en-US')} ${pool.length === 1 ? 'sound matches' : 'sounds match'}` : 'No sounds match'}{score.total > 0 && <span className="pinyin-score"> · {score.right} of {score.total} right{score.streak > 1 ? ` · ${score.streak} in a row` : ''}</span>}</>}
      action={!current ? <Button onClick={drill.next} disabled={!pool.length}><Play />Start listening</Button> : undefined}
      filters={<DraftFilterForm applied={filters} active={active} count={pool.length} showCount={false} autoApply onApply={onFilters} onClear={() => { const empty: DrillFilters = { initial: '', final: '', focus: '' }; onFilters(empty); return empty; }}>
      {({ draft, patch }) => <>
        <InitialSelect value={draft.initial} onChange={initial => patch({ initial })} />
        <FinalSelect value={draft.final} onChange={final => patch({ final })} />
        <select className="filter-select" aria-label="Which sounds" value={draft.focus} onChange={e => patch({ focus: e.target.value as DrillFilters['focus'] })}>
          <option value="">All sounds</option><option value="review">Needs review ({reviewCount})</option><option value="new">Not practised yet</option>
        </select>
      </>}
    </DraftFilterForm>}>
      <label className="pinyin-slow"><Switch checked={slow} onCheckedChange={onSlow} aria-label="Slower pronunciation" />Slower</label>
    </GameSetup>
    {!current ? <section className="game-ready pinyin-drill-ready" role="status">
      <h2>{pool.length ? 'Ready when you are.' : 'No sounds in this selection.'}</h2>
      {pool.length > 0 && <p>{prompt}</p>}
    </section> : <section className="pinyin-drill" aria-label="Question">
      <div className="pinyin-drill-listen">
        <Button variant="outline" className={`pinyin-listen-button${player.playing === current.id ? ' is-playing' : ''}`} onClick={drill.replay} aria-label="Hear it again"><Volume2 /></Button>
        <div><p className="pinyin-drill-prompt">{prompt}</p><p className="pinyin-drill-keys">Space hears it again · Enter for the next sound</p></div>
      </div>
      {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
      {children}
      <div className="pinyin-drill-feedback" aria-live="polite">{result && <>
        <span className={result.correct ? 'pinyin-right' : 'pinyin-wrong'}>{result.correct ? <Check /> : <X />}{result.correct ? 'Right' : 'Not quite'}</span>
        <span>It was <strong className="pinyin" lang="zh-Latn-pinyin">{toneMark(current.base, current.tone)}</strong> · {TONE_NAMES[current.tone]}</span>
        {footer}
        <Button size="sm" onClick={drill.next} className="pinyin-next">Next sound<ArrowRight /></Button>
      </>}</div>
    </section>}
  </>;
}

export function ToneDrill(props: DrillProps) {
  const pool = useMemo(() => drillPool(props.data, 'tones', props.filters, props.progress), [props.data, props.filters, props.progress]);
  const drill = useDrill(pool, props.progress, props.record, props.player);
  const { current, result } = drill;
  const choose = (tone: Tone) => { if (current) drill.answer(tone === current.tone, String(tone)); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (editable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return; const t = Number(event.key); if (t >= 1 && t <= 4) { event.preventDefault(); choose(t as Tone); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return <DrillFrame mode="tones" {...props} pool={pool} drill={drill} prompt={current ? `Which tone is “${current.base}”?` : 'Hear a syllable, then pick its tone.'}>
    {current && <div className="pinyin-options pinyin-tone-options" role="group" aria-label="Tones">{SPOKEN_TONES.map(t => {
      const state = !result ? '' : t === current.tone ? ' is-answer' : String(t) === result.choice ? ' is-wrong' : '';
      return <button key={t} type="button" className={`pinyin-option${state}`} disabled={Boolean(result)} onClick={() => choose(t)}>
        <ToneContour tone={t} /><strong lang="zh-Latn-pinyin">{toneMark(current.base, t)}</strong><small>{t} · {TONE_NAMES[t]}</small>
      </button>;
    })}</div>}
  </DrillFrame>;
}

export function SoundAlikeDrill(props: DrillProps) {
  const pool = useMemo(() => drillPool(props.data, 'alikes', props.filters, props.progress), [props.data, props.filters, props.progress]);
  const drill = useDrill(pool, props.progress, props.record, props.player);
  const { current, result } = drill;
  // Up to three real alternatives in the same tone, shuffled once per sound.
  const options = useMemo(() => current ? shuffle([current.base, ...shuffle(soundAlikes(props.data, current.base, current.tone)).slice(0, 3)]) : [], [current, props.data]);
  const choose = (base: string) => { if (current) drill.answer(base === current.base, base); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (editable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return; const i = Number(event.key) - 1; if (i >= 0 && i < options.length) { event.preventDefault(); choose(options[i]!); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return <DrillFrame mode="alikes" {...props} pool={pool} drill={drill} prompt={current ? 'Which one did you hear?' : 'Hear a syllable, then pick it from sounds that are easy to mix up.'}
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
  const pool = useMemo(() => drillPool(props.data, 'type', props.filters, props.progress), [props.data, props.filters, props.progress]);
  const drill = useDrill(pool, props.progress, props.record, props.player);
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
  return <DrillFrame mode="type" {...props} pool={pool} drill={drill} prompt={current ? 'Type what you hear, with its tone.' : 'Hear a syllable, then type it in pinyin.'}
    footer={result && <>{verdictNote && <span>{verdictNote}</span>}<span className="pinyin-compare"><Button variant="ghost" size="sm" onClick={drill.replay}><Volume2 />Answer</Button>{typed && <Button variant="ghost" size="sm" onClick={() => void props.player.play(typed)}><Volume2 />What you typed</Button>}</span></>}>
    {current && <form className="pinyin-type-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <input ref={input} className="pinyin-type-input" aria-label="Your answer in pinyin" placeholder="e.g. ren2 or rén" autoComplete="off" autoCapitalize="off" spellCheck={false} value={text} disabled={Boolean(result)} onChange={e => { setText(e.target.value); setHint(''); }} />
      {!result && <Button type="submit" disabled={!text.trim()}><Check />Check</Button>}
      <p className={`pinyin-type-hint${hint ? ' is-prompt' : ''}`}>{hint || 'Numbers 1–4 or tone marks both work · v = ü'}</p>
    </form>}
  </DrillFrame>;
}
