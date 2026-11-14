import { MeaningText } from './meaning-text';
import { useEffect, useRef, useState } from 'react';
import type HanziWriter from 'hanzi-writer';
import { ArrowRight, Eye, EyeOff, Play, RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import { PracticeIcon } from './practice-icons';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { loadStrokeGeometry } from '@/lib/character-enrichment';
import { characterAudioRequest } from '@/lib/catalog-store';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { audioCandidates, audioMessage, playPronunciation } from '@/lib/audio';
import { drawingWordClues, type DrawingCard, type DrawingResult } from '@/lib/drawing-game';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import type { DrawingBoardSnapshot } from './drawing-session';
import { usePerfectCelebration } from './perfect-celebration';

function writerColor(token: string) {
  const canvas = document.createElement('canvas').getContext('2d');
  if (!canvas) return undefined;
  canvas.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  canvas.fillRect(0, 0, 1, 1);
  return `#${Array.from(canvas.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * One drawing card. Inputs: the card, `onFinish` (Next card / Enter: the card's result moves on),
 * `onSettle` (fires the moment the card is answered — drawn or passed — so the game's counter and
 * progress update before Next card), and the restored snapshot / Practice hand-off.
 * Once answered, Show guide is disabled (nothing left to guide) and Replay strokes animates the
 * recorded stroke order of the same Hanzi Writer data; Enter moves to the next card.
 */
export function DrawingBoard({ entry, onFinish, onSettle, restored, onPractice }: { entry: DrawingCard; onFinish: (result: DrawingResult) => void; onSettle?: (result: DrawingResult) => void; restored?: DrawingBoardSnapshot | undefined; onPractice?: (snapshot: DrawingBoardSnapshot) => void }) {
  const { theme, preferences } = useWorkspace();
  const { celebrate, effect: celebration } = usePerfectCelebration(preferences.confetti !== false);
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const settled = useRef(false);
  const [state, setState] = useState<'loading' | 'drawing' | DrawingResult>('loading');
  const [mistakes, setMistakes] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [retry, setRetry] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [guide, setGuide] = useState(false);
  const guideRef = useRef(false); guideRef.current = guide;
  const guideUsed = useRef(false);
  // Only read the saved terminal snapshot on mount, not when Practice saves it.
  const initialSnapshot = useRef(restored);
  const prompt = entry.word ?? entry;
  const request = { ...characterAudioRequest(prompt.hanzi, prompt.pinyin), audio: entry.word?.audio ?? null };
  const audioAvailable = usePronunciationAvailability(audioCandidates(request).some(candidate => candidate.kind === 'recording'), prompt.pinyin);

  useEffect(() => {
    const node = target.current; if (!node) return;
    let active = true;
    let instance: HanziWriter | null = null;
    settled.current = false; setState('loading'); setMistakes(0); setProgress({ completed: 0, total: 0 });
    node.innerHTML = '';
    Promise.all([import('hanzi-writer'), loadStrokeGeometry(entry.hanzi)]).then(([{ default: Writer }, { data }]) => {
      if (!active) return;
      const ink = writerColor('--primary');
      instance = Writer.create(node, entry.hanzi, {
        width: 300, height: 300, padding: 22, showCharacter: false, showOutline: false,
        ...(ink ? { strokeColor: ink, drawingColor: ink, radicalColor: ink } : {}),
        drawingWidth: 6, charDataLoader: (_glyph, onLoad) => onLoad(data),
      });
      writer.current = instance;
      const snapshot = initialSnapshot.current;
      if (snapshot) {
        settled.current = true; setState(snapshot.result); setMistakes(snapshot.mistakes);
        setProgress(snapshot.progress); setGuide(snapshot.guide);
        if (snapshot.guide) instance.showOutline();
        if (snapshot.result !== 'unavailable') void instance.showCharacter({ duration: 0 });
        return;
      }
      if (guideRef.current) instance.showOutline();
      setProgress({ completed: 0, total: data.strokes.length }); setState('drawing');
      void instance.quiz({
        showHintAfterMisses: false, markStrokeCorrectAfterMisses: false, highlightOnComplete: false,
        onMistake: () => {
          if (!active || settled.current) return;
          setMistakes(count => count + 1);
        },
        onCorrectStroke: stroke => {
          if (active && !settled.current) setProgress({ completed: stroke.strokeNum + 1, total: data.strokes.length });
        },
        onComplete: ({ totalMistakes }: { totalMistakes?: number } = {}) => {
          if (!active || settled.current) return;
          if (totalMistakes === 0) celebrate(100);
          settled.current = true; setState(guideUsed.current || guideRef.current ? 'guided' : 'correct');
        },
      });
    }).catch(() => { if (active) { settled.current = true; setState('unavailable'); } });
    return () => { active = false; instance?.cancelQuiz(); writer.current = null; node.innerHTML = ''; };
  }, [entry.hanzi, retry, theme]);

  const finish = (result: DrawingResult) => {
    settled.current = true; writer.current?.cancelQuiz(); onFinish(result);
  };
  const pass = () => {
    if (state === 'unavailable') { finish('unavailable'); return; }
    settled.current = true; writer.current?.cancelQuiz();
    void writer.current?.showCharacter({ duration: 0 }); setState('passed');
  };
  const toggleGuide = () => {
    const next = !guide; setGuide(next); if (next && !settled.current) guideUsed.current = true;
    if (next) writer.current?.showOutline(); else writer.current?.hideOutline();
  };
  const message = state === 'loading' ? 'Loading writing data…' : state === 'guided' ? 'Completed with the guide shown — this card goes into review.' : state === 'correct' ? `Completed${mistakes ? ` · ${mistakes} ${mistakes === 1 ? 'retry' : 'retries'}` : ' · no errors'}.`
    : state === 'passed' ? 'Card passed — here is the solution.' : state === 'unavailable' ? 'No writing data available for this form. It won’t count as a mistake.'
    : mistakes ? 'Try that stroke again.' : 'Ready.';
  const answered = state === 'correct' || state === 'guided' || state === 'passed';
  // Report the answer as soon as it exists (also when restored after Practice), not on Next card.
  const settleRef = useRef(onSettle); settleRef.current = onSettle;
  useEffect(() => { if (state === 'correct' || state === 'guided' || state === 'passed') settleRef.current?.(state); }, [state]);
  // Enter = Next card once the card is answered. Focused buttons, links and fields keep their own
  // Enter (e.g. the End confirmation's autofocused "Yes, end"), so it never fires twice.
  const latest = useRef({ ready: false, next: () => {} });
  latest.current = { ready: answered || state === 'unavailable', next: () => finish(state === 'unavailable' ? 'unavailable' : state as DrawingResult) };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(input|textarea|select|button|a)$/i.test(el.tagName))) return;
      if (!latest.current.ready) return;
      event.preventDefault(); latest.current.next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const replay = () => { void writer.current?.animateCharacter(); };
  return <section className="drawing-board">
    <div className="drawing-prompt">
      <div className="flash-pinyin-row">{!entry.word && Array.from(prompt.hanzi).length === 1 && isMultiReading(prompt.pinyin) ? <MultiReadingSpeakers spoken={prompt.hanzi} reading={prompt.pinyin} variant="header" textClassName="pinyin flash-pinyin" onError={message => setAudioError(Boolean(message))}/> : <><span className="pinyin flash-pinyin">{prompt.pinyin}</span><Button variant="ghost" size="icon" disabled={!audioAvailable} className={audioAvailable ? '' : 'audio-tts-only'} aria-label="Listen to prompt" title="Listen to pronunciation" onClick={async () => setAudioError(Boolean(audioMessage(await playPronunciation(request, preferences.slow))))}><Volume2/></Button></>}</div>
      <p className="drawing-meaning"><MeaningText text={prompt.meaning}/></p>
      {audioError && <p className="meaning-missing" role="status">Audio isn’t available in this browser.</p>}
    </div>
    {/* The meta row and the canvas share one column so Show guide and the stroke count line up with the square's edges. */}
    <div className={entry.word ? 'drawing-word-layout' : undefined}>
      <div className="drawing-canvas-column">
    <div className="drawing-board-meta"><Button variant="ghost" size="sm" disabled={state !== 'drawing'} onClick={toggleGuide}>{guide ? <EyeOff/> : <Eye/>}{guide ? 'Hide guide' : 'Show guide'}</Button><span>{progress.total ? `${progress.completed} / ${progress.total} strokes` : '—'}</span></div>
      <div className="writing-grid drawing-grid">{celebration}<div ref={target} className="hanzi-target" role="img" aria-label="Hanzi drawing area"/>{state === 'loading' && <span className="writer-message">Loading…</span>}</div>
      </div>
      {entry.word && <aside className="drawing-word-context" aria-label="Word characters"><span className="eyebrow">WORD</span><ol className="drawing-word-characters">{drawingWordClues(entry).map(clue => <li key={clue.index} className="drawing-word-clue" aria-current={clue.selected ? 'true' : undefined} aria-label={clue.selected ? `Character ${clue.index + 1} · draw this character` : undefined}><span className="pinyin drawing-character-pinyin">{clue.pinyin}</span><div className={`drawing-word-character${clue.selected ? ' is-selected' : ''}`}><span lang="zh-CN">{clue.glyph}</span><small>{clue.index + 1}</small></div></li>)}</ol></aside>}
    </div>
    <p className={`drawing-status${state === 'correct' || state === 'guided' ? ' is-correct' : ''}`} role="status">{message}</p>
    <div className="drawing-actions">
      {state === 'drawing' && <Button variant="outline" size="icon" aria-label="Reset drawing" title="Reset drawing" onClick={() => setRetry(value => value + 1)}><RotateCcw/></Button>}
      {state === 'unavailable' && <Button variant="outline" onClick={() => setRetry(value => value + 1)}><RotateCcw/>Try again</Button>}
      {!answered && state !== 'unavailable' && <Button variant="outline" onClick={pass}><SkipForward/>Pass card</Button>}
      {answered && <Button variant="outline" onClick={replay}><Play/>Replay strokes</Button>}
      <Button variant="outline" asChild><Link to="/strokes" onClick={() => {
        // Seeing Practice reveals the answer: an unfinished attempt returns as
        // passed, without advancing or falsely awarding a correct answer.
        onPractice?.({ result: answered || state === 'unavailable' ? state as DrawingResult : 'passed', mistakes, progress, guide });
      }} search={entry.word ? { character: entry.word.hanzi, mode: 'trace', ...(entry.characterIndex ? { focus: entry.characterIndex } : {}) } : { character: entry.hanzi, mode: 'trace', ...(entry.radicalVariant ? { family: entry.kangxiIndex, variant: entry.radicalVariant } : {}) }}><PracticeIcon/>Practice</Link></Button>
      {(answered || state === 'unavailable') && <Button onClick={() => finish(state === 'unavailable' ? 'unavailable' : state as DrawingResult)}>Next card<ArrowRight/></Button>}
    </div>
  </section>;
}