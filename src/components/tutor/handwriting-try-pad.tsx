import { useEffect, useRef, useState } from 'react';
import type HanziWriter from 'hanzi-writer';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadStrokeGeometry } from '@/lib/character-enrichment';
import { leniency } from '@/lib/handwriting-strictness';
import { practiceModeOptions } from '@/lib/practice-mode';
import { useWorkspace } from './workspace';

/**
 * HandwritingTryPad — a small Settings sandbox for feeling the current
 * handwriting strictness before using it in Practice (the handwriting
 * counterpart of "Try audio").
 *
 * Inputs: none; reads Trace/Recall strictness and theme from the workspace.
 * State: the local Trace/Recall switch (not saved — Settings only), and
 * per-stroke results for the current attempt.
 *
 * Trace shows the outline and uses Trace strictness; Recall hides it and uses
 * Recall strictness, mirroring Practice's own mode options. A stroke "passes"
 * when it is accepted on the first try and "fails" when it needed retries.
 * Changing either strictness select, the switch or the theme rebuilds the
 * quiz, so the next drag is always judged by what the selects show.
 * Geometry comes only from the recorded Hanzi Writer data for 大.
 */
const TRY_GLYPH = '大';

function cssHex(token: string) {
  const canvas = document.createElement('canvas').getContext('2d');
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!canvas || !value) return undefined;
  canvas.fillStyle = value; canvas.fillRect(0, 0, 1, 1);
  return `#${Array.from(canvas.getImageData(0, 0, 1, 1).data).slice(0, 3).map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function HandwritingTryPad() {
  const { preferences, theme } = useWorkspace();
  const [mode, setMode] = useState<'trace' | 'recall'>('trace');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'loading' | 'drawing' | 'done' | 'unavailable'>('loading');
  // One entry per stroke: undefined = not yet drawn, true = first-try pass, false = needed retries.
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  const target = useRef<HTMLDivElement>(null);
  const strictness = leniency(mode === 'recall' ? preferences.recallLeniency : preferences.traceLeniency);

  useEffect(() => {
    const node = target.current; if (!node) return;
    let active = true;
    let instance: HanziWriter | null = null;
    node.innerHTML = ''; setState('loading'); setResults([]);
    Promise.all([import('hanzi-writer'), loadStrokeGeometry(TRY_GLYPH)]).then(([{ default: Writer }, { data }]) => {
      if (!active) return;
      const ink = cssHex('--primary'); const outline = cssHex('--writer-outline');
      const options = practiceModeOptions(mode);
      instance = Writer.create(node, TRY_GLYPH, {
        width: 200, height: 200, padding: 15, showCharacter: false, showOutline: options.showOutline,
        ...(ink ? { strokeColor: ink, drawingColor: ink, radicalColor: ink } : {}),
        ...(outline ? { outlineColor: outline } : {}),
        drawingWidth: 6, charDataLoader: (_glyph, onLoad) => onLoad(data),
      });
      setResults(Array.from({ length: data.strokes.length }, () => undefined)); setState('drawing');
      void instance.quiz({
        ...options, leniency: strictness, markStrokeCorrectAfterMisses: false,
        onCorrectStroke: ({ strokeNum, mistakesOnStroke }) => {
          if (active) setResults(list => list.map((value, index) => index === strokeNum ? mistakesOnStroke === 0 : value));
        },
        onComplete: () => { if (active) setState('done'); },
      });
    }).catch(() => { if (active) setState('unavailable'); });
    return () => { active = false; instance?.cancelQuiz(); node.innerHTML = ''; };
  }, [mode, strictness, theme, attempt]);

  const passed = results.filter(value => value === true).length;
  const status = state === 'loading' ? 'Loading…' : state === 'unavailable' ? 'Writing data couldn’t load.'
    : state === 'done' ? `${passed} of ${results.length} strokes passed on the first try.`
    : mode === 'trace' ? 'Trace 大 over the outline, stroke by stroke.' : 'Write 大 from memory, stroke by stroke.';

  return <div className="try-pad">
    <div className="writer-speed-options try-pad-modes" role="group" aria-label="Strictness to test">
      {(['trace', 'recall'] as const).map(option => <button key={option} type="button" className={mode === option ? 'active' : ''} aria-pressed={mode === option} onClick={() => setMode(option)}>{option === 'trace' ? 'Trace' : 'Recall'}</button>)}
    </div>
    <div className="writing-grid try-pad-grid"><div ref={target} className="hanzi-target" role="img" aria-label={`Try writing ${TRY_GLYPH}`}/></div>
    <ol className="try-pad-strokes" aria-label="Stroke results">
      {results.map((value, index) => <li key={index} className={value === undefined ? '' : value ? 'is-pass' : 'is-fail'}>
        {value === undefined ? <span aria-hidden="true">·</span> : value ? <Check aria-hidden="true"/> : <X aria-hidden="true"/>}
        <span>Stroke {index + 1}{value === undefined ? '' : value ? ' · pass' : ' · fail'}</span>
      </li>)}
    </ol>
    <p className="writer-status" role="status">{status}</p>
    <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}><RotateCcw/>Draw again</Button>
  </div>;
}
