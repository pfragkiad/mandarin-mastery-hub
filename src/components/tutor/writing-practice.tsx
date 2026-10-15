import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Play, Pause, RotateCcw, PenLine, Eye, EyeOff, Lightbulb, ListOrdered, Volume2, GitBranch, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { words } from '@/lib/mandarin';
import { type LibraryEntry } from '@/lib/character-library';
import { catalog, playCharacter } from '@/lib/catalog-store';
import { useWorkspace } from './workspace';
import { referenceCatalog, type ReferenceKind } from './references';
import { DecompositionTree } from './characters-page';
import type HanziWriter from 'hanzi-writer';

type StrokeInfo = { path: string; name: string; pinyin: string; direction: string };

function nameStroke(median: Array<[number, number]>): { name: string; pinyin: string; direction: string } {
  if (median.length < 2) return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
  const [sx, sy] = median[0] ?? [0, 0];
  const [ex, ey] = median[median.length - 1] ?? [0, 0];
  const dx = ex - sx;
  const down = sy - ey; // median coordinates: y grows upward, so positive = moving down
  let length = 0;
  for (let i = 1; i < median.length; i++) { const a = median[i]!; const b = median[i - 1]!; length += Math.hypot(a[0] - b[0], a[1] - b[1]); }
  if (length < 200) return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
  // Compound stroke: the dominant direction changes partway through.
  const mid = median[Math.floor(median.length / 2)] ?? [0, 0];
  const h1 = mid[0] - sx, v1 = mid[1] - sy;
  const h2 = ex - mid[0], v2 = ey - mid[1];
  const dom1 = Math.abs(h1) > Math.abs(v1) * 1.6 ? 'h' : Math.abs(v1) > Math.abs(h1) * 1.6 ? 'v' : 'd';
  const dom2 = Math.abs(h2) > Math.abs(v2) * 1.6 ? 'h' : Math.abs(v2) > Math.abs(h2) * 1.6 ? 'v' : 'd';
  if (dom1 !== 'd' && dom2 !== 'd' && dom1 !== dom2 && Math.min(Math.hypot(h1, v1), Math.hypot(h2, v2)) > 220) {
    return { name: '折', pinyin: 'zhé', direction: 'A compound stroke with a turn — one continuous movement.' };
  }
  if (down < -dx * 0.25 && dx > 40) return { name: '提', pinyin: 'tí', direction: 'Rising from lower left to upper right.' };
  if (Math.abs(down) < 120 && dx > 0) return { name: '横', pinyin: 'héng', direction: 'Horizontal, left to right.' };
  if (Math.abs(dx) < 90 && down > 0) return { name: '竖', pinyin: 'shù', direction: 'Vertical, top to bottom.' };
  if (dx < -40 && down > 0) return { name: '撇', pinyin: 'piě', direction: 'Falling to the left.' };
  if (dx > 40 && down > 0) return { name: '捺', pinyin: 'nà', direction: 'Falling to the right.' };
  if (dx < 0) return { name: '撇', pinyin: 'piě', direction: 'Falling to the left.' };
  if (down > 0) return { name: '竖', pinyin: 'shù', direction: 'Top to bottom.' };
  return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
}

