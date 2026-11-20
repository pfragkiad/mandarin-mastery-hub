import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PenLine, Check, Eraser, Radio, Search, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SourceInfo } from './source-info';
import { findMatches, FINDER_CAP_OPTIONS, FINDER_MIN_SCORE, loadFinderIndex, referenceDrawing, type FinderIndex, type FinderStroke } from '@/lib/hanzi-finder';
import { finderDestination, finderRecord, FINDER_SCOPES, type FinderScope } from '@/lib/hanzi-finder-records';
import { accuracyGrade } from '@/lib/accuracy-grade';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { cardMeaning, glyphPresentation } from '@/lib/glyph-presentation';
import { characterMeaning } from '@/lib/vocabulary-meaning';
import { radicalVariantFallback, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { detailTrail } from '@/lib/detail-trail';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import { IncrementalList } from './incremental-list';
import { TileSpeaker } from './tile-speaker';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { loadStrokeGeometry, type StrokeGeometry } from '@/lib/character-enrichment';

/**
 * HanziFinderPage — draw a character on the board and see the catalogue glyphs
 * whose recorded strokes resemble it, each with a similarity percentage.
 *
 * Inputs: `scope` (URL-backed: all kinds or one library) and `onScope`, which
 * pushes the choice into the URL so Back restores it.
 * State: the drawn strokes (kept in a module variable too, so opening a result
 * and coming Back shows the same drawing), the lazily loaded comparison index,
 * the remembered "Live results" switch, the remembered similarity cutoff
 * (40/50/60%, default 50) and the last searched drawing.
 *
 * Tricky parts:
 * - Live on (default): every finished stroke re-runs the search after a paint,
 *   so drawing never stutters. Live off: results wait for the Find button, the
 *   explicit-apply rule the rest of the app's searches follow.
 * - One exact glyph is one result even when it is a record in several
 *   libraries (finderRecord: the radical card wins, as glyph links do), and the
 *   Traditional preference applies before any comparison.
 * - Only glyphs with recorded Hanzi Writer geometry can match; the rest are
 *   never guessed (the title's (i) note says so).
 * - `similar` (URL, from a detail card's "Find similar"): once the index loads,
 *   that exact glyph's recorded strokes become the drawing and are searched at
 *   once (even with Live off), with the glyph itself left out of its own
 *   results. Any edit (draw, Undo, Clear) calls `onLeaveSimilar`, so the URL
 *   then describes an ordinary drawing and the glyph can match again. A glyph
 *   without recorded strokes empties the board and says so instead of guessing.
 * - Every match tile repeats that action beside the drawn character (FinderHitTile's
 *   `finder-hit-similar` button), so a match can become the reference without
 *   opening its card first: `onSimilar` writes the same `similar` URL, the board
 *   takes that glyph's recorded strokes and the results re-run without it.
 * - What the board SHOWS for those reference strokes is the glyph's exact
 *   recorded Hanzi Writer outline (the same shapes Trace draws), not the
 *   8-point centre lines used for matching. A stroke shows its outline only
 *   while it is still the very same reference stroke object (identity check),
 *   so Undo keeps the remaining outline strokes and anything the learner adds
 *   is drawn as their own line. The outline is fitted with the same bounding-
 *   box transform referenceDrawing applies, and it is shown only for an exact
 *   code-point record with a matching stroke count; otherwise (or on a failed
 *   load) the centre lines show instead of a substituted shape.
 */
let rememberedStrokes: FinderStroke[] = [];
// The learner's own drawing (every draw/Undo/Clear), kept so Back from a tile's
// "Find similar" switch can put it back on the board instead of leaving the
// reference glyph's strokes with no banner to explain them.
let rememberedOwn: FinderStroke[] = [];
// Which `similar` glyph rememberedStrokes belongs to, so Back from a match shows it without a blank frame.
let rememberedFor: string | undefined;
// Which glyph's recorded outline the board's reference strokes belong to (survives leaving "similar" mode and Back).
let rememberedOutlineGlyph: string | undefined;
// One stable reference drawing per glyph, so stroke identity (outline vs own line) survives remounts.
const referenceCache = new Map<string, FinderStroke[] | null>();
function stableReference(index: FinderIndex, glyph: string): FinderStroke[] | null {
  if (!referenceCache.has(glyph)) referenceCache.set(glyph, referenceDrawing(index, glyph));
  return referenceCache.get(glyph) ?? null;
}
type BoardOutline = { glyph: string; ready: true; transform: string; paths: string[] } | { glyph: string; ready: false; failed: boolean };
/** SVG transform placing Hanzi Writer outlines (1024 box, y up, baseline 900) exactly where
 *  referenceDrawing puts the same glyph's medians: joint median bounding box, aspect kept,
 *  centred, 80% of the board. */
function outlineTransform(medians: StrokeGeometry['medians']): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of medians) for (const [x, y] of stroke) { const yd = 900 - y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, yd); maxY = Math.max(maxY, yd); }
  const size = Math.max(maxX - minX, maxY - minY, 1);
  const k = 0.8 * BOARD / size, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return `translate(${(BOARD / 2 - k * cx).toFixed(2)} ${(k * (900 - cy) + BOARD / 2).toFixed(2)}) scale(${k.toFixed(5)} ${(-k).toFixed(5)})`;
}
const LIVE_KEY = 'tutor-finder-live';
// The board sits on the left and the first matches sit to its right as the same small tiles
// used below, so results stay in view while drawing at every width. The board takes half the
// row while that leaves a comfortable square; on narrower containers it keeps up to
// BOARD_NARROW_MAX px and leaves at least one tile column beside it. Everything is measured on
// the finder's own container (never a device width).
const SIDE_GAP = 16;          // board ↔ side tiles; kept in step with the CSS column gap
const TILE_MIN = 124;         // smallest match tile; same as .finder-hits minmax(124px, 1fr)
const TILE_GAP = 10;          // gap between tiles; same as .finder-hits gap
const BOARD_NARROW_MAX = 300; // board size on containers too narrow for halves
const TILE_ESTIMATE = 196;    // tile height used until a real tile has been measured
/** Board width for a container: half the row, or on narrow containers up to BOARD_NARROW_MAX
 *  while one tile column still fits beside it. Continuous in the width, so resizing never jumps. */
