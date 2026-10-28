import { SourceInfo } from '@/components/tutor/source-info';
import { characterScore, strokeColor, strokeScore } from '@/lib/stroke-score';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Play, Pause, RotateCcw, PenLine, Eye, EyeOff, Lightbulb, ListOrdered, Volume2, VolumeX, GitBranch, Printer, StepForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { words } from '@/lib/mandarin';
import { type LibraryEntry } from '@/lib/character-library';
import { catalog, playCharacter, characterRecording } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { referenceCatalog, TREE_SOURCE, type ReferenceKind } from '@/lib/character-library';
import { DecompositionTree } from './decomposition-tree';
import { RadicalStrokeDecomposition } from './radical-stroke-decomposition';
import { PracticeSheet } from './practice-sheet';
import type HanziWriter from 'hanzi-writer';
import { loadStrokeGeometry, type ComponentOccurrence } from '@/lib/character-enrichment';
import { splitPinyinLines, strokeNames } from '@/lib/stroke-names';
import { radicalForm, radicalForms, radicalStrokes, type RadicalForm } from '@/lib/radical-strokes';
import { RadicalForms } from './radical-forms';
import { speakTts } from '@/lib/audio';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { nextStepIndex } from '@/lib/step-playback';
import { DirectionHintsToggle, StrokeDirectionHints } from './stroke-direction-hints';
import type { MedianPoint } from '@/lib/stroke-directions';
import { useCharacterEnrichment, EnrichmentNotes, ComponentPicker } from './character-enrichment';

type StrokeInfo = { path: string; name: string; pinyin: string; direction: string };

function nameStroke(median: Array<[number, number]>): { name: string; pinyin: string; direction: string } {
  if (median.length < 2) return { name: '点', pinyin: 'diǎn', direction: 'A short dot stroke.' };
  const [sx, sy] = median[0] ?? [0, 0];
  const [ex, ey] = median[median.length - 1] ?? [0, 0];
  const dx = ex - sx;
  const down = sy - ey; // median coordinates: y grows upward, so positive = moving down
  let length = 0;
  for (let i = 1; i < median.length; i++) { const a = median[i]; const b = median[i - 1]; if (a && b) length += Math.hypot(a[0] - b[0], a[1] - b[1]); }
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

function StrokeGuide({ strokes, onPlay, activeStroke, componentIndices = [], scores = [], theme }: { strokes: StrokeInfo[]; onPlay: (index: number) => void; activeStroke: number | null; componentIndices?: number[]; scores?: (number | null)[]; theme: 'light' | 'dark' }) {
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
                <Button variant="ghost"
                  type="button"
                  className={`stroke-chip${activeStroke === i ? ' active' : ''}${componentIndices.includes(i) ? ' component-highlighted' : ''}`}
                  title={`Play stroke ${i + 1}`}
                  aria-label={`Play stroke ${i + 1}`}
                  aria-current={activeStroke === i ? 'step' : undefined}
                  onClick={() => onPlay(i)}
                >
                  <svg viewBox="0 0 1024 1024" className="stroke-shape" aria-hidden="true">
                    <g transform="scale(1, -1) translate(0, -900)">
                      <path d={stroke.path} style={componentIndices.includes(i) ? undefined : { fill: strokeColor(i, theme) }} />
                    </g>
                  </svg>
                  <span className="stroke-index">{i + 1}</span>
                  {scores[i] != null && <span className={`stroke-score${(scores[i] ?? 100) < 100 ? ' imperfect' : ''}`}>{scores[i]}%</span>}
                  <span className="stroke-pinyin">{splitPinyinLines(stroke.pinyin).map((line, j) => <span key={j}>{line}</span>)}</span>
                </Button>
              </li>
            ))}
          </ol>
          <p className="stroke-guide-note">{strokes.length} strokes in writing order — tap one to watch it drawn.</p>
        </>
      )}
    </div>
  );
}
// Animation speeds offered by the slider, slowest to fastest.
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
export const DEFAULT_SPEED_INDEX = 1; // 0.5×