function StrokeGuide({ strokes, onPlay, activeStroke }: { strokes: StrokeInfo[]; onPlay: (index: number) => void; activeStroke: number | null }) {
  const [visible, setVisible] = useState(true);
  if (!strokes.length) return null;
  return (
    <div className="stroke-guide">
      <div className="stroke-guide-top">
        <h3><ListOrdered size={16} />Strokes in this character</h3>
        <Button variant="ghost" size="sm" onClick={() => setVisible(v => !v)}>{visible ? <EyeOff /> : <Eye />}{visible ? 'Hide stroke guide' : 'Show stroke guide'}</Button>
      </div>
      {visible && (
        <>
          <ol className="stroke-guide-strip">
            {strokes.map((stroke, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`stroke-chip${activeStroke === i ? ' active' : ''}`}
                  title={`Play stroke ${i + 1}`}
                  aria-label={`Play stroke ${i + 1}`}
                  onClick={() => onPlay(i)}
                >
                  <svg viewBox="0 0 1024 1024" className="stroke-shape" aria-hidden="true">
                    <g transform="scale(1, -1) translate(0, -900)">
                      <path d={stroke.path} />
                    </g>
                  </svg>
                  <span className="stroke-index">{i + 1}</span>
                  <span className="stroke-pinyin">{stroke.pinyin}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="stroke-guide-note">{strokes.length} strokes in writing order — tap one to watch it drawn.</p>
        </>
      )}
    </div>
  );
}
export function WritingPractice({ character, onStrokeCount }: { character: string; onStrokeCount?: (count: number) => void }) {
  const { theme } = useWorkspace();
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
        .then((data: { strokes: string[]; medians: Array<Array<[number, number]>> }) => {
          if (active) setStrokes(data.strokes.map((path: string, i: number) => ({ path, ...nameStroke(data.medians[i] ?? []) })));
          if (active) onStrokeCount?.(data.strokes.length);
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
      if (color) { color.fillStyle = style.getPropertyValue('--writer-outline').trim(); color.fillRect(0, 0, 1, 1); }
      const outlinePixel = color?.getImageData(0, 0, 1, 1).data;
      const outlineHex = outlinePixel ? `#${Array.from(outlinePixel).slice(0, 3).map(channel => channel.toString(16).padStart(2, '0')).join('')}` : undefined;
      const instance = Writer.create(target.current, character, { width: 300, height: 300, padding: 22, showOutline: guide, ...(inkHex ? { strokeColor: inkHex, drawingColor: inkHex, radicalColor: inkHex } : {}), ...(outlineHex ? { outlineColor: outlineHex } : {}), strokeAnimationSpeed: Number(speed), delayBetweenStrokes: 240, onLoadCharDataSuccess: () => { if (active) { setReady(true); setMessage('Watch the strokes, then try it yourself.'); } }, onLoadCharDataError: () => { if (active) setMessage('Stroke data couldn’t load. Please try again.'); } });
      writer.current = instance;
    }).catch((err) => { console.error('writer load failed', err); if (active) setMessage('Writing practice couldn’t load. Please try again.'); });
    return () => { active = false; writer.current?.cancelQuiz(); writer.current = null; };
  }, [character, speed, retry, theme]);
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
  return <section className="writing-tool"><div className="tool-top"><span className="eyebrow">WATCH · TRACE · REMEMBER</span><Button variant="ghost" size="sm" onClick={() => { const next = !guide; setGuide(next); if (next) writer.current?.showOutline(); else writer.current?.hideOutline(); }}>{guide ? <EyeOff/> : <Eye/>}{guide ? 'Hide guide' : 'Show guide'}</Button></div><div className="writing-grid"><div ref={target} className="hanzi-target"/>{!ready && <div className="writer-message">{message.includes('couldn’t') ? <Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button> : 'Loading…'}</div>}</div><p className="writer-status" aria-live="polite">{message}</p><div className="writer-controls"><Button disabled={!ready} onClick={playing ? () => { writer.current?.pauseAnimation(); setPlaying(false); setMessage('Paused. Play to start again.'); } : play}>{playing ? <Pause/> : <Play/>}{playing ? 'Pause' : 'Play strokes'}</Button><Button disabled={!ready} variant="outline" size="icon" title="Reset character" aria-label="Reset character" onClick={() => { writer.current?.cancelQuiz(); writer.current?.showCharacter(); setPlaying(false); setMessage('Ready for a fresh start.'); }}><RotateCcw/></Button><Button disabled={!ready} variant="outline" onClick={quiz}><PenLine/>Practice</Button></div><label className="writer-speed">Animation speed<input type="range" min="0.5" max="2" step="0.5" value={speed} onChange={e => setSpeed(e.target.value)}/><span>{speed}×</span></label><StrokeGuide strokes={strokes} onPlay={playStroke} activeStroke={activeStroke}/></section>;
}
type CharFact = { pinyin: string; meaning: string; kind: ReferenceKind; note: string };

// Vocabulary and the reference catalog each describe characters. Merge the two so the
// practice page can show pinyin and a translation for whatever the reader arrives with.
let factsCache: { version: number; index: Record<string, CharFact> } | null = null;
function charFacts(): Record<string, CharFact> {
  if (factsCache?.version === catalog.version) return factsCache.index;
  const index: Record<string, CharFact> = {};
  for (const { kind, entries } of referenceCatalog) {
    for (const [hanzi, pinyin, meaning, note] of entries) index[hanzi] = { pinyin, meaning, kind, note };
  }
  for (const word of words) {
    if (word.hanzi.length > 1) continue;
    const known = index[word.hanzi];
    index[word.hanzi] = { pinyin: word.pinyin, meaning: word.meaning, kind: known?.kind ?? 'Character', note: known?.note ?? `${word.type} · ${word.collection}` };
  }
  factsCache = { version: catalog.version, index };
  return index;
}

// Sourced decomposition trees, indexed by character so the practice page can show the
// same provenance-attached structure the Characters page shows — without inferring any.
function decompositionFor(glyph: string): LibraryEntry['decomposition'] {
  const root = catalog.trees[glyph];
  return root ? { root, source: 'Make Me a Hanzi IDS (bddc96d) via Mandarin Tutor import', status: 'Imported graphical structure · not verified etymology' } : undefined;
}


