import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Brain, PenLine, Play, RotateCcw } from 'lucide-react';
import type HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { strokeExamples } from '@/lib/stroke-examples';
import { useWorkspace } from './workspace';
import { RecordDetailTitle } from './record-detail-title';
import { SPEEDS, DEFAULT_SPEED_INDEX } from './writing-practice';

const toHex = (value: string) => {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
  return `#${Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}`;
};

/** Watch and trace the real Hanzi Writer outline of one stroke, taken from an explicit representative character. */
export function StrokePractice({ glyph }: { glyph: string }) {
  const { catalogVersion, theme } = useWorkspace();
  const entry = libraryEntries('Strokes').find(item => item.hanzi === glyph);
  const example = strokeExamples[glyph];
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'idle' | 'watch' | 'trace' | 'memory'>('idle');
  const [message, setMessage] = useState('Loading stroke…');
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const speedRef = useRef(SPEEDS[speedIndex] ?? 0.5);
  speedRef.current = SPEEDS[speedIndex] ?? 0.5;

  useEffect(() => {
    if (!example || !target.current) return;
    let active = true;
    const node = target.current;
    node.innerHTML = ''; setReady(false); setMode('idle'); setMessage('Loading stroke…');
    import('hanzi-writer').then(({ default: Writer }) => {
      if (!active) return;
      const style = getComputedStyle(document.documentElement);
      const ink = toHex(style.getPropertyValue('--primary').trim());
      const outline = toHex(style.getPropertyValue('--writer-outline').trim());
      const accent = toHex(style.getPropertyValue('--terracotta').trim());
      writer.current = Writer.create(node, example.character, {
        width: 300, height: 300, padding: 22, strokeAnimationSpeed: speedRef.current, drawingWidth: 6,
        ...(ink ? { strokeColor: ink } : {}), ...(outline ? { outlineColor: outline } : {}), ...(accent ? { drawingColor: accent, highlightColor: accent } : {}),
        charDataLoader: (char, onLoad, onError) => {
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`)
            .then(res => (res.ok ? res.json() : Promise.reject(new Error('no data'))))
            .then((data: { strokes: string[]; medians: number[][][] }) => {
              const path = data.strokes[example.strokeIndex]; const median = data.medians[example.strokeIndex];
              if (!path || !median) throw new Error('missing stroke');
              onLoad({ strokes: [path], medians: [median] } as never);
            })
            .catch(err => onError(err));
        },
        onLoadCharDataSuccess: () => { if (active) { setReady(true); setMessage('Watch the stroke, then trace it in one movement.'); } },
        onLoadCharDataError: () => { if (active) setMessage('Stroke data couldn’t load. Please try again.'); },
      });
    }).catch(() => { if (active) setMessage('Writing practice couldn’t load.'); });
    return () => { active = false; writer.current?.cancelQuiz(); writer.current = null; node.innerHTML = ''; };
  }, [example, theme, Boolean(entry)]);

  const setSpeed = (instance: HanziWriter) => { (instance as unknown as { _options: { strokeAnimationSpeed: number } })._options.strokeAnimationSpeed = speedRef.current; };
  const watch = () => {
    const w = writer.current; if (!w) return;
    w.cancelQuiz(); setSpeed(w); setMode('watch'); setMessage('Watch the direction and where the stroke starts…');
    void w.animateCharacter({ onComplete: () => { setMode('idle'); setMessage('Now trace it yourself, or watch again.'); } });
  };
  const practice = (memory: boolean) => {
    const w = writer.current; if (!w) return;
    setMode(memory ? 'memory' : 'trace');
    if (memory) void w.hideOutline({ duration: 0 }); else void w.showOutline({ duration: 0 });
    setMessage(memory ? 'Write the stroke from memory.' : 'Trace the stroke over the outline.');
    void w.quiz({
      showHintAfterMisses: 2,
      onMistake: () => setMessage('Try again — check the starting point, direction and shape.'),
      onComplete: () => { setMode('idle'); void w.showOutline({ duration: 0 }); setMessage('Stroke complete! Trace again or try from memory.'); },
    });
  };
  const reset = () => { const w = writer.current; if (!w) return; w.cancelQuiz(); void w.showOutline({ duration: 0 }); void w.showCharacter({ duration: 0 }); setMode('idle'); setMessage('Ready. Watch the stroke or start another attempt.'); };

  if (!entry) return <p className="library-note">{catalogVersion ? 'This stroke is not in the library.' : 'Loading stroke data…'}</p>;
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">笔画 · STROKE PRACTICE</div><h1>Practice a stroke.</h1></div></div><div className="practice-layout">
    <section className="writing-tool"><div className="tool-top"><span className="eyebrow">WATCH · TRACE · REMEMBER</span></div>
      {example ? <>
        <div className="writing-grid"><div ref={target} className="hanzi-target" aria-label={`Stroke ${glyph} writing area`}/></div>
        <p className="writer-status" role="status">{message}</p>
        <div className="writer-controls">
          <Button variant="outline" size="sm" disabled={!ready || mode === 'watch'} onClick={watch}><Play/>Watch stroke</Button>
          <Button size="sm" disabled={!ready} onClick={() => practice(false)}><PenLine/>{mode === 'trace' ? 'Restart trace' : 'Trace stroke'}</Button>
          <Button variant="outline" size="sm" disabled={!ready} onClick={() => practice(true)}><Brain/>From memory</Button>
          <Button variant="outline" size="icon" disabled={!ready} title="Reset" aria-label="Reset" onClick={reset}><RotateCcw/></Button>
        </div>
        <label className="writer-speed">Animation speed<input type="range" min={0} max={SPEEDS.length - 1} step={1} value={speedIndex} onChange={e => setSpeedIndex(Number(e.target.value))}/><span>{SPEEDS[speedIndex]}×</span></label>
      </> : <div className="record-gap"><p>No representative brush outline is recorded for this stroke yet, so it can’t be animated. None is inferred.</p></div>}
    </section><section className="practice-info"><span className="eyebrow">STROKE REFERENCE</span><RecordDetailTitle hanzi={glyph} pinyin={entry.pinyin} meaning={entry.meaning} pinyinFallback="—"/><p className="catalog-record-note">{entry.note.split(' · ')[0]}</p>
      {example && <p className="catalog-record-note">Shown as stroke {example.strokeIndex + 1} of <Link to="/strokes" search={{ character: example.character }} lang="zh-CN">{example.character}</Link>.</p>}
      <p className="detail-footnote">Source · Unicode 18.0 Appendix F{example ? <><br/>Outline · Hanzi Writer Data 2.0.1 (Make Me a Hanzi)</> : null}</p></section>
  </div></div>;
}
