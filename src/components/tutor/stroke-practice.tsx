import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Play, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import { RecordDetailTitle } from './record-detail-title';
type Point = { x: number; y: number };
export function StrokePractice({ glyph }: { glyph: string }) {
  const { catalogVersion, theme } = useWorkspace();
  const entry = libraryEntries('Strokes').find(item => item.hanzi === glyph);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Point[] | null>(null);
  const [lines, setLines] = useState<Point[][]>([]);
  const [guide, setGuide] = useState(true);
  const [active, setActive] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) cancelAnimationFrame(timer.current); }, []);
  const replay = () => {
    if (timer.current) cancelAnimationFrame(timer.current);
    setGuide(true); setReplayKey(k => k + 1); setReplaying(true);
    const total = lines.reduce((n, l) => n + l.length, 0);
    if (!total) { timer.current = requestAnimationFrame(() => setReplaying(false)); window.setTimeout(() => setReplaying(false), 1200); return; }
    const start = performance.now(); const duration = Math.min(2400, 500 + total * 8);
    const step = (now: number) => {
      let left = Math.ceil(total * Math.min(1, (now - start) / duration)); const partial: Point[][] = [];
      for (const l of lines) { if (left <= 0) break; partial.push(l.slice(0, left)); left -= l.length; }
      paint(partial);
      if (now - start < duration) timer.current = requestAnimationFrame(step); else { timer.current = null; setReplaying(false); paint(lines); }
    };
    paint([]); timer.current = requestAnimationFrame(step);
  };
  const paint = (paths: Point[][]) => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, 600, 600);
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    context.lineWidth = 12; context.lineCap = 'round'; context.lineJoin = 'round';
    for (const path of paths) {
      const first = path[0]; if (!first) continue;
      context.beginPath(); context.moveTo(first.x, first.y);
      for (const point of path.slice(1)) context.lineTo(point.x, point.y);
      if (path.length === 1) context.lineTo(first.x + .1, first.y + .1);
      context.stroke();
    }
  };
  useEffect(() => { paint(lines); }, [lines, theme, catalogVersion]);
  const finish = () => { const path = drawing.current; if (!path) return; drawing.current = null; setActive(false); setLines(previous => [...previous, path]); };
  if (!entry) return <p className="library-note">{catalogVersion ? 'This stroke is not in the library.' : 'Loading stroke data…'}</p>;
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">笔画 · STROKE PRACTICE</div><h1>Practice a stroke.</h1></div></div><div className="practice-layout">
    <section className="writing-tool"><div className="tool-top"><span className="eyebrow">TRACE · REPEAT</span><Button variant="ghost" size="sm" onClick={() => setGuide(value => !value)}>{guide ? <EyeOff/> : <Eye/>}{guide ? 'Hide guide' : 'Show guide'}</Button></div>
      <div className="writing-grid individual-stroke-grid">{guide && <span key={replayKey} className={`individual-stroke-model${replayKey ? ' is-replaying' : ''}`} lang="zh-CN" aria-hidden="true">{glyph}</span>}<canvas ref={canvas} width={600} height={600} aria-label={`Drawing area for ${glyph}`} className="stroke-drawing"
        onPointerDown={event => { if (replaying) return; event.currentTarget.setPointerCapture(event.pointerId); const rect = event.currentTarget.getBoundingClientRect(); drawing.current = [{ x: (event.clientX - rect.left) * 600 / rect.width, y: (event.clientY - rect.top) * 600 / rect.height }]; setActive(true); paint([...lines, drawing.current]); }}
        onPointerMove={event => { if (!drawing.current) return; const rect = event.currentTarget.getBoundingClientRect(); drawing.current.push({ x: (event.clientX - rect.left) * 600 / rect.width, y: (event.clientY - rect.top) * 600 / rect.height }); paint([...lines, drawing.current]); }} onPointerUp={finish} onPointerCancel={finish}/></div>
      <p className="writer-status" role="status">{replaying ? (lines.length ? 'Replaying your strokes…' : 'Showing the model stroke…') : active ? 'Drawing…' : lines.length ? 'Stroke drawn. Try again when you’re ready.' : 'Ready to trace.'}</p><div className="writer-controls"><Button variant="outline" size="sm" disabled={replaying} onClick={replay}><Play/>{lines.length ? 'Replay' : 'Show stroke'}</Button><Button variant="outline" size="icon" disabled={!lines.length} title="Undo last attempt" aria-label="Undo last attempt" onClick={() => setLines(previous => previous.slice(0, -1))}><Undo2/></Button><Button variant="outline" size="icon" title="Reset stroke" aria-label="Reset stroke" onClick={() => { drawing.current = null; setActive(false); setLines([]); }}><RotateCcw/></Button></div>
    </section><section className="practice-info"><span className="eyebrow">STROKE REFERENCE</span><RecordDetailTitle hanzi={glyph} pinyin={entry.pinyin} meaning={entry.meaning} pinyinFallback="—"/><p className="catalog-record-note">{entry.note.split(' · ')[0]}</p><p className="source-note">Source · Unicode 18.0 Appendix F<br/>Freehand tracing · no automatic accuracy assessment</p></section>
  </div></div>;
}