export function WritingPractice({ character, onStrokeCount, component, radicalSelection }: { character: string; onStrokeCount?: (count: number) => void; component?: ComponentOccurrence | null; radicalSelection?: RadicalForm | undefined }) {
  const { theme } = useWorkspace();
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const animationRun = useRef(0);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Loading stroke order…');
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [guide, setGuide] = useState(true);
  const [arrows, setArrows] = useState(false);
  const [medians, setMedians] = useState<MedianPoint[][]>([]);
  // The slider picks one of the fixed speeds below; 0.5× (index 1) is the default.
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const speed = SPEEDS[speedIndex] ?? 1;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const [retry, setRetry] = useState(0);
  const [strokes, setStrokes] = useState<StrokeInfo[]>([]);
  const [activeStroke, setActiveStroke] = useState<number | null>(null);
  const [scores, setScores] = useState<(number | null)[]>([]);
  // Step-by-step playback: which stroke the next Step press draws, and whether
  // each stroke's Chinese name is spoken aloud.
  const [stepIndex, setStepIndex] = useState(0);
  // Step mode: while stepping, whole-character playback (and its pause/resume)
  // has no meaning, so it stays off until Reset or Practice starts a fresh run.
  const [stepMode, setStepMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const paintStrokes = () => {
    const groups = target.current?.querySelectorAll('svg > g > g');
    groups?.[1]?.querySelectorAll('path').forEach((path, i) => { (path as SVGPathElement).style.stroke = strokeColor(i, theme); });
  };
  useEffect(() => {
    let active = true;
    animationRun.current += 1;
    setReady(false); setPlaying(false); setPaused(false); setMessage('Loading stroke order…');
    setStrokes([]); setMedians([]); setActiveStroke(null);
    if (target.current) target.current.innerHTML = '';
    Promise.all([import('hanzi-writer'), loadStrokeGeometry(character), strokeNames(character)]).then(([{ default: Writer }, { data }, names]) => {
      if (!active || !target.current) return;
      const exact = radicalStrokes(character, radicalSelection);
      const selectedNames = exact ? exact.status === 'recorded' && exact.strokes.length === data.strokes.length ? exact.strokes : null : names;
      // Radical forms fail closed; never invent names from their geometry.
      setStrokes(data.strokes.map((path, i) => {
        const fallback = nameStroke(data.medians[i] ?? []);
        const recorded = selectedNames?.[i];
        return { path, name: recorded?.name ?? (exact ? '' : fallback.name), pinyin: recorded?.pinyin ?? (exact ? 'Not recorded' : fallback.pinyin), direction: fallback.direction };
      }));
      setMedians(data.medians as MedianPoint[][]);
      onStrokeCount?.(data.strokes.length);
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
      const instance = Writer.create(target.current, character, { width: 300, height: 300, padding: 22, showOutline: guide, charDataLoader: (_glyph, onLoad) => { onLoad(data); }, ...(inkHex ? { strokeColor: inkHex, drawingColor: inkHex, radicalColor: inkHex } : {}), ...(outlineHex ? { outlineColor: outlineHex } : {}), strokeAnimationSpeed: speedRef.current, delayBetweenStrokes: 240, onLoadCharDataSuccess: () => { if (active) { setReady(true); setScores([]); requestAnimationFrame(paintStrokes); setMessage('Watch the strokes, then try it yourself.'); } }, onLoadCharDataError: () => { if (active) setMessage('Stroke data couldn’t load. Please try again.'); } });
      writer.current = instance;
    }).catch((err) => { console.error('writer load failed', err); if (active) setMessage('Writing practice couldn’t load. Please try again.'); });
    return () => { active = false; animationRun.current += 1; writer.current?.cancelQuiz(); writer.current = null; };
  }, [character, retry, theme, radicalSelection?.key]);
  // Hanzi Writer has no public speed setter; update the live options before each run.
  const applySpeed = (instance: HanziWriter) => { (instance as unknown as { _options: { strokeAnimationSpeed: number } })._options.strokeAnimationSpeed = speedRef.current; };
  // One wording for "which stroke is happening now", shared by full playback and single-stroke playback.
  const strokeMessage = (i: number) => `Stroke ${i + 1} of ${strokes.length}: ${strokes[i]?.pinyin ?? ''} — ${strokes[i]?.direction ?? ''}`;
  const play = () => {
    const instance = writer.current; if (!instance) return;
    if (paused) {
      applySpeed(instance); setPaused(false); setPlaying(true);
      if (activeStroke !== null) setMessage(strokeMessage(activeStroke));
      void instance.resumeAnimation();
      return;
    }
    const run = ++animationRun.current;
    applySpeed(instance);
    instance.cancelQuiz(); setPaused(false); setPlaying(true); setActiveStroke(null); setScores([]); setStepIndex(0); setStepMode(false); setMessage('Follow each stroke in order.');
    // Draw stroke-by-stroke so the guide below can highlight the stroke being drawn.
    instance.hideCharacter();
    const step = (i: number) => {
      if (animationRun.current !== run) return;
      if (i >= strokes.length) { setPlaying(false); setPaused(false); setActiveStroke(null); setMessage('Your turn. Ready to write it from memory?'); return; }
      setActiveStroke(i);
      setMessage(strokeMessage(i));
      instance.animateStroke(i, { onComplete: () => step(i + 1) });
    };
    step(0);
  };
  const pause = () => {
    if (!writer.current) return;
    void writer.current.pauseAnimation(); setPlaying(false); setPaused(true);
    setMessage(`Paused. ${activeStroke !== null ? strokeMessage(activeStroke) : ''}`);
  };
  const reset = () => {
    animationRun.current += 1; writer.current?.cancelQuiz(); void writer.current?.showCharacter();
    setPlaying(false); setPaused(false); setActiveStroke(null); setScores([]); setStepIndex(0); setStepMode(false); setMessage('Ready for a fresh start.');
  };
  const quiz = () => { if (!writer.current) return; animationRun.current += 1; setPlaying(false); setPaused(false); setActiveStroke(null); setStepIndex(0); setStepMode(false); setScores(strokes.map(() => null)); setMessage('Draw the character in the square.'); writer.current.quiz({ onMistake: () => setMessage('Keep going — follow the highlighted stroke.'), onCorrectStroke: ({ strokeNum, mistakesOnStroke }) => { speakStrokeName(strokeNum); const score = strokeScore(mistakesOnStroke); setScores(prev => { const next = [...prev]; next[strokeNum] = score; return next; }); setMessage(`Stroke ${strokeNum + 1}: ${score}% accuracy.`); }, onComplete: ({ totalMistakes }) => { setScores(prev => { const total = characterScore(prev); setMessage(`Character complete — ${total ?? 100}% accuracy${totalMistakes ? ` (${totalMistakes} mistake${totalMistakes === 1 ? '' : 's'})` : ''}.${total === 100 ? ' Perfect!' : ''}`); return prev; }); } }); };
  const playStroke = (index: number) => {
    const instance = writer.current; if (!instance) return;
    const run = ++animationRun.current;
    applySpeed(instance);
    instance.cancelQuiz(); setPlaying(true); setPaused(false); setActiveStroke(index);
    setMessage(strokeMessage(index));
    instance.showCharacter();
    instance.animateStroke(index, { onComplete: () => { if (animationRun.current !== run) return; setPlaying(false); setPaused(false); setActiveStroke(null); } });
  };
  // Practice matches and Step playback share stroke-name speech and the live mute setting.
  // Each Step press draws one stroke; after the last stroke it starts over.
  const speakStrokeName = (i: number) => { if (!mutedRef.current && strokes[i]?.name) speakTts(strokes[i].name); };
  const step = () => {
    const instance = writer.current; if (!instance || !strokes.length || playing) return;
    const i = nextStepIndex(stepIndex, strokes.length);
    const run = ++animationRun.current;
    applySpeed(instance);
    instance.cancelQuiz(); setPlaying(true); setPaused(false); setActiveStroke(i); setStepMode(true);
    if (i === 0) instance.hideCharacter();
    setMessage(strokeMessage(i));
    speakStrokeName(i);
    instance.animateStroke(i, { onComplete: () => {
      if (animationRun.current !== run) return;
      setPlaying(false); setPaused(false); setStepIndex(i + 1);
      setMessage(i + 1 >= strokes.length ? 'All strokes drawn. Press Step to start over.' : `Press Step for stroke ${i + 2} of ${strokes.length}.`);
    } });
  };
  const highlighted = ready ? component?.strokeIndices ?? [] : [];
  return <section className="writing-tool"><div className="tool-top"><span className="eyebrow">WATCH · TRACE · REMEMBER<SourceInfo inline className="detail-footnote">Start at the top and work your way down. Horizontal strokes usually come before vertical ones. Let each movement have a little room to breathe.</SourceInfo></span><div className="tool-top-actions"><DirectionHintsToggle checked={arrows} onChange={setArrows} disabled={!ready || !medians.some(median => median.length > 1)}/><Button variant="ghost" size="sm" onClick={() => { const next = !guide; setGuide(next); if (next) writer.current?.showOutline(); else writer.current?.hideOutline(); }}>{guide ? <EyeOff/> : <Eye/>}{guide ? 'Hide guide' : 'Show guide'}</Button></div></div><div className="writing-grid"><div ref={target} className="hanzi-target"/>{highlighted.length > 0 && <svg className="component-stroke-overlay" viewBox="0 0 300 300" aria-label={`Highlighted strokes for ${component?.glyph}`}><g transform="translate(22, 247) scale(0.25, -0.25)">{highlighted.map(index => <path key={index} data-stroke-index={index} d={strokes[index]?.path}/>)}</g></svg>}{ready && arrows && <StrokeDirectionHints medians={medians} activeStroke={activeStroke}/>} {!ready && <div className="writer-message">{message.includes('couldn’t') ? <Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button> : 'Loading…'}</div>}</div><p className="writer-status" aria-live="polite">{message}</p><div className="writer-controls"><div className="writer-controls-group"><Button variant={stepMode ? 'outline' : 'default'} disabled={!ready || stepMode} title={stepMode ? 'Step mode — press Reset to play all strokes at once' : undefined} onClick={playing ? pause : play}>{playing && !stepMode ? <Pause/> : <Play/>}{playing && !stepMode ? 'Pause' : paused ? 'Resume' : 'Play strokes'}</Button><Button disabled={!ready || playing} variant="outline" title="Draw one stroke at a time" onClick={step}><StepForward/>Step</Button><Button variant="ghost" size="icon" title={muted ? 'Unmute stroke names' : 'Mute stroke names'} aria-label={muted ? 'Unmute stroke names' : 'Mute stroke names'} aria-pressed={muted} onClick={() => setMuted(m => !m)}>{muted ? <VolumeX/> : <Volume2/>}</Button><label className="writer-speed">Animation speed<input type="range" min="0" max={SPEEDS.length - 1} step="1" value={speedIndex} onChange={e => setSpeedIndex(Number(e.target.value))}/><span>{speed}×</span></label></div><div className="writer-controls-group"><Button disabled={!ready} variant="outline" onClick={quiz}><PenLine/>Practice</Button><Button disabled={!ready} variant="outline" size="icon" title="Reset character" aria-label="Reset character" onClick={reset}><RotateCcw/></Button></div></div><StrokeGuide strokes={strokes} onPlay={playStroke} activeStroke={activeStroke} componentIndices={highlighted} scores={scores} theme={theme}/></section>;
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
  if (catalog.radicals.some(row => row[0] === glyph)) return undefined;
  const root = catalog.trees[glyph];
  return root ? { root, source: TREE_SOURCE, status: 'Imported graphical structure · not verified etymology' } : undefined;
}


export function StrokesPage({ initialCharacter = '我', focus = 0, family, variant }: { initialCharacter?: string; focus?: number; family?: number | undefined; variant?: string | undefined }) {
  const wordChars = Array.from(initialCharacter);
  const isWord = wordChars.length > 1;
  const wordFact = isWord ? words.find(w => w.hanzi === initialCharacter) : undefined;
  const { preferences } = useWorkspace();
  const navigate = useNavigate();
  const character = wordChars[focus] ?? wordChars[0] ?? '我';
  const setCharacter = (c: string) => { const i = wordChars.indexOf(c); navigate({ to: '/strokes', search: { character: initialCharacter, ...(i > 0 ? { focus: i } : {}) } }); };
  const [liveStrokes, setLiveStrokes] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [audioError, setAudioError] = useState(false);
  useWorkspace().catalogVersion;
  const requestedForm = family ? radicalForm(family, variant) : undefined;
  const radicalSelection = requestedForm?.character === character ? requestedForm : undefined;
  const familyId = radicalSelection ? family : radicalForms(character).length === 1 ? radicalForms(character)[0]?.family.id : undefined;
  const fact = charFacts()[character];
  const decomposition = decompositionFor(character);
  const enrichment = useCharacterEnrichment(character, decomposition?.root);
  const [componentSelection, setComponentSelection] = useState({ character, path: '' });
  const selectedPath = componentSelection.character === character ? componentSelection.path : '';
  const component = enrichment?.mapping.groups.find(group => JSON.stringify(group.path) === selectedPath) ?? null;
  const notedStrokes = Number(fact?.note.match(/^(\d+) strokes?/)?.[1]) || null;
  const radical = fact?.note.match(/· (\S+) radical/)?.[1] ?? null;
  const strokeCount = liveStrokes ?? notedStrokes;
  const info = glyphPresentation(character, fact?.kind ?? 'Character', fact?.pinyin, fact?.meaning);
  const reading = info.reading?.split(' / ')[0] || null;
  const recording = info.speech ? characterRecording(info.speech, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => { if (info.speech) setAudioError(Boolean(await playCharacter(info.speech, preferences.slow, reading))); };
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">笔画 · THE ART OF WRITING</div><h1>One stroke at a time.</h1><p>Find the rhythm. Build the character. Make your mark.</p></div><span className="heading-hanzi">书写<span>shū xiě</span></span></div><div className="practice-layout"><WritingPractice character={character} onStrokeCount={setLiveStrokes} component={component} radicalSelection={radicalSelection}/><section className="practice-info"><span className="eyebrow">YOUR WRITING PRACTICE</span>{isWord && <div className="word-context"><span lang="zh-CN" className="word-context-hanzi">{initialCharacter}</span><span className="word-context-detail">{wordFact ? <><span className="pinyin">{wordFact.pinyin}</span> · {wordFact.meaning}</> : 'Word practice'}</span></div>}{isWord && <div className="picker-group"><span className="picker-label">Characters in this word</span><div className="character-picker" role="group" aria-label="Characters in this word">{wordChars.map((c, i) => <Button key={`${c}-${i}`} variant="outline" lang="zh-CN" className={c === character ? 'selected' : ''} onClick={() => setCharacter(c)} aria-label={`Practice ${c}`}>{c}</Button>)}</div></div>}<div className="practice-heading-row"><h2>Get to know <span lang="zh-CN">{character}</span></h2><div className="practice-facts"><span><strong>{strokeCount ?? '—'}</strong>strokes</span><span><strong lang="zh-CN">{radical ?? '—'}</strong>radical</span><span><strong>简体</strong>simplified</span></div></div><p className="practice-meaning"><span className="practice-text">{info.reading ? <span className="pinyin">{info.componentName ? `Component name · ${info.reading}` : info.reading}</span> : <span className="pinyin">{info.readingFallback}</span>}<Button variant="ghost" size="icon" className={`practice-listen${audioAvailable ? '' : ' audio-tts-only'}`} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${character}` : `No audio available for ${character}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button>{info.meaning ? <span className="practice-translation">{info.meaning}</span> : <span className="meaning-missing">No English meaning recorded yet</span>}</span><span className="practice-kind">{info.label}</span></p>{audioError && <p role="status" className="meaning-missing">Audio isn’t available in this browser.</p>}<p>Every character has a natural order. Watch how it takes shape, then practice tracing it yourself.</p><div className="decomposition-section"><h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION{!(familyId || radicalStrokes(character)) && decomposition && <><SourceInfo inline className="detail-footnote decomposition-footnote">Source · {decomposition.source}<br/>Verification · {decomposition.status}</SourceInfo><SourceInfo inline variant="warning" className="decomposition-note">IDS describes graphical structure, not verified etymology or component meaning. Components link to their library card.</SourceInfo></>}</h3>{familyId || radicalStrokes(character) ? <RadicalStrokeDecomposition glyph={character} form={radicalSelection}/> : decomposition ? <><ul className="decomposition-tree"><DecompositionTree node={decomposition.root}/></ul><EnrichmentNotes record={enrichment}/>{enrichment && <ComponentPicker record={enrichment} selected={selectedPath} onSelect={path => setComponentSelection({ character, path })}/>}</> : <div className="record-gap"><p>No recorded decomposition available yet.</p><small>Source files pending. No structure or component roles inferred.</small></div>}</div>{familyId && <RadicalForms familyId={familyId} selectedKey={radicalSelection?.key ?? radicalForms(character).find(match => match.family.id === familyId)?.form.key} destination="practice"/>}<Button variant="outline" size="sm" className="practice-print-button" onClick={() => setSheet(true)}><Printer/>Print practice sheet</Button></section>{sheet && <PracticeSheet text={initialCharacter} pinyin={wordFact?.pinyin ?? info.reading} meaning={wordFact?.meaning ?? info.meaning} onClose={() => setSheet(false)}/>}</div></div>;
}