export function StrokesPage({ initialCharacter = '我', focus = 0 }: { initialCharacter?: string; focus?: number }) {
  const wordChars = Array.from(initialCharacter);
  const isWord = wordChars.length > 1;
  const wordFact = isWord ? words.find(w => w.hanzi === initialCharacter) : undefined;
  const { preferences } = useWorkspace();
  const navigate = useNavigate();
  const character = wordChars[focus] ?? wordChars[0] ?? '我';
  const setCharacter = (c: string) => { const i = wordChars.indexOf(c); navigate({ to: '/strokes', search: { character: initialCharacter, ...(i > 0 ? { focus: i } : {}) } }); };
  const [liveStrokes, setLiveStrokes] = useState<number | null>(null);
  const [audioError, setAudioError] = useState(false);
  useWorkspace().catalogVersion;
  const fact = charFacts()[character];
  const decomposition = decompositionFor(character);
  const notedStrokes = Number(fact?.note.match(/^(\d+) strokes?/)?.[1]) || null;
  const radical = fact?.note.match(/· (\S+) radical/)?.[1] ?? null;
  const strokeCount = liveStrokes ?? notedStrokes;
  const listen = async () => setAudioError(Boolean(await playCharacter(character, preferences.slow, fact?.pinyin?.split(' / ')[0] ?? null)));
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">笔画 · THE ART OF WRITING</div><h1>One stroke at a time.</h1><p>Find the rhythm. Build the character. Make your mark.</p></div><span className="heading-hanzi">书写<span>shū xiě</span></span></div><div className="practice-layout"><WritingPractice character={character} onStrokeCount={setLiveStrokes}/><section className="practice-info"><span className="eyebrow">YOUR WRITING PRACTICE</span>{isWord && <div className="word-context"><span lang="zh-CN" className="word-context-hanzi">{initialCharacter}</span><span className="word-context-detail">{wordFact ? <><span className="pinyin">{wordFact.pinyin}</span> · {wordFact.meaning}</> : 'Word practice'}</span></div>}{isWord && <div className="picker-group"><span className="picker-label">Characters in this word</span><div className="character-picker" role="group" aria-label="Characters in this word">{wordChars.map((c, i) => <Button key={`${c}-${i}`} variant="outline" lang="zh-CN" className={c === character ? 'selected' : ''} onClick={() => setCharacter(c)} aria-label={`Practice ${c}`}>{c}</Button>)}</div></div>}<h2>Get to know <span lang="zh-CN">{character}</span></h2><p className="practice-meaning"><span className="practice-text">{fact?.pinyin ? <span className="pinyin">{fact.pinyin}</span> : <span className="pinyin">Pinyin not recorded</span>}{fact?.meaning ? <span className="practice-translation">{fact.meaning}</span> : <span className="meaning-missing">No English meaning recorded yet</span>}</span><Button variant="ghost" size="icon" className="practice-listen" title="Listen to pronunciation" aria-label={`Listen to ${character}`} onClick={listen}><Volume2/></Button><span className="practice-kind">{fact?.kind ?? 'Character'}</span></p>{audioError && <p role="status" className="meaning-missing">Audio isn’t available in this browser.</p>}<p>Every character has a natural order. Watch how it takes shape, then practice tracing it yourself.</p><div className="character-facts"><div><strong>{strokeCount ?? '—'}</strong><span>Strokes</span></div><div><strong lang="zh-CN">{radical ?? '—'}</strong><span>Radical</span></div><div><strong>简体</strong><span>Simplified</span></div></div><div className="decomposition-section"><h3><GitBranch size={17}/>Sourced decomposition</h3>{decomposition ? <><ul className="decomposition-tree"><DecompositionTree node={decomposition.root} onGlyph={glyph => navigate({ to: '/characters', search: { character: glyph } })}/></ul><dl className="decomposition-source"><dt>Source</dt><dd>{decomposition.source}</dd><dt>Verification</dt><dd>{decomposition.status}</dd></dl><p className="library-note">IDS describes graphical structure, not verified etymology or component meaning. Components link to their library card.</p></> : <div className="decomposition-pending"><BookOpen size={20}/><p>No sourced decomposition available yet.</p><small>Source files pending. No structure or component roles inferred.</small></div>}</div><div className="practice-tip"><h3><Lightbulb size={16}/>A small writing tip</h3><p>Start at the top and work your way down. Horizontal strokes usually come before vertical ones. Let each movement have a little room to breathe.</p></div><p className="library-note">Stroke order powered by Hanzi Writer. Character data loads online.</p></section></div></div>;
}