export function finderBoardFor(width: number) {
  const half = (width - SIDE_GAP) / 2;
  return Math.floor(Math.max(half, Math.min(width - TILE_MIN - SIDE_GAP, BOARD_NARROW_MAX)));
}
/** How many tile columns fit in the space beside the board (at least one). */
export function finderSideColumnsFor(sideWidth: number) {
  return Math.max(1, Math.floor((sideWidth + TILE_GAP) / (TILE_MIN + TILE_GAP)));
}
/** How many matches sit beside the board: full rows of tiles that fit next to the board column
 *  (at least one row), the rest continue below. */
export function finderBesideCount(columns: number, availableHeight: number, tileHeight: number) {
  const rows = Math.max(1, Math.floor((availableHeight + TILE_GAP) / (tileHeight + TILE_GAP)));
  return columns * rows;
}
type FinderLayoutState = { board: number | null; beside: number };
/** Measures the container, the board column and a side tile (refs returned for each), and
 *  derives the board width and how many matches fit beside it. Re-measures on resize and after
 *  every render (cheap reads, state only changes when the numbers do), so new results, wrapped
 *  controls or late fonts settle without a loop: the board width depends only on the container. */
function useFinderLayout() {
  const layoutRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<FinderLayoutState>({ board: null, beside: 4 });
  const measure = useRef(() => {});
  measure.current = () => {
    const el = layoutRef.current, col = boardRef.current;
    const w = el?.clientWidth;
    if (!el || !col || !w) return;
    const board = finderBoardFor(w);
    const columns = finderSideColumnsFor(w - board - SIDE_GAP);
    const side = sideRef.current;
    const tiles = side ? Array.from(side.children) as HTMLElement[] : [];
    const tileHeight = tiles.length ? Math.max(...tiles.map(t => t.offsetHeight)) : TILE_ESTIMATE;
    const available = side ? col.getBoundingClientRect().bottom - side.getBoundingClientRect().top : col.offsetHeight;
    const beside = finderBesideCount(columns, available, tileHeight);
    setState(prev => prev.board === board && prev.beside === beside ? prev : { board, beside });
  };
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure.current());
    if (layoutRef.current) ro.observe(layoutRef.current);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { measure.current(); });
  return { layoutRef, boardRef, sideRef, ...state };
}
const CAP_KEY = 'tutor-finder-cap';
const BOARD = 300;

