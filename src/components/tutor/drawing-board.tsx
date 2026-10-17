import { useEffect, useRef, useState } from 'react';
import type HanziWriter from 'hanzi-writer';
import { ArrowRight, EyeOff, RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadStrokeGeometry } from '@/lib/character-enrichment';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import type { LibraryEntry } from '@/lib/character-library';
import { mistakeOutcome, type DrawingResult } from '@/lib/drawing-game';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';

function writerColor(token: string) {
  const canvas = document.createElement('canvas').getContext('2d');
  if (!canvas) return undefined;
  canvas.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  canvas.fillRect(0, 0, 1, 1);
  return `#${Array.from(canvas.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

export function DrawingBoard({ entry, allowErrors, onFinish }: { entry: LibraryEntry; allowErrors: boolean; onFinish: (result: DrawingResult) => void }) {
  const { theme, preferences } = useWorkspace();
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const allowRef = useRef(allowErrors); allowRef.current = allowErrors;
  const settled = useRef(false);
  const [state, setState] = useState<'loading' | 'drawing' | DrawingResult>('loading');
  const [mistakes, setMistakes] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [retry, setRetry] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const recording = characterRecording(entry.hanzi, entry.pinyin);
  const audioAvailable = usePronunciationAvailability(Boolean(recording), entry.pinyin);

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
      setProgress({ completed: 0, total: data.strokes.length }); setState('drawing');
      void instance.quiz({
        showHintAfterMisses: false, markStrokeCorrectAfterMisses: false, highlightOnComplete: false,
        onMistake: () => {
          if (!active || settled.current) return;
          setMistakes(count => count + 1);
          if (mistakeOutcome(allowRef.current) === 'missed') {
            settled.current = true; instance?.cancelQuiz();
            void instance?.showCharacter({ duration: 0 }); setState('missed');
          }
        },
        onCorrectStroke: stroke => {
          if (active && !settled.current) setProgress({ completed: stroke.strokeNum + 1, total: data.strokes.length });
        },
        onComplete: () => {
          if (!active || settled.current) return;
          settled.current = true; setState('correct');
        },
      });
    }).catch(() => { if (active) { settled.current = true; setState('unavailable'); } });
    return () => { active = false; instance?.cancelQuiz(); writer.current = null; node.innerHTML = ''; };
  }, [entry.hanzi, retry, theme]);

  const finish = (result: DrawingResult) => {
    settled.current = true; writer.current?.cancelQuiz(); onFinish(result);
  };
  const message = state === 'loading' ? 'Loading writing data…' : state === 'correct' ? `Completed${mistakes ? ` · ${mistakes} ${mistakes === 1 ? 'retry' : 'retries'}` : ' · no errors'}.`
    : state === 'missed' ? 'Not quite — this card goes into review.' : state === 'unavailable' ? 'No writing data available for this form. It won’t count as a mistake.'
    : mistakes ? 'Try that stroke again. The guide stays hidden.' : 'Ready.';
  const answered = state === 'correct' || state === 'missed';
  return <section className="drawing-board">
    <div className="drawing-prompt">
      <div className="flash-pinyin-row"><span className="pinyin flash-pinyin">{entry.pinyin}</span><Button variant="ghost" size="icon" disabled={!audioAvailable} className={audioAvailable ? '' : 'audio-tts-only'} aria-label="Listen to prompt" title="Listen to pronunciation" onClick={async () => setAudioError(Boolean(await playCharacter(entry.hanzi, preferences.slow, entry.pinyin)))}><Volume2/></Button></div>
      <p className="drawing-meaning">{entry.meaning}</p>
      {audioError && <p className="meaning-missing" role="status">Audio isn’t available in this browser.</p>}
    </div>
    <div className="drawing-board-meta"><span className="eyebrow"><EyeOff size={13}/>GUIDE HIDDEN</span><span>{progress.total ? `${progress.completed} / ${progress.total} strokes` : '—'}</span></div>
    <div className="writing-grid drawing-grid"><div ref={target} className="hanzi-target" role="img" aria-label="Hanzi drawing area"/>{state === 'loading' && <span className="writer-message">Loading…</span>}</div>
    <p className={`drawing-status${state === 'correct' ? ' is-correct' : state === 'missed' ? ' is-missed' : ''}`} role="status">{message}</p>
    {answered && <div className="drawing-answer"><span lang="zh-CN">{entry.hanzi}</span><span>{state === 'correct' ? 'Correct' : 'Answer'}</span></div>}
    <div className="drawing-actions">
      {state === 'drawing' && <Button variant="outline" size="icon" aria-label="Reset drawing" title="Reset drawing" onClick={() => setRetry(value => value + 1)}><RotateCcw/></Button>}
      {state === 'unavailable' && <Button variant="outline" onClick={() => setRetry(value => value + 1)}><RotateCcw/>Try again</Button>}
      {!answered && <Button variant="outline" onClick={() => finish(state === 'unavailable' ? 'unavailable' : 'passed')}><SkipForward/>Pass card</Button>}
      {(answered || state === 'unavailable') && <Button onClick={() => finish(state === 'correct' ? 'correct' : state === 'missed' ? 'missed' : 'unavailable')}>Next card<ArrowRight/></Button>}
    </div>
  </section>;
}