import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, PenLine, Eye, EyeOff, Lightbulb, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type HanziWriter from 'hanzi-writer';

type StrokeInfo = { path: string; name: string; pinyin: string; direction: string };

function nameStroke(path: string): { name: string; pinyin: string; direction: string } {
  const nums = (path.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  const points: Array<[number, number]> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
  if (points.length < 2) return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  const dx = ex - sx;
  const dy = ey - sy; // data coordinates: y grows downward
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  if (length < 130) return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
  if (spanX > 220 && spanY > 220) return { name: '折', pinyin: 'zhé', direction: 'A compound stroke with a turn — one continuous movement.' };
  if (dy < -60 && dx > 40) return { name: '提', pinyin: 'tí', direction: 'Rising from lower left to upper right.' };
  if (Math.abs(dy) < 90 && dx > 0) return { name: '横', pinyin: 'héng', direction: 'Horizontal, left to right.' };
  if (Math.abs(dx) < 90 && dy > 0) return { name: '竖', pinyin: 'shù', direction: 'Vertical, top to bottom.' };
  if (dx < -40 && dy > 0) return { name: '撇', pinyin: 'piě', direction: 'Falling to the left.' };
  if (dx > 40 && dy > 0) return { name: '捺', pinyin: 'nà', direction: 'Falling to the right.' };
  if (dx < 0) return { name: '撇', pinyin: 'piě', direction: 'Falling to the left.' };
  if (dy > 0) return { name: '竖', pinyin: 'shù', direction: 'Top to bottom.' };
  return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
}

function StrokeGuide({ strokes, onPlay, activeStroke }: { strokes: StrokeInfo[]; onPlay: (index: number) => void; activeStroke: number | null }) {
  const [visible, setVisible] = useState(true);
  if (!strokes.length) return null;
  return (
    <div className="stroke-guide">
      <div className="stroke-guide-top">
        <h3><ListOrdered size={16} />Strokes in this character</h3>
        <Button variant="ghost" size="sm" onClick={() => setVisible(v => !v)}>{visible ? 'Hide stroke guide' : 'Show stroke guide'}</Button>
      </div>
      {visible && (
        <>
          <p className="stroke-guide-note">{strokes.length} ordered strokes · local teaching labels · draft</p>
          <ol className="stroke-guide-list">
            {strokes.map((stroke, i) => (
              <li key={i} className={activeStroke === i ? 'active' : ''}>
                <span className="stroke-index">{i + 1}</span>
                <svg viewBox="0 0 1024 1024" className="stroke-shape" aria-hidden="true">
                  <g transform="scale(1, -1) translate(0, -900)">
                    <path d={stroke.path} />
                  </g>
                </svg>
                <span className="stroke-name"><span className="stroke-pinyin">{stroke.pinyin}</span><span lang="zh-CN">{stroke.name}</span></span>
                <span className="stroke-direction">{stroke.direction}</span>
                <Button variant="outline" size="icon" title={`Play stroke ${i + 1}`} aria-label={`Play stroke ${i + 1}`} onClick={() => onPlay(i)}><Play /></Button>
              </li>
            ))}
          </ol>
          <p className="stroke-guide-note">Local editorial teaching labels mapped to Hanzi Writer data; draft, not official stroke-name metadata. Names are separate teaching annotations, not supplied by the animation dataset.</p>
        </>
      )}
    </div>
  );
}
export function WritingPractice({ character }: { character: string }) {
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const animationRun = useRef(0);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Loading stroke order…');
  const [playing, setPlaying] = useState(false);
  const [guide, setGuide] = useState(true);
  const [speed, setSpeed] = useState('1');
  const [retry, setRetry] = useState(0);
  const [strokes, setStrokes] = useState<StrokeInfo[]>([]);
  const [activeStroke, setActiveStroke] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    animationRun.current += 1;
    setReady(false); setPlaying(false); setMessage('Loading stroke order…');
    setStrokes([]); setActiveStroke(null);
    if (target.current) target.current.innerHTML = '';
    import('hanzi-writer').then(({ default: Writer }) => {
      fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(character)}.json`)
        .then(res => (res.ok ? res.json() : Promise.reject(new Error('no data'))))
        .then((data: { strokes: string[] }) => {
          if (active) setStrokes(data.strokes.map((path: string) => ({ path, ...nameStroke(path) })));
        })
        .catch(() => {});
      if (!active || !target.current) return;
      const style = getComputedStyle(document.documentElement);
      const ink = style.getPropertyValue('--primary').trim();
      const color = document.createElement('canvas').getContext('2d');
      if (color) color.fillStyle = ink;
      if (color) color.fillRect(0, 0, 1, 1);
      const pixel = color?.getImageData(0, 0, 1, 1).data;
      const inkHex = pixel ? `#${Array.from(pixel).slice(0, 3).map(channel => channel.toString(16).padStart(2, '0')).join('')}` : undefined;
      const instance = Writer.create(target.current, character, { width: 300, height: 300, padding: 22, showOutline: guide, ...(inkHex ? { strokeColor: inkHex, drawingColor: inkHex } : {}), strokeAnimationSpeed: Number(speed), delayBetweenStrokes: 240, onLoadCharDataSuccess: () => { if (active) { setReady(true); setMessage('Watch the strokes, then try it yourself.'); } }, onLoadCharDataError: () => { if (active) setMessage('Stroke data couldn’t load. Please try again.'); } });
      writer.current = instance;
    }).catch((err) => { console.error('writer load failed', err); if (active) setMessage('Writing practice couldn’t load. Please try again.'); });
    return () => { active = false; writer.current?.cancelQuiz(); writer.current = null; };
  }, [character, speed, retry]);
  const play = () => {
    const instance = writer.current; if (!instance) return;
    const run = ++animationRun.current;
    instance.cancelQuiz(); setPlaying(true); setMessage('Follow each stroke in order.');
    instance.animateCharacter({ onComplete: () => { if (animationRun.current !== run) return; setPlaying(false); setMessage('Your turn. Ready to write it from memory?'); } });
  };
  const quiz = () => { if (!writer.current) return; animationRun.current += 1; setPlaying(false); setMessage('Draw the character in the square.'); writer.current.quiz({ onMistake: () => setMessage('Keep going — follow the highlighted stroke.'), onComplete: () => setMessage('Beautifully done! You completed the character.') }); };
  const playStroke = (index: number) => {
    const instance = writer.current; if (!instance) return;
    const run = ++animationRun.current;
    instance.cancelQuiz(); setPlaying(false); setActiveStroke(index);
    setMessage(`Stroke ${index + 1} of ${strokes.length}: ${strokes[index]?.pinyin ?? ''} — ${strokes[index]?.direction ?? ''}`);
    instance.showCharacter();
    instance.animateStroke(index, { onComplete: () => { if (animationRun.current !== run) return; setActiveStroke(null); } });
  };
  return <section className="writing-tool"><div className="tool-top"><span className="eyebrow">WATCH · TRACE · REMEMBER</span><Button variant="ghost" size="sm" onClick={() => { const next = !guide; setGuide(next); if (next) writer.current?.showOutline(); else writer.current?.hideOutline(); }}>{guide ? <EyeOff/> : <Eye/>}{guide ? 'Hide guide' : 'Show guide'}</Button></div><div className="writing-grid"><div ref={target} className="hanzi-target"/>{!ready && <div className="writer-message">{message.includes('couldn’t') ? <Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button> : 'Loading…'}</div>}</div><p className="writer-status" aria-live="polite">{message}</p><div className="writer-controls"><Button disabled={!ready} onClick={playing ? () => { writer.current?.pauseAnimation(); setPlaying(false); setMessage('Paused. Play to start again.'); } : play}>{playing ? <Pause/> : <Play/>}{playing ? 'Pause' : 'Play strokes'}</Button><Button disabled={!ready} variant="outline" size="icon" title="Reset character" aria-label="Reset character" onClick={() => { writer.current?.cancelQuiz(); writer.current?.showCharacter(); setPlaying(false); setMessage('Ready for a fresh start.'); }}><RotateCcw/></Button><Button disabled={!ready} variant="outline" onClick={quiz}><PenLine/>Practice</Button></div><StrokeGuide strokes={strokes} onPlay={playStroke} activeStroke={activeStroke}/><label className="writer-speed">Animation speed<input type="range" min="0.5" max="2" step="0.5" value={speed} onChange={e => setSpeed(e.target.value)}/><span>{speed}×</span></label></section>;
}
const characterDetails: Record<string, { pinyin: string; meaning: string; strokes: number; radical: string }> = { '我': { pinyin: 'wǒ', meaning: 'I · me', strokes: 7, radical: '戈' }, '你': { pinyin: 'nǐ', meaning: 'You', strokes: 7, radical: '亻' }, '好': { pinyin: 'hǎo', meaning: 'Good · well', strokes: 6, radical: '女' }, '学': { pinyin: 'xué', meaning: 'To learn', strokes: 8, radical: '子' }, '永': { pinyin: 'yǒng', meaning: 'Forever · eternal', strokes: 5, radical: '水' }, '水': { pinyin: 'shuǐ', meaning: 'Water', strokes: 4, radical: '水' }, '人': { pinyin: 'rén', meaning: 'Person', strokes: 2, radical: '人' }, '爱': { pinyin: 'ài', meaning: 'Love', strokes: 10, radical: '爫' } };
export function StrokesPage({ initialCharacter = '我' }: { initialCharacter?: string }) {
  const [character, setCharacter] = useState(initialCharacter);
  const detail = characterDetails[character];
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">笔画 · THE ART OF WRITING</div><h1>One stroke at a time.</h1><p>Find the rhythm. Build the character. Make your mark.</p></div><span className="heading-hanzi">书写<span>shū xiě</span></span></div><div className="practice-layout"><WritingPractice character={character}/><section className="practice-info"><span className="eyebrow">YOUR WRITING PRACTICE</span><h2>Get to know <span lang="zh-CN">{character}</span></h2><p><span className="pinyin">{detail?.pinyin}</span> {detail ? `· ${detail.meaning}` : '· Character practice'}</p><div className="character-picker" aria-label="Choose a character">{Object.keys(characterDetails).map(c => <Button key={c} variant="outline" className={c === character ? 'selected' : ''} onClick={() => setCharacter(c)} aria-label={`Practice ${c}`}>{c}</Button>)}</div><p>Every character has a natural order. Watch how it takes shape, then practice tracing it yourself.</p><div className="character-facts"><div><strong>{detail?.strokes ?? '—'}</strong><span>Strokes</span></div><div><strong>{detail?.radical ?? '—'}</strong><span>Radical</span></div><div><strong>简体</strong><span>Simplified</span></div></div><div className="practice-tip"><h3><Lightbulb size={16}/>A small writing tip</h3><p>Start at the top and work your way down. Horizontal strokes usually come before vertical ones. Let each movement have a little room to breathe.</p></div><p className="library-note">Stroke order powered by Hanzi Writer. Character data loads online.</p></section></div><section className="stroke-reference"><div className="section-heading"><div><div className="eyebrow">THE BUILDING BLOCKS</div><h2>Meet the basic strokes</h2></div><span className="text-xs text-muted-foreground">6 basic forms</span></div><div className="stroke-grid">{[['丶','diǎn','Dot'],['一','héng','Horizontal'],['丨','shù','Vertical'],['丿','piě','Left-falling'],['㇏','nà','Right-falling'],['㇀','tí','Rising']].map(([shape,pinyin,name]) => <article key={name} className="stroke-tile"><strong lang="zh-CN">{shape}</strong><span>{pinyin}</span><small>{name}</small></article>)}</div></section></div>;
}
