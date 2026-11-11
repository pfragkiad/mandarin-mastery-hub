import { practiceOrigin, focusEntryCard } from '@/lib/practice-return';
import { detailTrail } from '@/lib/detail-trail';
import { MeaningText } from './meaning-text';
import { strokeSpeed } from '@/lib/practice-speed';
import { SourceInfo } from '@/components/tutor/source-info';
import { characterScore, strokeScore } from '@/lib/stroke-score';
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { practiceCanvasSize, PRACTICE_CANVAS_MIN } from '@/lib/learning-preferences';
import { accuracyGrade } from '@/lib/accuracy-grade';
import { componentInk, practiceStrokeGroups, strokeGroupAt, strokeGroupRuns, DEFAULT_GROUPING_SOURCE, type PracticeStrokeGroup } from '@/lib/practice-stroke-groups';
import type { CharacterEnrichment } from '@/lib/character-enrichment';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Play, Pause, RotateCcw, Eye, ListOrdered, MoveUpRight, Volume2, GitBranch, Printer, StepForward, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PracticeModeTabs } from './practice-mode-tabs';
import { practiceModeOptions, type PracticeMode } from '@/lib/practice-mode';
import { leniency } from '@/lib/handwriting-strictness';
import { words } from '@/lib/mandarin';
import { glyphScript, libraryEntries, type LibraryEntry } from '@/lib/character-library';
import { pureComponentForm } from '@/lib/glyph-presentation';
import { catalog, playCharacter, characterRecording } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { referenceCatalog, radicalVariantFallback, radicalVariantMeaning, TREE_SOURCE, type ReferenceKind } from '@/lib/character-library';
import { PracticeSheet } from './practice-sheet';
import type HanziWriter from 'hanzi-writer';
import { loadStrokeGeometry, StrokeDataUnavailable, type ComponentOccurrence, type OutlineSource } from '@/lib/character-enrichment';
import { formatStrokeIndices, splitPinyinLines, strokeNames } from '@/lib/stroke-names';
import { historicalRadicalHeading, radicalForm, radicalForms, radicalStrokes, type RadicalForm } from '@/lib/radical-strokes';
import { RadicalForms } from './radical-forms';
import { ScriptForms, scriptFormRecords, cardFormRecords } from './script-forms';
import { speakTts, stopAllAudio } from '@/lib/audio';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { nextStepIndex } from '@/lib/step-playback';
import { StrokeDirectionHints } from './stroke-direction-hints';
import type { MedianPoint } from '@/lib/stroke-directions';
import { useCharacterEnrichment, RecordedDecomposition } from './character-enrichment';
import { ComponentPronunciation } from './component-pronunciation';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { usePerfectCelebration } from './perfect-celebration';

type StrokeInfo = { path: string; name: string; pinyin: string; direction: string; ambiguous?: boolean; estimated?: boolean };