type FinderHit = { glyph: string; score: number; kind: LibraryKind; kindLabel: string; entry: LibraryEntry };

/** The match's hanzi drawn as its exact recorded Hanzi Writer outline in a small
 *  grid square (same 1024 box and baseline Trace uses), as static SVG paths, so
 *  a long list never runs a writer per tile. Inputs: the exact glyph and whether
 *  it is a Traditional form (purple ink). Geometry is fetched only once the tile
 *  scrolls near view (shared per-glyph cache). While it loads the square stays
 *  empty; if no exact code-point outline exists (404, non-exact supplementary
 *  source, failed load) the glyph is shown as text instead, never a substituted
 *  shape. */
function FinderHitGlyph({ glyph, traditional }: { glyph: string; traditional: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [paths, setPaths] = useState<string[] | null | 'failed'>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setPaths(null);
    loadStrokeGeometry(glyph).then(({ data, source }) => { if (active) setPaths(source && !source.exact ? 'failed' : data.strokes); }, () => { if (active) setPaths('failed'); });
    return () => { active = false; };
  }, [glyph, visible]);
  const cls = `finder-hit-glyph${traditional ? ' traditional-character' : ''}`;
  return <span ref={box} className={cls} lang="zh-CN" role="img" aria-label={glyph}>
    {paths === 'failed' ? <strong aria-hidden="true">{glyph}</strong>
      : paths && <svg viewBox="0 0 1024 1024" aria-hidden="true"><g transform="scale(1, -1) translate(0, -900)">{paths.map((d, i) => <path key={i} d={d}/>)}</g></svg>}
  </span>;
}

/** Pinyin + speaker for one exact catalogue record, shared by the match tiles and the
 *  "Similar to" reference banner so the reference reads and sounds like its own match.
 *  The audio goes through the same pipeline as the library grid cards (exact-reading
 *  recording first, then validated Mandarin TTS), and a radical variant form (⻏) inherits
 *  its family reading through radicalVariantFallback, so an unrecorded glyph never
 *  promises audio. Multi-reading glyphs ("liào / liǎo") get one speaker per reading.
 *  Inputs: the exact glyph, its library kind and record; `textClassName` styles the
 *  reading text like the surrounding surface's pinyin. Renders nothing when the record
 *  has neither a reading nor a pinyin, so an empty line never appears. */
export function RecordReading({ glyph, kind, entry, textClassName }: { glyph: string; kind: LibraryKind; entry: LibraryEntry; textClassName: string }) {
  const { preferences } = useWorkspace();
  const info = glyphPresentation(glyph, kind, entry.pinyin, entry.meaning);
  // A variant form is qualified by its exact family + form key, as on its card.
  const fallback = kind === 'Radicals' || kind === 'Components' ? radicalVariantFallback(glyph, entry.pinyin, entry.radicalVariant ? entry.kangxiIndex : undefined, entry.radicalVariant) : null;
  const spoken = fallback ? fallback.spoken : info.speech;
  const reading = fallback ? fallback.reading : info.reading || null;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const pinyin = entry.pinyin || fallback?.pinyin || '';
  if (!spoken && !pinyin) return null;
  return <span className={`pinyin ${textClassName}`}>
    {spoken && reading && isMultiReading(reading)
      ? <MultiReadingSpeakers spoken={spoken} reading={reading} variant="tile" textClassName="pinyin-text" prefix={!fallback && info.componentName ? 'Name · ' : undefined}/>
      : <><span className="pinyin-text">{pinyin}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? glyph}`} unavailableLabel={`No audio available for ${spoken ?? glyph}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => { if (spoken) await playCharacter(spoken, preferences.slow, reading); }}/></>}
  </span>;
}

/** One match tile. Its reading line is the shared RecordReading block (exact-reading
 *  recording first, then validated Mandarin TTS; radical variants inherit their family
 *  reading via radicalVariantFallback), so an unrecorded glyph never promises audio and
 *  multi-reading glyphs get one speaker per exact reading, like the library tiles.
 *
 *  Two controls, never nested: the character box and the reading/meaning block are
 *  each a `finder-hit-open` button that opens the glyph's card (one button cannot
 *  hold another, so the tile's open target is split in two), and the small button
 *  pinned to the tile's top-right corner (`finder-hit-similar`) makes this match the
 *  finder's reference instead — the same action a detail card's "Find similar" performs, so the board
 *  takes this glyph's recorded strokes and the results become "Similar to <glyph>".
 *  The same tile is used beside the board and in the list below it. */