function nameStroke(median: Array<[number, number]>): { name: string; pinyin: string; direction: string } {
  // Geometry-based labels are a fallback for ordinary characters only. Exact
  // radical forms reject missing names instead of treating this as source data.
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


/** Boolean preference remembered in this browser. Starts at `initial` (SSR-safe), then applies
 *  the stored value after mount; only explicit changes are written back. */
// Status line under the drawing square. The trailing "start over" instruction
// (e.g. "Draw again to start over.") is the next action the learner should take,
// so it is emphasised separately from the result text before it.
const START_OVER_CUE = /((?:Draw again|Press \w+) to start over\.)$/;
/**
 * WriterStatus — the status line under the drawing square.
 * Inputs: `message` (full status text) and `ink` (CSS colour of the drawn character, so the
 * "start over" cue matches the Hanzi ink above it).
 * Layout: when the result text fits on one line, the cue moves to its own second line; when
 * the result text already wraps, the cue stays inline (nowrap) so the box never exceeds the
 * two reserved lines. Line count is measured from the lead span's line boxes and re-checked
 * whenever the status width changes.
 */
function WriterStatus({ message, ink }: { message: string; ink: string }) {
  const box = useRef<HTMLParagraphElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const [leadWraps, setLeadWraps] = useState(false);
  const match = START_OVER_CUE.exec(message);
  const lead = match ? message.slice(0, match.index).trimEnd() : '';
  useLayoutEffect(() => {
    // Count distinct line tops (graded percentages split the span into several rects on one line).
    const measure = () => {
      const rects = Array.from(leadRef.current?.getClientRects() ?? []);
      const firstTop = rects[0]?.top ?? 0;
      setLeadWraps(rects.some(rect => rect.top > firstTop + rect.height / 2));
    };
    measure();
    if (!box.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [lead]);
  return (
    <p ref={box} className="writer-status" aria-live="polite">
      {match ? (
        <span className="writer-status-text">
          {lead && <><span ref={leadRef}>{gradePercents(lead)}</span>{' '}</>}
          <strong className={`writer-status-cue${lead && !leadWraps ? ' writer-status-cue-break' : ''}`} style={{ color: ink }}>{match[1]}</strong>
        </span>
      ) : gradePercents(message)}
    </p>
  );
}

// Colours each "NN%" in a status message by its grade band (see accuracyGrade); the text itself is unchanged.
function gradePercents(text: string): React.ReactNode {
  const parts = text.split(/(\d+%)/);
  if (parts.length === 1) return text;
  // One wrapper span: .writer-status is a flex row, so bare array children would become
  // separate flex items and the spaces around "NN%" would collapse ("1:100%accuracy.").
  return <span>{parts.map((part, i) => i % 2 ? <span key={i} className={`accuracy-grade accuracy-grade-${accuracyGrade(parseInt(part, 10))}`}>{part}</span> : part)}</span>;
}

function useRememberedFlag(key: string, initial: boolean): [boolean, (next: boolean | ((v: boolean) => boolean)) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => { try { const saved = localStorage.getItem(key); if (saved !== null) setValue(saved === '1'); } catch { /* storage unavailable */ } }, [key]);
  const update = (next: boolean | ((v: boolean) => boolean)) => setValue(prev => {
    const v = typeof next === 'function' ? next(prev) : next;
    try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* ignore */ }
    return v;
  });
  return [value, update];
}
function StrokeGuide({ strokes, onPlay, activeStroke, componentIndices = [], scores = [], groups, audioControl, arrows, onArrowsChange, arrowsDisabled, defaultVisible = true, selectedGroup, onGroupSelect, mapped = false, playing = false, interactive = true, mode = 'watch', outlineSource }: { outlineSource?: OutlineSource | undefined; selectedGroup: string; onGroupSelect: (id: string) => void; mapped?: boolean; strokes: StrokeInfo[]; onPlay: (index: number) => void; activeStroke: number | null; componentIndices?: number[]; scores?: (number | null)[]; groups: PracticeStrokeGroup[]; audioControl: React.ReactNode; arrows: boolean; onArrowsChange: (value: boolean) => void; arrowsDisabled: boolean; defaultVisible?: boolean; playing?: boolean; interactive?: boolean; mode?: PracticeMode }) {
  const [rememberedVisible, setRememberedVisible] = useRememberedFlag('tutor-stroke-tiles-visible', true);
  const [recallVisible, setRecallVisible] = useState(false);
  const visible = defaultVisible ? rememberedVisible : recallVisible;
  const setVisible = defaultVisible ? setRememberedVisible : setRecallVisible;
  if (!strokes.length) return null;
  return (
    <div className={`stroke-guide${interactive ? '' : ' stroke-guide-readonly'}`}>
      <div className="stroke-guide-top">
        <div className="stroke-guide-heading"><h3 className="eyebrow"><ListOrdered size={13} />Strokes<SourceInfo inline className="detail-footnote">Stroke order powered by Hanzi Writer · character data loads online{outlineSource && <><br/>Outline: {outlineSource.name} · {outlineSource.style} {outlineSource.recordedAs}, linked to this form by review · {outlineSource.license}</>}{mapped && <><br/>Make Me a Hanzi · Hanzi Writer Data 2.0.1<br/>Unreviewed mapping · actual character strokes, not substituted component outlines</>}</SourceInfo></h3></div>
        <div className="stroke-guide-actions">
          {/* Toggle pills: a fixed one-word label and icon; the green tint (and aria-pressed) shows the feature is on. */}
          <Button variant="ghost" size="sm" className={`stroke-pill${arrows ? ' is-on' : ''}`} aria-pressed={arrows} title={arrows ? 'Hide direction arrows' : 'Show direction arrows'} disabled={arrowsDisabled} onClick={() => onArrowsChange(!arrows)}><MoveUpRight size={16} />Arrows</Button>
          <Button variant="ghost" size="sm" className={`stroke-pill${visible ? ' is-on' : ''}`} aria-pressed={visible} title={visible ? 'Hide stroke tiles' : 'Show stroke tiles'} onClick={() => setVisible(v => !v)}><Eye size={16} />Strokes</Button>
          {audioControl}
        </div>
      </div>
      {visible && (
        <>
          <div className="stroke-component-groups">
          {strokeGroupRuns(groups, strokes.length).map((run, runIndex) => <div className="stroke-component-group" key={`${run.group.id}-${runIndex}`} data-component-group={run.group.id}>
            <div className="stroke-component-heading"><Button variant="ghost" size="sm" className="stroke-component-label" disabled={mode === 'recall' || playing} aria-label={`Highlight ${run.group.glyph ?? 'unrecorded part'} strokes ${run.group.strokeIndices.map(i => i + 1).join(', ')}`} aria-pressed={mode === 'trace' ? run.group.strokeIndices.every(i => componentIndices.includes(i)) : selectedGroup === run.group.id} onClick={() => onGroupSelect(mode === 'watch' && selectedGroup === run.group.id ? '' : run.group.id)}><span className="component-color-marker" style={{ background: componentInk(run.group.palette) }}/><span lang="zh-CN">{run.group.glyph ?? '—'}</span><span className="stroke-component-indices">{formatStrokeIndices(run.indices)}</span></Button>{run.group.glyph && <ComponentPronunciation glyph={run.group.glyph}/>}</div>
            <ol className="stroke-guide-strip">
            {run.indices.map(i => { const stroke = strokes[i]; if (!stroke) return null; return (
              <li key={i}>
                <Button variant="ghost"
                   type="button"
                   disabled={!interactive || playing}
                  className={`stroke-chip${mode !== 'recall' && activeStroke === i ? ' active' : ''}${componentIndices.includes(i) ? ' component-highlighted' : ''}${stroke.ambiguous ? ' has-ambiguous' : ''}`}
                  title={mode === 'trace' ? `Continue tracing after stroke ${i + 1}` : `Play stroke ${i + 1}`}
                  aria-label={mode === 'trace' ? `Continue tracing after stroke ${i + 1}` : `Play stroke ${i + 1}`}
                  aria-current={activeStroke === i ? 'step' : undefined}
                  aria-pressed={mode === 'trace' ? componentIndices.includes(i) : undefined}
                  onClick={() => onPlay(i)}
                >
                  {/* The number sits above the framed picture and the name below it, so the
                      tile itself holds only the stroke and stays a square. */}
                  <span className="stroke-index">{i + 1}</span>
                  <span className="stroke-frame">
                    <svg viewBox="0 0 1024 1024" className="stroke-shape" aria-hidden="true">
                      {/* The whole character's own recorded strokes sit faded behind the tile's stroke,
                          so the stroke reads in place; nothing here is drawn from any other source. */}
                      <g transform="scale(1, -1) translate(0, -900)">
                        <g className="stroke-shape-context">{strokes.map((other, j) => j === i ? null : <path key={j} d={other.path} />)}</g>
                        <path d={stroke.path} style={{ fill: componentInk(run.group.palette) }} />
                      </g>
                    </svg>
                    {stroke.estimated && <span className="stroke-estimated" title="No recorded stroke order for this character — name estimated from the stroke's shape">est.</span>}
                    {stroke.ambiguous && <span className="stroke-ambiguous" title="The source records two names for this stroke"><TriangleAlert size={10} aria-hidden="true"/></span>}
                    {scores[i] != null && <span className={`stroke-score${(scores[i] ?? 100) < 100 ? ' imperfect' : ''}`}>{scores[i]}%</span>}
                  </span>
                  <span className="stroke-pinyin">{splitPinyinLines(stroke.pinyin).map((line, j) => <span key={j}>{line}</span>)}</span>
                </Button>
              </li>
            ); })}
          </ol></div>)}
          </div>
          <p className="stroke-guide-note">{strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'} in writing order{mode === 'trace' ? ' — continue tracing in the square.' : interactive ? ' — tap one to draw through it.' : ' — draw them in the square.'}</p>
        </>
      )}
    </div>
  );
}
/** One character's tracing/recall progress inside a word: the next undrawn stroke, the
 *  scores and status line, and the mode they were drawn in. Reported by WritingPractice
 *  (onProgress) and handed back (savedProgress) so switching characters keeps each one. */
export type PracticeProgress = { character: string; mode: PracticeMode; start: number; total: number; scores: (number | null)[]; prefix: number; message: string };
// `strip` renders under the mode tabs (word practice's character strip). `savedProgress`
// re-arms the quiz where an earlier visit to this character stopped (same mode only);
// `onProgress` reports every change so the strip can show per-character progress.
export function WritingPractice({ character, onStrokeCount, component, radicalSelection, mode: selectedMode, onModeChange, enrichment, singleGroup = false, groupingSource = DEFAULT_GROUPING_SOURCE, strip, savedProgress, onProgress }: { enrichment?: CharacterEnrichment | null; singleGroup?: boolean; groupingSource?: string; mode?: PracticeMode | undefined; onModeChange?: ((mode: PracticeMode) => void) | undefined; character: string; onStrokeCount?: (count: number) => void; component?: ComponentOccurrence | null; radicalSelection?: RadicalForm | undefined; strip?: ReactNode; savedProgress?: PracticeProgress | undefined; onProgress?: ((progress: PracticeProgress) => void) | undefined }) {
  const { theme, preferences, setPreferences } = useWorkspace();
  const { celebrate, effect: celebration } = usePerfectCelebration(preferences.confetti !== false);
  const [localMode, setLocalMode] = useState<PracticeMode>('trace');
  const mode = selectedMode ?? localMode;
  const changeMode = (next: PracticeMode) => { setLocalMode(next); onModeChange?.(next); };
  const target = useRef<HTMLDivElement>(null);
  // The drawing square fills the card width (aligned with the tabs and buttons).
  // Hanzi Writer maps touches in real pixels, so the writer is created at the
  // measured size (padding scaled from the 300px design) instead of being
  // CSS-stretched; overlays keep their 300-unit viewBox and scale with it.
  const board = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(300);
  // Resize handle: dragging only changes the CSS width (no writer rebuild per
  // frame); on release the size is saved as a preference and measured once,
  // which recreates the writer at the new size. Reset preferences restores 380px.
  const resizing = useRef(false);
  const canvasSize = practiceCanvasSize(preferences.practiceCanvasSize);
  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const node = board.current; if (!node) return;
    event.preventDefault();
    resizing.current = true;
    // While dragging, the square is quiet: Play pauses (Resume continues in place
    // if the size ends up unchanged), speech/recordings stop, and the drawing
    // fades via a class toggled directly on the node so no React rerender runs.
    if (playing && !stepMode) pause();
    stopAllAudio();
    node.classList.add('is-resizing');
    const startX = event.clientX, startY = event.clientY, start = node.clientWidth;
    const max = node.parentElement?.clientWidth ?? start;
    let size = start;
    const move = (e: PointerEvent) => {
      size = Math.min(max, Math.max(PRACTICE_CANVAS_MIN, start + Math.max(e.clientX - startX, e.clientY - startY)));
      node.style.setProperty('--writer-size', `${size}px`);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      resizing.current = false;
      node.classList.remove('is-resizing');
      setPreferences({ ...preferences, practiceCanvasSize: Math.round(size) });
      requestAnimationFrame(() => { const w = Math.round(node.clientWidth); if (w > 0) setBoardSize(w); });
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const resetSize = () => { const { practiceCanvasSize: _drop, ...rest } = preferences; setPreferences(rest); };
  useLayoutEffect(() => {
    const node = board.current; if (!node) return;
    const measure = () => { if (resizing.current) return; const w = Math.round(node.clientWidth); if (w > 0) setBoardSize(prev => Math.abs(prev - w) > 2 ? w : prev); };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const writer = useRef<HanziWriter | null>(null);
  const animationRun = useRef(0);
  // Replacement/reset/quiz starts invalidate old completion callbacks. Native
  // Pause/Resume deliberately retain this token to continue the existing run.
  const [ready, setReady] = useState(false);
  // Counts finished writer builds. A rebuild can resolve so fast that ready's false→true
  // flip is batched away, so the mode effect keys on this to re-arm every new writer.
  const [writerBuild, setWriterBuild] = useState(0);
  const [message, setMessage] = useState('Loading stroke order…');
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  // Arrow preference is remembered; Recall never shows them (guides must not leak into recall).
  const [arrowsPref, setArrows] = useRememberedFlag('tutor-stroke-arrows', false);
  const arrows = arrowsPref && mode !== 'recall';
  const [medians, setMedians] = useState<MedianPoint[][]>([]);
  // Non-Hanzi-Writer outline provenance (reviewed supplementary source), shown in the Strokes (i).
  const [outlineSource, setOutlineSource] = useState<OutlineSource | undefined>();
  // Animation speed is chosen in Settings (default 0.5×) and read live here.
  const speed = strokeSpeed(preferences.animationSpeed);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  // Per-mode handwriting strictness (Hanzi Writer leniency) from Settings.
  const strictness = leniency(mode === 'recall' ? preferences.recallLeniency : preferences.traceLeniency);
  const [groupSelection, setGroupSelection] = useState({ character, id: '' });
  const selectedGroup = groupSelection.character === character ? groupSelection.id : '';
  const [retry, setRetry] = useState(0);
  const [strokes, setStrokes] = useState<StrokeInfo[]>([]);
  const [activeStroke, setActiveStroke] = useState<number | null>(null);
  const [scores, setScores] = useState<(number | null)[]>([]);
  // A shown prefix is completed visually, but is not a scored learner answer.
  // Keep it separate from the next stroke index used by direction arrows.
  const [tracePrefix, setTracePrefix] = useState(0);
  // Step-by-step playback: which stroke the next Step press draws, and whether
  // each stroke's Chinese name is spoken aloud.
  const [stepIndex, setStepIndex] = useState(0);
  // Retain the next undrawn stroke when switching from Step to full playback.
  const [stepMode, setStepMode] = useState(false);
  // Stroke-name speech stays silent until the listener asks for it; the
  // preference is remembered across visits (muted on first load).
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const mutedLoaded = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tutor-stroke-audio');
      if (saved !== null) setMuted(saved === 'muted');
    } catch { /* storage may be unavailable */ }
    mutedLoaded.current = true;
  }, []);
  // Save only after the stored value has been applied: on mount the save effect used to run
  // in the same commit as the load (still holding the initial `true`) and overwrote it.
  const savedMuted = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mutedLoaded.current) return;
    if (savedMuted.current === null) { savedMuted.current = muted; const stored = (() => { try { return localStorage.getItem('tutor-stroke-audio'); } catch { return null; } })(); if (stored !== null && (stored === 'muted') !== muted) return; }
    savedMuted.current = muted;
    try { localStorage.setItem('tutor-stroke-audio', muted ? 'muted' : 'unmuted'); } catch { /* ignore */ }
  }, [muted]);
  // Progress carried across a same-character writer rebuild (see the build effect).
  const lastBuild = useRef('');
  const restoreRef = useRef<{ start: number; scores: (number | null)[]; prefix: number; message: string; mode: PracticeMode } | null>(null);
  // The character the live writer was built for; progress is reported only for it, so a
  // render that already carries a new character never files the old one's scores under it.
  const builtFor = useRef('');
  const groups = practiceStrokeGroups(character, strokes.length, enrichment, singleGroup || Boolean(radicalSelection) || Boolean(radicalStrokes(character)), groupingSource);
  const groupRef = useRef(groups);
  groupRef.current = groups;
  const paintStrokes = () => {
    const groups = target.current?.querySelectorAll('svg > g > g');
    groups?.[1]?.querySelectorAll('path').forEach((path, i) => { (path as SVGPathElement).style.stroke = componentInk(strokeGroupAt(groupRef.current, i)?.palette); });
  };
  useEffect(() => { if (ready) paintStrokes(); }, [ready, enrichment, groupingSource, singleGroup, strokes.length]);
  useEffect(() => {
    let active = true;
    // A rebuild of the same character (new square size after a resize drag, or a theme
    // change) keeps the learner's tracing/recall progress: remember the next undrawn
    // stroke, the scores and the status line so the mode effect can re-arm the quiz there
    // (the native quizStartStrokeNum redraws exactly that prefix). A new character, form
    // or retry starts fresh.
    const buildKey = `${character}|${radicalSelection?.key ?? ''}|${retry}`;
    restoreRef.current = buildKey === lastBuild.current && ready && mode !== 'watch' && tracePos.current > 0
      ? { start: tracePos.current, scores, prefix: tracePrefix, message, mode }
      : null;
    // A character revisited inside a word resumes where its earlier visit stopped.
    if (!restoreRef.current && savedProgress && savedProgress.character === character && savedProgress.start > 0 && savedProgress.mode !== 'watch')
      restoreRef.current = { start: savedProgress.start, scores: savedProgress.scores, prefix: savedProgress.prefix, message: savedProgress.message, mode: savedProgress.mode };
    builtFor.current = '';
    lastBuild.current = buildKey;
    animationRun.current += 1;
    setReady(false); setPlaying(false); setPaused(false); setMessage('Loading stroke order…');
    setStrokes([]); setMedians([]); setActiveStroke(null);
    if (target.current) target.current.innerHTML = '';
    Promise.all([import('hanzi-writer'), loadStrokeGeometry(character), strokeNames(character)]).then(([{ default: Writer }, { data, source }, names]) => {
      // Load browser-only playback, exact outlines and recorded names together;
      // the active guard prevents a previous character's load from taking over.
      if (!active || !target.current) return;
      const exact = radicalStrokes(character, radicalSelection);
      // Recorded and ambiguous records both carry the source's exact names (ambiguous ones
      // keep their recorded alternatives, e.g. 心's 斜钩 / 卧钩, like the radical detail card);
      // unrecorded, derived and count-mismatched sequences still fail closed — never invent
      // names from stroke geometry.
      const selectedNames = exact ? (exact.status === 'recorded' || exact.status === 'ambiguous') && exact.strokes.length === data.strokes.length ? exact.strokes : null : names;
      setStrokes(data.strokes.map((path, i) => {
        const fallback = nameStroke(data.medians[i] ?? []);
        const recorded = selectedNames?.[i];
        // A " / " inside a recorded name marks the source's own alternatives
        // (心's 斜钩 / 卧钩); only those strokes carry the ambiguous marker.
        const ambiguous = exact?.status === 'ambiguous' && Boolean(recorded?.name.includes(' / '));
        return { path, name: recorded?.name ?? (exact ? '' : fallback.name), pinyin: recorded?.pinyin ?? (exact ? 'Not recorded' : fallback.pinyin), direction: fallback.direction, ambiguous, estimated: !recorded && !exact };
      }));
      setMedians(data.medians as MedianPoint[][]);
      setOutlineSource(source);
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
      const instance = Writer.create(target.current, character, { width: boardSize, height: boardSize, padding: Math.round(22 * boardSize / 300), showCharacter: mode === 'watch', showOutline: practiceModeOptions(mode).showOutline, charDataLoader: (_glyph, onLoad) => { onLoad(data); }, ...(inkHex ? { strokeColor: inkHex, drawingColor: inkHex, radicalColor: inkHex } : {}), ...(outlineHex ? { outlineColor: outlineHex } : {}), strokeAnimationSpeed: speedRef.current, delayBetweenStrokes: 240, onLoadCharDataSuccess: () => { if (active) { builtFor.current = character; setReady(true); setWriterBuild(n => n + 1); setScores([]); requestAnimationFrame(paintStrokes); setMessage(''); } }, onLoadCharDataError: () => { if (active) setMessage('Stroke data couldn’t load. Please try again.'); } });
      writer.current = instance;
      // Capture phase on the container runs before Hanzi Writer's own svg
      // mousedown/touchstart listeners, so re-arming here lets this very drag
      // begin the fresh round.
      const el = target.current;
      // Drawing must always be possible: after a finished round start fresh;
      // if no quiz is listening (Play running/paused or a cancelled run),
      // stop the animation and arm the quiz at the next undrawn stroke.
      const rearmOnDrag = () => {
        if (needsRearm.current) { quizRef.current(0); return; }
        const live = writer.current as unknown as { _quiz?: unknown } | null;
        if (live && !live._quiz) quizRef.current(tracePos.current < strokesRef.current ? tracePos.current : 0);
      };
      el.addEventListener('mousedown', rearmOnDrag, true);
      el.addEventListener('touchstart', rearmOnDrag, true);
      cleanupRearm = () => { el.removeEventListener('mousedown', rearmOnDrag, true); el.removeEventListener('touchstart', rearmOnDrag, true); };
    }).catch((err) => {
      if (!active) return;
      // A glyph with no recorded outline fails closed with an explanation (no retry, no look-alike outline).
      if (err instanceof StrokeDataUnavailable) { setMessage('No handwriting outline is recorded for this form yet.'); return; }
      console.error('writer load failed', err); setMessage('Writing practice couldn’t load. Please try again.');
    });
    return () => { active = false; animationRun.current += 1; cleanupRearm?.(); cleanupRearm = null; writer.current?.cancelQuiz(); writer.current = null; };
  }, [character, retry, theme, radicalSelection?.key, boardSize]);
  // Hanzi Writer has no public speed setter; update the live options before each run.
  const applySpeed = (instance: HanziWriter) => { (instance as unknown as { _options: { strokeAnimationSpeed: number } })._options.strokeAnimationSpeed = speedRef.current; };
  // One wording for "which stroke is happening now", shared by full playback and single-stroke playback.
  const strokeMessage = (i: number) => `Stroke ${i + 1} of ${strokes.length}: ${strokes[i]?.pinyin ?? ''} — ${strokes[i]?.direction ?? ''}`;
  // Watch offers Step for the next stroke; Trace and Recall have no Step, so
  // they point back to Reset instead of naming a control that is not there.
  const afterDrawMessage = (drawnTo: number) => drawnTo + 1 >= strokes.length
    ? 'All strokes drawn. Press Reset to start over.'
    : mode === 'watch'
      ? `Drawn through stroke ${drawnTo + 1}. Press Step for stroke ${drawnTo + 2}.`
      : `Drawn through stroke ${drawnTo + 1}. Press Reset to practise the whole character.`;
  const play = () => {
    const instance = writer.current; if (!instance) return;
    // Trace pauses only between strokes and re-arms tracing at the next stroke,
    // so Resume is simply a fresh Play from that position (no native resume).
    if (paused && mode !== 'trace') {
      applySpeed(instance); setPaused(false); setPlaying(true); pausedNow.current = false;
      if (activeStroke !== null) setMessage(strokeMessage(activeStroke));
      // Paused between strokes (animation done, waiting on speech or the pause):
      // continue with the queued next stroke instead of resuming a finished animation.
      const next = pendingNext.current; pendingNext.current = null;
      if (next) next(); else void instance.resumeAnimation();
      return;
    }
    pausedNow.current = false; pendingNext.current = null; pauseAfterStroke.current = false; setPausing(false);
    // Trace continues from the clicked/drawn position (restarting once everything is drawn).
    const tracePlay = mode === 'trace';
    const start = tracePlay ? (tracePos.current < strokes.length ? tracePos.current : 0) : stepMode ? stepIndex : 0;
    // Continue after the completed Step prefix; hiding the whole character here
    // would erase that prefix and visually restart already completed strokes.
    const run = ++animationRun.current;
    applySpeed(instance);
    instance.cancelQuiz(); setPaused(false); setPlaying(true); setActiveStroke(null); setScores([]); setStepIndex(0); setStepMode(false); setMessage('Follow each stroke in order.');
    // Trace Play marks already-drawn strokes like hand tracing does: cards before
    // the current stroke are highlighted, the current one is the active card.
    if (tracePlay) setTracePrefix(start);
    // Draw stroke-by-stroke so the guide below can highlight the stroke being drawn.
    if (start === 0) instance.hideCharacter();
    const step = (i: number) => {
      if (animationRun.current !== run) return;
      if (i >= strokes.length) {
        setPlaying(false); setPaused(false); setActiveStroke(null);
        // Trace keeps the finished drawing; the next drag starts a fresh round.
        if (tracePlay) { quiz(strokes.length); setMessage('All strokes played. Draw to trace it yourself.'); return; }
        setMessage('Your turn. Ready to write it from memory?'); return;
      }
      setActiveStroke(i);
      setMessage(strokeMessage(i));
      // Keep the trace position in step with playback so a drag mid-run (or
      // after Pause) continues from here rather than starting over.
      if (tracePlay) { tracePos.current = i; setTracePrefix(i); }
      // Play strokes speaks each stroke name too when stroke audio is on.
      // The next stroke starts only after both this stroke's animation and its
      // spoken name have finished, so names never get cut off or pile up.
      let animDone = false;
      let speechDone = true;
      const advance = () => {
        if (animationRun.current !== run || !animDone) return;
        // Trace Pause lands once this stroke has finished drawing: arm tracing at
        // the next stroke (the drawn prefix stays) and offer Resume.
        if (tracePlay && pauseAfterStroke.current && i + 1 < strokes.length) {
          pauseAfterStroke.current = false; setPausing(false);
          quiz(i + 1); setPaused(true);
          setMessage(`Paused after stroke ${i + 1} of ${strokes.length}. Trace stroke ${i + 2} or press Resume.`);
          return;
        }
        if (!speechDone) return;
        if (pausedNow.current) { pendingNext.current = () => step(i + 1); return; }
        step(i + 1);
      };
      if (speakStrokeName(i, () => { speechDone = true; advance(); })) speechDone = false;
      instance.animateStroke(i, { onComplete: () => { animDone = true; advance(); } });
    };
    step(start);
  };
  const pause = () => {
    if (!writer.current) return;
    if (mode === 'trace') {
      // Finish the stroke being drawn, then pause (handled in Play's advance).
      if (activeStroke === null || activeStroke + 1 >= strokes.length) return;
      pauseAfterStroke.current = true; setPausing(true);
      setMessage(`Pausing after stroke ${activeStroke + 1}…`);
      return;
    }
    void writer.current.pauseAnimation(); setPlaying(false); setPaused(true); pausedNow.current = true;
    setMessage(`Paused. ${activeStroke !== null ? strokeMessage(activeStroke) : ''}`);
  };
  const reset = () => {
    animationRun.current += 1; writer.current?.cancelQuiz(); if (mode === 'watch') void writer.current?.showCharacter(); else void writer.current?.hideCharacter();
    setPlaying(false); setPaused(false); setActiveStroke(null); setScores([]); setStepIndex(0); setStepMode(false); setMessage('Ready for a fresh start.');
    if (mode !== 'watch') quiz();
  };
  // A completed round keeps the finished drawing and scores on screen; the
  // square only erases and re-arms when the learner starts dragging the first
  // stroke of a new round (see the pointerdown capture listener below).
  // Play-run pause bookkeeping: pausedNow mirrors the pause for async callbacks;
  // pendingNext holds the next stroke when a pause lands between strokes.
  const pausedNow = useRef(false);
  const pendingNext = useRef<(() => void) | null>(null);
  // Trace Pause request: honoured when the current stroke finishes drawing.
  const pauseAfterStroke = useRef(false);
  const [pausing, setPausing] = useState(false);
  const needsRearm = useRef(false);
  // Trace: next undrawn stroke (clicked prefix or hand-drawn), so Play continues from there.
  const tracePos = useRef(0);
  let cleanupRearm: (() => void) | null = null;
  const quizRef = useRef<(start?: number) => void>(() => {});
  const strokesRef = useRef(0);
  strokesRef.current = strokes.length;
  // Native quizStartStrokeNum displays the exact completed prefix and validates
  // only the remaining strokes; displayed strokes deliberately keep null scores.
  // `restored` (after a same-character rebuild) keeps the earlier scores, shown-prefix
  // marker and status line instead of treating the redrawn prefix as clicked/unscored.
  const quiz = (startStroke = 0, restored?: { scores: (number | null)[]; prefix: number; message: string }) => {
    const instance = writer.current;
    if (!instance) return;
    tracePos.current = startStroke;
    const run = ++animationRun.current;
    instance.cancelQuiz();
    setPlaying(false); setPaused(false); setActiveStroke(startStroke > 0 && startStroke < strokes.length ? startStroke : null);
    setStepIndex(0); setStepMode(false); needsRearm.current = false; pauseAfterStroke.current = false; setPausing(false);
    setScores(strokes.map((_, i) => restored?.scores[i] ?? null));
    setTracePrefix(mode === 'trace' ? restored ? restored.prefix : startStroke : 0);
    // A restored round counts as a whole attempt when nothing was skipped by clicking.
    const wholeAttempt = startStroke === 0 || (restored !== undefined && restored.prefix === 0);
    if (startStroke >= strokes.length) {
      // No out-of-range quiz: keep the full drawing until Reset or a new drag.
      setActiveStroke(null); needsRearm.current = true;
      void instance.showCharacter({ duration: 0 });
      setMessage(restored ? restored.message : 'All strokes shown. Draw again to start over.');
      return;
    }
    setMessage(restored ? restored.message : startStroke ? `Continue tracing from stroke ${startStroke + 1} of ${strokes.length}.` : 'Draw the character in the square.');
    let completionHandled = false;
    instance.quiz({ ...practiceModeOptions(mode), leniency: strictness, quizStartStrokeNum: startStroke,
      onMistake: () => { if (animationRun.current === run) setMessage(mode === 'recall' ? 'Try that stroke again.' : 'Keep going — follow the highlighted stroke.'); },
      onCorrectStroke: ({ strokeNum, mistakesOnStroke }) => {
        if (animationRun.current !== run) return;
        speakStrokeName(strokeNum);
        tracePos.current = strokeNum + 1;
        const score = strokeScore(mistakesOnStroke);
        setScores(prev => { const next = [...prev]; next[strokeNum] = score; return next; });
        setActiveStroke(strokeNum + 1 < strokes.length ? strokeNum + 1 : null);
        setMessage(`Stroke ${strokeNum + 1}: ${score}% accuracy.`);
      },
      onComplete: ({ totalMistakes }) => {
        if (animationRun.current !== run || completionHandled) return;
        completionHandled = true;
        // Celebrate a whole-character attempt only; a clicked completed prefix
        // followed by a perfect suffix is not a fully drawn hanzi.
        if (wholeAttempt && totalMistakes === 0 && (startStroke === 0 || restored?.scores.slice(0, startStroke).every(score => score === 100))) celebrate(100);
        needsRearm.current = true;
        setScores(prev => {
          const total = characterScore(prev);
          setMessage(`${wholeAttempt ? 'Character complete' : 'Remaining strokes complete'} — ${total ?? 100}% accuracy${totalMistakes ? ` (${totalMistakes} mistake${totalMistakes === 1 ? '' : 's'})` : ''}.${total === 100 ? ' Perfect!' : ''} Draw again to start over.`);
          return prev;
        });
      },
    });
  };
  quizRef.current = quiz;
  // Tapping a stroke tile jumps straight to that step: earlier strokes appear
  // instantly (played at max speed) and only the selected stroke animates.
  // Trace tiles use the native quiz offset instead of playback. Recall stays inert.
  const playStroke = (index: number) => {
    const instance = writer.current; if (!instance || !strokes.length) return;
    if (mode === 'recall') return;
    setGroupSelection({ character, id: '' });
    if (mode === 'trace') { quiz(index + 1); return; }
    const run = ++animationRun.current;
    applySpeed(instance);
    instance.cancelQuiz(); setPlaying(true); setPaused(false); setStepMode(true);
    const start = stepMode && index >= stepIndex ? stepIndex : 0;
    if (start === 0) instance.hideCharacter();
    setActiveStroke(index);
    setMessage(strokeMessage(index));
    speakStrokeName(index);
    const setRawSpeed = (value: number) => { (instance as unknown as { _options: { strokeAnimationSpeed: number } })._options.strokeAnimationSpeed = value; };
    const restoreSpeed = () => setRawSpeed(speedRef.current);
    let i = start;
    const drawNext = () => {
      if (animationRun.current !== run) { restoreSpeed(); return; }
      if (i >= index) {
        restoreSpeed();
        instance.animateStroke(index, { onComplete: () => {
          if (animationRun.current !== run) return;
          setPlaying(false); setPaused(false); setActiveStroke(null); setStepIndex(index + 1);
          setMessage(afterDrawMessage(index));
        } });
        return;
      }
      setRawSpeed(200);
      instance.animateStroke(i, { onComplete: () => { if (animationRun.current !== run) return; i += 1; drawNext(); } });
    };
    drawNext();
  };
  // Practice matches and Step playback share stroke-name speech and the live mute setting.
  // Each Step press draws one stroke; after the last stroke it starts over.
  // Returns true when speech actually started, in which case onEnd will fire later.
  const speakStrokeName = (i: number, onEnd?: () => void) => {
    if (mutedRef.current || !strokes[i]?.name) return false;
    return (onEnd ? speakTts(strokes[i].name, undefined, onEnd) : speakTts(strokes[i].name))?.ok === true;
  };
  const step = () => {
    const instance = writer.current; if (!instance || !strokes.length || playing) return;
    // A component highlight is a viewing aid, not a playback position: pressing
    // Step hands control back to the stroke sequence, so the highlight clears
    // first and the next stroke draws — the following group's first stroke, or
    // stroke one again once the last group has been revealed.
    if (selectedGroup) setGroupSelection({ character, id: '' });
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
  useEffect(() => {
    if (!ready || !writer.current) return;
    animationRun.current += 1;
    writer.current.cancelQuiz();
    setPlaying(false); setPaused(false); setActiveStroke(null); setStepIndex(0); setStepMode(false); setScores([]); setTracePrefix(0);
    const outline = practiceModeOptions(mode).showOutline;
    if (outline) void writer.current.showOutline({ duration: 0 }); else void writer.current.hideOutline({ duration: 0 });
    const restore = restoreRef.current; restoreRef.current = null;
    if (mode === 'watch') { void writer.current.showCharacter({ duration: 0 }); setMessage(''); }
    else if (restore && restore.mode === mode) quiz(restore.start, restore);
    else quiz();
  }, [mode, ready, character, writerBuild]);
  useEffect(() => {
    if (!onProgress || !ready || builtFor.current !== character || !strokes.length || mode === 'watch') return;
    onProgress({ character, mode, start: Math.min(tracePos.current, strokes.length), total: strokes.length, scores, prefix: tracePrefix, message });
  }, [scores, tracePrefix, message, ready, mode, strokes.length]);
  const selected = groups.find(group => group.id === selectedGroup);
  const selectGroup = (id: string) => {
    const group = groups.find(group => group.id === id);
    const instance = writer.current;
    if (mode === 'recall') return;
    // Trace uses the same native prefix continuation as an individual tile;
    // the group's final exact index decides the next stroke, including unknown groups.
    if (mode === 'trace') {
      if (!instance || !group?.strokeIndices.length) return;
      setGroupSelection({ character, id: '' });
      quiz(Math.max(...group.strokeIndices) + 1);
      return;
    }
    setGroupSelection({ character, id });
    if (!instance || !group?.strokeIndices.length) return;
    const last = Math.max(...group.strokeIndices);
    const run = ++animationRun.current;
    instance.cancelQuiz();
    setPlaying(false); setPaused(false); setActiveStroke(null);
    setStepMode(true); setStepIndex(last + 1);
    setMessage(afterDrawMessage(last));
    // Native showCharacter cancels old animation; reveal the exact completed
    // prefix in the writer state without replaying or inventing any paths.
    void Promise.resolve(instance.showCharacter({ duration: 0 })).then(() => {
      if (animationRun.current !== run) return;
      const renderState = (instance as unknown as { _renderState?: { updateState: (state: unknown) => void } })._renderState;
      renderState?.updateState({ character: { main: { opacity: 1, strokes: Object.fromEntries(strokes.map((_, i) => [i, { opacity: i <= last ? 1 : 0, displayPortion: 1 }])) } } });
    });
  };
  const highlighted = ready && mode !== 'recall' ? selected?.strokeIndices ?? component?.strokeIndices ?? [] : [];
  // Stroke-name speech toggle: the "Names" pill in the Strokes action row (shares Step's mute state);
  // pressed/tinted means names are spoken aloud.
  const audioControl = <Button variant="ghost" size="sm" className={`stroke-pill${muted ? '' : ' is-on'}`} aria-pressed={!muted} title={muted ? 'Speak stroke names aloud' : 'Stop speaking stroke names'} onClick={() => setMuted(m => !m)}><Volume2 size={16}/>Names</Button>;
  return <section className="writing-tool writing-tool-tabbed"><PracticeModeTabs mode={mode} onChange={changeMode}/>{strip}<div ref={board} className="writer-board writer-board-fill" style={{ ['--writer-size' as string]: `${canvasSize}px` }}><div className="writing-grid">{celebration}<div ref={target} className="hanzi-target"/><button type="button" className="writer-resize-handle" title="Drag to resize · double-click to reset" aria-label="Resize writing square" onPointerDown={startResize} onDoubleClick={resetSize}><svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M10.5 2.5 2.5 10.5M10.5 6.5 6.5 10.5M10.5 10.5h0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>{highlighted.length > 0 && <svg className="component-stroke-overlay" viewBox="0 0 300 300" aria-label={`Highlighted strokes for ${selected?.glyph ?? component?.glyph}`}><g transform="translate(22, 247) scale(0.25, -0.25)">{highlighted.map(index => <path key={index} data-stroke-index={index} d={strokes[index]?.path}/>)}</g></svg>}{ready && arrows && <StrokeDirectionHints medians={medians} activeStroke={activeStroke}/>} {!ready && <div className="writer-message">{message.includes('couldn’t') ? <Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button> : message.startsWith('No handwriting outline') ? null : 'Loading…'}</div>}</div></div><WriterStatus message={message} ink={componentInk(strokeGroupAt(groups, 0)?.palette)}/><div className="writer-controls writer-controls-arranged"><div className="writer-playback">{mode !== 'recall' && <Button disabled={!ready || pausing || (playing && stepMode)} onClick={playing ? pause : play}>{playing ? <Pause/> : <Play/>}<span className="writer-play-label">{playing ? 'Pause' : paused ? 'Resume' : 'Play'}</span></Button>}{mode === 'watch' && <><Button disabled={!ready || playing} variant="outline" title="Draw one stroke at a time" onClick={step}><StepForward/>Step</Button></>}<Button disabled={!ready} variant="outline" title="Reset character" aria-label="Reset character" onClick={reset}><RotateCcw/>Reset</Button></div></div><StrokeGuide outlineSource={outlineSource} selectedGroup={selectedGroup} onGroupSelect={selectGroup} mapped={groups.some(group => group.id !== 'whole')} key={mode} defaultVisible={mode !== 'recall'} strokes={strokes} onPlay={playStroke} activeStroke={activeStroke} componentIndices={mode === 'trace' ? strokes.flatMap((_, i) => i < tracePrefix || scores[i] != null ? [i] : []) : highlighted} scores={scores} groups={groups} audioControl={audioControl} arrows={arrows} onArrowsChange={setArrows} arrowsDisabled={!ready || !medians.some(median => median.length > 1)} playing={playing} interactive={mode !== 'recall'} mode={mode}/></section>;
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


export function StrokesPage({ initialCharacter = '我', focus = 0, family, variant, mode = 'trace', onModeChange, groupingSource = DEFAULT_GROUPING_SOURCE }: { groupingSource?: string; onGroupingSourceChange?: (source: string) => void; mode?: PracticeMode | undefined; onModeChange?: ((mode: PracticeMode) => void) | undefined; initialCharacter?: string; focus?: number; family?: number | undefined; variant?: string | undefined }) {
  const wordChars = Array.from(initialCharacter);
  const isWord = wordChars.length > 1;
  const wordFact = isWord ? words.find(w => w.hanzi === initialCharacter) : undefined;
  const { preferences } = useWorkspace();
  const navigate = useNavigate();
  const router = useRouter();
  const character = wordChars[focus] ?? wordChars[0] ?? '我';
  const setCharacter = (c: string) => { const i = wordChars.indexOf(c); navigate({ to: '/strokes', search: { character: initialCharacter, mode, ...(i > 0 ? { focus: i } : {}) } }); };
  const [sheet, setSheet] = useState(false);
  const [audioError, setAudioError] = useState(false);
  // Arriving on Practice ends any details-Back trail from a previous record, so
  // the next details window never offers a stale "Back to <glyph>" step.
  useEffect(() => { detailTrail.clear(); }, []);
  // Following a Decomposition part to its library card opens that record's
  // details window; remember this practice page (as the only trail step) so the
  // window's Back button returns here.
  const noteDecompositionReturn = (event: ReactMouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    detailTrail.replace({ label: `Practice (${character})`, href: window.location.href });
  };
  useWorkspace().catalogVersion;
  const requestedForm = family ? radicalForm(family, variant) : undefined;
  const radicalSelection = requestedForm?.character === character ? requestedForm : undefined;
  const familyId = radicalSelection ? family : radicalForms(character).length === 1 ? radicalForms(character)[0]?.family.id : undefined;
  const fact = charFacts()[character];
  // Exact recorded script; unknown forms are not silently labelled simplified.
  const script = glyphScript(character);
  // A practiced radical announces itself through its family (radicalForms) or a
  // "Radical #N" note in the record; the pill and the heading tag both use it.
  const radId = familyId || Number(fact?.note.match(/\bRadical #(\d+)\b/i)?.[1]) || null;
  const decomposition = decompositionFor(character);
  const enrichment = useCharacterEnrichment(character, decomposition?.root);
  const ownInfo = glyphPresentation(character, fact?.kind ?? 'Character', fact?.pinyin, fact?.meaning);
  // Only an explicit family-qualified variant (URL family + variant) can take a reviewed
  // contextual identity; practising the plain character 王 keeps its own reading.
  const fallback = radicalVariantFallback(character, fact?.pinyin, familyId, radicalSelection?.key);
  // Variants without their own record inherit the family reading, audio and meaning —
  // the same translation the reference detail card shows (e.g. 訁 follows 讠/言).
  const variantMeaning = familyId ? radicalVariantMeaning(character, ownInfo.meaning, familyId) : null;
  const info = fallback ? { ...ownInfo, reading: fallback.pinyin, speech: fallback.spoken, ...(fallback.meaning ? { meaning: `${fallback.meaning}; component form of ${fallback.headingGlyph}` } : {}) } : variantMeaning ? { ...ownInfo, meaning: variantMeaning } : ownInfo;
  // Glyphs such as 丷 have both a Characters and a Components record; Practice is per glyph,
  // so it labels the record the learner opened it from (the Components tab), not a guess.
  const openedFromComponents = (() => { const origin = practiceOrigin(); if (!origin) return false; const url = new URL(origin, 'http://x'); return url.pathname === '/characters' && url.searchParams.get('tab') === 'Components'; })();
  // Pure component forms live only in the Components library; label them as the library does
  // (exact record membership, never shape) so Practice and the detail card agree.
  const kindLabel = pureComponentForm(character) || openedFromComponents ? 'Component' : info.label;
  const reading = info.reading?.split(' / ')[0] || null;
  const recording = info.speech ? characterRecording(info.speech, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => { if (info.speech) setAudioError(Boolean(await playCharacter(info.speech, preferences.slow, reading))); };
  // A single character in a simplified/traditional group (Include traditional on) shows
  // both form tiles instead of one large glyph, like the detail card; each tile opens
  // Practice for that exact form. Word practice keeps its own character picker.
  // Component forms (opened from Components, or existing only there) group within Components
  // records, so their tiles show component ranks; ordinary characters group within Characters.
  const scriptKind = openedFromComponents || pureComponentForm(character) || scriptFormRecords(character).length < 2 ? 'Components' : 'Characters';
  // Component forms also offer their radical-family card forms (刀 刂 ⺈, component-families.ts),
  // independent of the Traditional preference, matching the Components card and details.
  const componentCardTiles = scriptKind === 'Components' && (openedFromComponents || pureComponentForm(character));
  const scriptTiles = !isWord && (componentCardTiles ? cardFormRecords(character, 'Components', preferences.includeTraditional).length > 1 : preferences.includeTraditional && scriptFormRecords(character, scriptKind).length > 1);
  // Traditional pill follows the exact practised record, not the first glyph-index hit
  // (門 resolves to its Common radical record there): a radical family form is
  // Traditional when it is the family's historical Kangxi heading (same rule as the
  // purple form tile); otherwise use the record's script in the library it was opened from.
  const kindScript = libraryEntries(scriptKind).find(e => e.hanzi === character)?.script;
  const traditionalPill = familyId
    ? historicalRadicalHeading(character, familyId) || script === 'Traditional'
    : (kindScript ?? script) === 'Traditional';
  // The reading card's single hanzi wears the same identity ink as the library cards
  // (styles.css `.card-ink-*` / `--card-ink`): purple traditional, gold sourced radical,
  // foreground component, green character. Stroke records keep the plain text colour, as
  // their library cards do.
  const traditionalRecord = traditionalPill || script === 'Traditional';
  const practiceInk = traditionalRecord ? 'is-traditional' : radId || kindLabel === 'Radical' ? 'card-ink-radical' : kindLabel.startsWith('Component') ? 'card-ink-component' : kindLabel === 'Stroke' ? '' : 'card-ink-character';
  // Radical cards break down into strokes, so the character-level mapping and BabelStone comparison don't apply there.
  const showEnrichment = !familyId && !radicalStrokes(character) && Boolean(enrichment);
  return <div className="page-enter practice-page-content"><div className="page-heading practice-page-heading"><Button variant="ghost" size="sm" className="practice-back" onClick={() => { const origin = practiceOrigin(); if (origin) { router.history.push(origin); focusEntryCard(); } else void navigate({ to: '/characters' }); }}><ArrowLeft/>Back</Button><div className="practice-heading-row"><div className="practice-heading-title"><h1>Practice.</h1><h2 className={mode === "recall" ? "sr-only" : undefined}>Get to know <span lang="zh-CN">{character}</span></h2></div><Button variant="outline" size="sm" className="practice-print-button" onClick={() => setSheet(true)}><Printer/>Print practice sheet</Button></div></div><div className="practice-layout"><section className="practice-info practice-intro">{isWord && <div className="word-context"><span lang="zh-CN" className="word-context-hanzi">{initialCharacter}</span><span className="word-context-detail">{wordFact ? <><span className="pinyin">{wordFact.pinyin}</span> · {wordFact.meaning}</> : 'Word practice'}</span></div>}{isWord && <div className="picker-group"><span className="picker-label">Characters in this word</span><div className="character-picker" role="group" aria-label="Characters in this word">{wordChars.map((c, i) => <Button key={`${c}-${i}`} variant="outline" lang="zh-CN" className={c === character ? 'selected' : ''} onClick={() => setCharacter(c)} aria-label={`Practice ${c}`}>{c}</Button>)}</div></div>}{/* Reading panel mirrors the reference detail heading: pinyin + speaker on the
first line with the pills at the top right, the translation on its own second
line. The strokes/radical/script facts row is gone — the writing card, family
tiles and Traditional pill already carry those facts. */}
<div className="practice-meaning"><div className="practice-reading-top"><span className="practice-text">{info.speech && isMultiReading(info.reading) ? <MultiReadingSpeakers spoken={info.speech} reading={info.reading} variant="practice" prefix={info.componentName ? 'Component name · ' : undefined} onError={message => setAudioError(Boolean(message))}/> : <>{info.reading ? <span className="pinyin">{info.componentName ? `Component name · ${info.reading}` : info.reading}</span> : <span className="pinyin">{info.readingFallback}</span>}<Button variant="ghost" size="icon" className={`practice-listen${audioAvailable ? '' : ' audio-tts-only'}`} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${character}` : `No audio available for ${character}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button></>}</span><span className="practice-pills">{traditionalPill && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}{radId ? <span className="word-hsk-id" title="Official Kangxi radical index">Radical #{radId}</span> : <span className="practice-kind">{kindLabel}</span>}</span></div>{/* Family form tiles sit between the pinyin line and the translation, without
their own heading — the Radical #N pill above already names the family. */}
{/* Non-radical records show their single hanzi between pinyin and translation, like the
 detail card; Recall hides it so the glyph never leaks into recall. */}{mode !== 'recall' && !familyId && scriptTiles && <ScriptForms glyph={character} kind={scriptKind} destination="practice" mode={mode} hideLabel grouping={componentCardTiles ? 'card' : 'script'}/>}{mode !== 'recall' && !familyId && !scriptTiles && <strong lang="zh-CN" className={`practice-hanzi ${practiceInk}${script === 'Traditional' ? ' traditional-character' : ''}`}>{character}</strong>}{mode !== 'recall' && familyId && <RadicalForms familyId={familyId} selectedKey={radicalSelection?.key ?? radicalForms(character).find(match => match.family.id === familyId)?.form.key} destination="practice" mode={mode} hideLabel/>}<p className="practice-translation">{info.meaning ? <MeaningText text={info.meaning}/> : <span className="meaning-missing">No English meaning recorded yet</span>}</p></div>{audioError && <p role="status" className="meaning-missing">Audio isn’t available in this browser.</p>}</section><WritingPractice character={character} enrichment={showEnrichment ? enrichment : null} singleGroup={Boolean(familyId)} groupingSource={groupingSource} radicalSelection={radicalSelection} mode={mode} onModeChange={onModeChange}/><section className="practice-info practice-detail">{/* Watch/Trace already show every stroke in the writing card, so the right column keeps
only the component breakdown; radical practice never shows a decomposition at any width. */}
{mode !== 'recall' && !familyId && decomposition && <div className="decomposition-section" onClickCapture={noteDecompositionReturn}><h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION<SourceInfo inline className="detail-footnote decomposition-footnote">Breakdowns follow source priority · BabelStone G-source first, then the recorded Hanzi graphical structure when it differs.<br/>IDS describes graphical structure only · not verified etymology or stroke geometry.<br/>Components link to their library cards.</SourceInfo></h3><RecordedDecomposition character={character} tree={decomposition.root} source={decomposition.source} status={decomposition.status} record={showEnrichment ? enrichment : null}/></div>}</section>{sheet && <PracticeSheet text={initialCharacter} pinyin={wordFact?.pinyin ?? info.reading} meaning={wordFact?.meaning ?? info.meaning} onClose={() => setSheet(false)}/>}</div></div>;
}