export function FinderHitTile({ hit, onOpen, onSimilar }: { hit: FinderHit; onOpen: () => void; onSimilar: () => void }) {
  const { preferences } = useWorkspace();
  const ink = glyphCardInk(hit.kind, hit.entry.script, isRadicalGlyph(hit.entry, hit.kind));
  const rank = usageOrder.loaded ? usageRank(hit.entry, hit.kind, preferences.includeTraditional) : null;
  return <div className={`finder-hit ${ink}`}>
    {/* Frequency rank of the exact record the tile opens (sourced usage order only; unranked shows nothing). */}
    {rank !== null && <span className="finder-hit-rank" title={`${hit.kind === 'Characters' ? 'Corpus frequency' : hit.kind === 'Radicals' ? 'Radical assignment' : 'Component exposure'} rank`}>#{rank.toLocaleString('en-US')}</span>}
    {/* The match percentage sits centred in the tile's header row, between the rank
        (top-left) and the reference pen (top-right). */}
    <span className={`accuracy-grade accuracy-grade-${accuracyGrade(hit.score)} finder-hit-score`}>{hit.score}%</span>
    {/* The pen is a sibling of both open buttons (a button cannot hold another) and is
        pinned to the header's right edge, so it never shares the card's clickable target. */}
    <button type="button" className="finder-hit-similar" title={`Find similar to ${hit.glyph}`} aria-label={`Find similar to ${hit.glyph}`} onClick={onSimilar}><PenLine size={16} aria-hidden="true"/></button>
    <button type="button" className="finder-hit-open finder-hit-glyph-open" title={`Open ${hit.glyph} in ${hit.kind}`} onClick={onOpen}><FinderHitGlyph glyph={hit.glyph} traditional={hit.entry.script === 'Traditional'}/></button>
    <button type="button" className="finder-hit-open finder-hit-text" title={`Open ${hit.glyph} in ${hit.kind}`} onClick={onOpen}>
    <RecordReading glyph={hit.glyph} kind={hit.kind} entry={hit.entry} textClassName="finder-hit-pinyin"/>
    <span className="finder-hit-meaning">{(hit.kind === 'Characters' ? characterMeaning : cardMeaning)(hit.glyph, hit.entry.pinyin, hit.entry.meaning)}</span>
    <span className="hit-kind">{hit.kindLabel}</span>
    </button>
  </div>;
}

export function HanziFinderPage({ scope, similar, onScope, onLeaveSimilar, onSimilar }: { scope: FinderScope; similar?: string | undefined; onScope: (scope: FinderScope) => void; onLeaveSimilar: () => void; onSimilar: (glyph: string) => void }) {
  const navigate = useNavigate();
  const { preferences, catalogVersion } = useWorkspace();
  const initial = similar && rememberedFor !== similar ? [] : rememberedStrokes;
  const [strokes, setStrokes] = useState<FinderStroke[]>(initial);
  const [current, setCurrent] = useState<[number, number][] | null>(null);
  const [index, setIndex] = useState<FinderIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [live, setLiveState] = useState(true);
  // The drawing the shown results belong to; Live keeps it equal to `strokes`.
  const [searched, setSearched] = useState<FinderStroke[]>(initial);
  useEffect(() => { try { const saved = localStorage.getItem(LIVE_KEY); if (saved !== null) setLiveState(saved === '1'); } catch { /* storage unavailable */ } }, []);
  const setLive = (value: boolean) => { setLiveState(value); try { localStorage.setItem(LIVE_KEY, value ? '1' : '0'); } catch { /* ignore */ } if (value) setSearched(strokes); };
  // Similarity cutoff (40/50/60%), remembered like Live results; only listed matches change, never the scores.
  const [cap, setCapState] = useState<number>(FINDER_MIN_SCORE);
  useEffect(() => { try { const saved = Number(localStorage.getItem(CAP_KEY)); if ((FINDER_CAP_OPTIONS as readonly number[]).includes(saved)) setCapState(saved); } catch { /* storage unavailable */ } }, []);
  const setCap = (value: number) => { setCapState(value); try { localStorage.setItem(CAP_KEY, String(value)); } catch { /* ignore */ } };
  useEffect(() => { let active = true; setLoadError(false); loadFinderIndex().then(i => { if (active) setIndex(i); }).catch(() => { if (active) setLoadError(true); }); return () => { active = false; }; }, [retry]);
  const [outlineGlyph, setOutlineGlyphState] = useState<string | undefined>(similar && rememberedFor !== similar ? undefined : rememberedOutlineGlyph);
  const setOutlineGlyph = (glyph: string | undefined) => { rememberedOutlineGlyph = glyph; setOutlineGlyphState(glyph); };
  const commit = (next: FinderStroke[]) => { rememberedStrokes = next; rememberedOwn = next; rememberedFor = undefined; setStrokes(next); if (!next.length) setOutlineGlyph(undefined); if (live || next.length === 0) setSearched(next); if (similar) onLeaveSimilar(); };
  // "Find similar": the exact glyph's recorded strokes become the drawing (null = none recorded).
  const reference = useMemo(() => index && similar ? stableReference(index, similar) : null, [index, similar]);
  useEffect(() => {
    if (!index || !similar) return;
    const next = reference ?? [];
    rememberedStrokes = next; rememberedFor = similar; setStrokes(next); setSearched(next);
    setOutlineGlyph(reference ? similar : undefined);
  }, [index, similar, reference]);
  // Back from a match tile's "Find similar" switch: the URL no longer names a reference, but the
  // board still holds that glyph's recorded strokes, so the learner's own drawing goes back on it.
  useEffect(() => {
    if (!index || similar || rememberedFor === undefined) return;
    rememberedFor = undefined;
    rememberedStrokes = rememberedOwn;
    setStrokes(rememberedOwn);
    setSearched(rememberedOwn);
    setOutlineGlyph(undefined);
  }, [index, similar]);
  // The exact recorded outline for the reference strokes (see the header note).
  const [outline, setOutline] = useState<BoardOutline | null>(null);
  useEffect(() => {
    if (!outlineGlyph) { setOutline(null); return; }
    let active = true;
    setOutline({ glyph: outlineGlyph, ready: false, failed: false });
    const fail = () => { if (active) setOutline({ glyph: outlineGlyph, ready: false, failed: true }); };
    loadStrokeGeometry(outlineGlyph).then(({ data, source }) => {
      if (!active) return;
      const ref = referenceCache.get(outlineGlyph);
      if ((source && !source.exact) || !ref || data.strokes.length !== ref.length) { fail(); return; }
      setOutline({ glyph: outlineGlyph, ready: true, transform: outlineTransform(data.medians), paths: data.strokes });
    }).catch(fail);
    return () => { active = false; };
  }, [outlineGlyph]);
  const outlineStrokes = outline?.ready ? referenceCache.get(outline.glyph) ?? null : null;
  const isOutlined = (s: FinderStroke, i: number) => Boolean(outlineStrokes && outlineStrokes[i] === s);
  // While the outline loads, its reference strokes stay blank (no centre-line flash); a failed load shows the centre lines.
  const pendingStrokes = outline && !outline.ready && !outline.failed ? referenceCache.get(outline.glyph) ?? null : null;
  const isPending = (s: FinderStroke, i: number) => Boolean(pendingStrokes && pendingStrokes[i] === s);
  const similarRecord = similar ? finderRecord(similar, 'all', true) : null;

  // Results: computed after the stroke has painted, so pointer-up never waits for the search.
  const [results, setResults] = useState<{ glyph: string; score: number }[]>([]);
  useEffect(() => {
    if (!index || !searched.length) { setResults([]); return; }
    const timer = window.setTimeout(() => {
      const accept = (glyph: string) => glyph !== similar && finderRecord(glyph, scope, preferences.includeTraditional) !== null;
      setResults(findMatches(searched, index, accept, cap));
    }, 16);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion re-runs the search once the catalogue hydrates
  }, [index, searched, scope, similar, cap, preferences.includeTraditional, catalogVersion]);
  const hits = useMemo(() => results.flatMap(r => { const record = finderRecord(r.glyph, scope, preferences.includeTraditional); return record ? [{ ...r, ...record }] : []; }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion: records resolve after hydration
    [results, scope, preferences.includeTraditional, catalogVersion]);
  const stale = !live && searched !== strokes && strokes.length > 0;

  // Ctrl/⌘Z undoes the last stroke unless typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!rememberedStrokes.length) return;
      e.preventDefault(); commit(rememberedStrokes.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Pointer drawing in board units (0..1); points closer than ~1px are skipped.
  const svg = useRef<SVGSVGElement>(null);
  const point = (e: ReactPointerEvent): [number, number] => {
    const box = svg.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)), Math.min(1, Math.max(0, (e.clientY - box.top) / box.height))];
  };
  // The stroke being drawn lives in a ref as well as in state: pointer handlers
  // can fire several times before React commits the previous update, and a
  // handler reading the `current` state from its own render would then see the
  // stroke it has not yet recorded (or none at all) and drop it. The ref is the
  // live source of truth; `current` state only mirrors it for painting.
  const currentRef = useRef<[number, number][] | null>(null);
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = [point(e)];
    currentRef.current = start;
    setCurrent(start);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const drawing = currentRef.current;
    if (!drawing) return;
    const p = point(e), last = drawing[drawing.length - 1]!;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) <= 0.004) return;
    const next = [...drawing, p];
    currentRef.current = next;
    setCurrent(next);
  };
  // Finished strokes are appended from `rememberedStrokes` (updated synchronously), never from the
  // `strokes` state: two strokes finished inside one render would otherwise read the same stale
  // value and the earlier one would be replaced instead of kept.
  const up = () => {
    const drawing = currentRef.current;
    currentRef.current = null;
    setCurrent(null);
    if (drawing) commit([...rememberedStrokes, drawing]);
  };
  const path = (s: FinderStroke) => s.length === 1 ? `M${s[0]![0] * BOARD} ${s[0]![1] * BOARD}h0.1` : s.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * BOARD).toFixed(1)} ${(p[1] * BOARD).toFixed(1)}`).join('');

  // The finder's own mount clears any stale detail trail; opening a match records
  // the finder as the single return step, so the details window's Back button
  // returns here (with the drawing kept in rememberedStrokes), like Practice does.
  useEffect(() => { detailTrail.clear(); }, []);
  const open = (hit: (typeof hits)[number]) => {
    detailTrail.replace({ label: 'Hanzi finder', href: window.location.href });
    navigate({ to: '/characters', search: finderDestination(hit.kind, hit.entry) });
  };
  const { layoutRef, boardRef, sideRef, board, beside } = useFinderLayout();
  const tile = (hit: (typeof hits)[number]) => <FinderHitTile key={hit.glyph} hit={hit} onOpen={() => open(hit)} onSimilar={() => onSimilar(hit.glyph)}/>;
  const status = loadError ? null : !index ? 'Loading stroke data…' : similar && !reference ? `${similar} has no recorded stroke data, so the finder can’t compare it. Draw it on the board instead.` : strokes.length === 0 ? 'Draw a character on the board, one stroke at a time.' : stale ? 'Press Find to compare this drawing.' : hits.length === 0 ? `No glyph matches ${cap}% or more yet. Keep drawing, or Clear and try again.` : null;

  return <div className="finder-page library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow">DRAW · COMPARE · OPEN</div><h1>Hanzi finder<SourceInfo inline className="detail-footnote">Compared with recorded stroke data from Hanzi Writer Data (Make Me a Hanzi), plus AnimCJK outlines for a few radical forms<br/>Glyphs without recorded strokes can’t be found<br/>Percentages show similarity, not certainty</SourceInfo></h1><p className="finder-intro">Draw a character to find it. Each match shows how similar it looks.</p></div></div>
    <div className="lesson-filter finder-scope" role="group" aria-label="Search in">
      {FINDER_SCOPES.map(s => <Button key={s.key} size="sm" variant={scope === s.key ? 'default' : 'outline'} aria-pressed={scope === s.key} onClick={() => onScope(s.key)}>{s.label}</Button>)}
      <span className="finder-cap" role="group" aria-label="Minimum similarity">
        {FINDER_CAP_OPTIONS.map(c => <Button key={c} size="sm" variant={cap === c ? 'default' : 'outline'} aria-pressed={cap === c} title={`Show matches scoring ${c}% or more`} onClick={() => setCap(c)}>{c}%+</Button>)}
      </span>
    </div>
    {/* "Find similar" banner: names the glyph whose recorded strokes are on the board and opens its card. */}
    {similar && <p className="finder-similar-note">
      <span>Similar to</span>
      {similarRecord
        ? <button type="button" className={`finder-similar-glyph ${glyphCardInk(similarRecord.kind, similarRecord.entry.script, isRadicalGlyph(similarRecord.entry, similarRecord.kind))}`} title={`Open ${similar} in ${similarRecord.kind}`} onClick={() => open({ glyph: similar, score: 100, ...similarRecord })}><strong lang="zh-CN">{similar}</strong></button>
        : <strong lang="zh-CN" className="finder-similar-glyph">{similar}</strong>}
      {/* The reference's own reading, right beside its tile: the same pinyin + speaker a
          match tile shows, so the glyph being compared can be heard without opening it. */}
      {similarRecord && <RecordReading glyph={similar} kind={similarRecord.kind} entry={similarRecord.entry} textClassName="finder-similar-pinyin"/>}
      <span>{reference ? 'Its recorded strokes are on the board and compared like a drawing. Draw, Undo or Clear to search your own drawing instead.' : ''}</span>
    </p>}
    {/* The board (left) and the first matches (right, as many small tiles as fit beside the board
        column); the remaining matches continue below across the full width. */}
    <div ref={layoutRef} className="finder-layout" style={board ? { gridTemplateColumns: `${board}px minmax(0, 1fr)` } : undefined}>
      <section ref={boardRef} className="finder-board-column" aria-label="Drawing board">
        <div className="writer-board finder-board"><div className="writing-grid">
          <svg ref={svg} className="finder-canvas" viewBox={`0 0 ${BOARD} ${BOARD}`} role="img" aria-label={`Drawing board, ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'} drawn`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {outline?.ready && <g className="finder-outline" transform={outline.transform} aria-hidden="true">
              {strokes.map((s, i) => isOutlined(s, i) ? <path key={i} d={outline.paths[i]}/> : null)}
            </g>}
            {strokes.map((s, i) => isOutlined(s, i) || isPending(s, i) ? null : <path key={i} d={path(s)}/>)}
            {current && <path d={path(current)}/>}
          </svg>
        </div></div>
        <div className="finder-controls">
          <Button variant="outline" disabled={!strokes.length} title="Undo the last stroke (Ctrl/⌘Z)" onClick={() => commit(rememberedStrokes.slice(0, -1))}><Undo2/>Undo</Button>
          <Button variant="outline" disabled={!strokes.length} title="Clear the board" onClick={() => commit([])}><Eraser/>Clear</Button>
          <Button variant="ghost" size="sm" className={`stroke-pill canvas-switch${live ? ' is-on' : ''}`} aria-pressed={live} title={live ? 'Stop updating results after every stroke' : 'Update results after every stroke'} onClick={() => setLive(!live)}>{live ? <Check size={16} aria-hidden="true"/> : <Radio size={16} aria-hidden="true"/>}Live results</Button>
          {!live && <Button disabled={!strokes.length || !stale || !index} onClick={() => setSearched(strokes)}><Search/>Find</Button>}
        </div>
      </section>
      <section className="finder-results" aria-label="Matches">
        <div className="finder-results-head"><h2>{similar && reference ? <>Similar to <span lang="zh-CN">{similar}</span>{similarRecord && <RecordReading glyph={similar} kind={similarRecord.kind} entry={similarRecord.entry} textClassName="finder-heading-pinyin"/>}</> : 'Matches'}</h2><span className="finder-count" aria-live="polite">{strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'} drawn</span>{!status && <span className="finder-results-count">{hits.length} at {cap}% or more</span>}</div>
        {loadError ? <div className="record-gap"><p className="finder-status">Stroke data couldn’t load.</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button></div>
          : status ? <div className="record-gap"><p className="finder-status">{status}</p></div>
          : <div ref={sideRef} className="finder-hits finder-hits-side">{hits.slice(0, beside).map(hit => tile(hit))}</div>}
      </section>
      {!status && !loadError && hits.length > beside && <section className="finder-hits finder-rest" aria-label="More matches">
        <IncrementalList items={hits.slice(beside)} resetKey={results} chunk={60} renderItem={hit => tile(hit)}/>
      </section>}
    </div>
  </div>;
}
