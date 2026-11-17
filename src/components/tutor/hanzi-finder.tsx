import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser, Radio, Search, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findMatches, FINDER_CAP_OPTIONS, FINDER_MIN_SCORE, loadFinderIndex, referenceDrawing, type FinderIndex, type FinderStroke } from '@/lib/hanzi-finder';
import { finderRecord, FINDER_SCOPES, type FinderScope } from '@/lib/hanzi-finder-records';
import { accuracyGrade } from '@/lib/accuracy-grade';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { cardMeaning, glyphPresentation } from '@/lib/glyph-presentation';
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
 *   never guessed (the source note says so).
 * - `similar` (URL, from a detail card's "Find similar"): once the index loads,
 *   that exact glyph's recorded strokes become the drawing and are searched at
 *   once (even with Live off), with the glyph itself left out of its own
 *   results. Any edit (draw, Undo, Clear) calls `onLeaveSimilar`, so the URL
 *   then describes an ordinary drawing and the glyph can match again. A glyph
 *   without recorded strokes empties the board and says so instead of guessing.
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

/** One match tile. The speaker uses the same audio pipeline as the library grid
 *  cards (exact-reading recording first, then validated Mandarin TTS; radical
 *  variants inherit their family reading via radicalVariantFallback), so an
 *  unrecorded glyph never promises audio. Multi-reading glyphs get one speaker
 *  per exact reading, like the library tiles. */
function FinderHitTile({ hit, onOpen }: { hit: FinderHit; onOpen: () => void }) {
  const { preferences } = useWorkspace();
  const ink = glyphCardInk(hit.kind, hit.entry.script, isRadicalGlyph(hit.entry, hit.kind));
  const info = glyphPresentation(hit.glyph, hit.kind, hit.entry.pinyin, hit.entry.meaning);
  const fallback = hit.kind === 'Radicals' || hit.kind === 'Components' ? radicalVariantFallback(hit.glyph, hit.entry.pinyin) : null;
  const spoken = fallback ? fallback.spoken : info.speech;
  const reading = fallback ? fallback.reading : info.reading || null;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const rank = usageOrder.loaded ? usageRank(hit.entry, hit.kind, preferences.includeTraditional) : null;
  return <button type="button" className={`finder-hit ${ink}`} title={`Open ${hit.glyph} in ${hit.kind}`} onClick={onOpen}>
    {/* Frequency rank of the exact record the tile opens (sourced usage order only; unranked shows nothing). */}
    {rank !== null && <span className="finder-hit-rank" title={`${hit.kind === 'Characters' ? 'Corpus frequency' : hit.kind === 'Radicals' ? 'Radical assignment' : 'Component exposure'} rank`}>#{rank.toLocaleString('en-US')}</span>}
    <span className={`accuracy-grade accuracy-grade-${accuracyGrade(hit.score)} finder-hit-score`}>{hit.score}%</span>
    <FinderHitGlyph glyph={hit.glyph} traditional={hit.entry.script === 'Traditional'}/>
    {spoken && reading && isMultiReading(reading)
      ? <span className="pinyin finder-hit-pinyin"><MultiReadingSpeakers spoken={spoken} reading={reading} variant="tile" textClassName="pinyin-text" prefix={!fallback && info.componentName ? 'Name · ' : undefined}/></span>
      : <span className="pinyin finder-hit-pinyin"><span className="pinyin-text">{hit.entry.pinyin || fallback?.pinyin || ''}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? hit.glyph}`} unavailableLabel={`No audio available for ${spoken ?? hit.glyph}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => { if (spoken) await playCharacter(spoken, preferences.slow, reading); }}/></span>}
    <span className="finder-hit-meaning">{cardMeaning(hit.glyph, hit.entry.pinyin, hit.entry.meaning)}</span>
    <span className="hit-kind">{hit.kindLabel}</span>
  </button>;
}

export function HanziFinderPage({ scope, similar, onScope, onLeaveSimilar }: { scope: FinderScope; similar?: string | undefined; onScope: (scope: FinderScope) => void; onLeaveSimilar: () => void }) {
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
  const commit = (next: FinderStroke[]) => { rememberedStrokes = next; rememberedFor = undefined; setStrokes(next); if (!next.length) setOutlineGlyph(undefined); if (live || next.length === 0) setSearched(next); if (similar) onLeaveSimilar(); };
  // "Find similar": the exact glyph's recorded strokes become the drawing (null = none recorded).
  const reference = useMemo(() => index && similar ? stableReference(index, similar) : null, [index, similar]);
  useEffect(() => {
    if (!index || !similar) return;
    const next = reference ?? [];
    rememberedStrokes = next; rememberedFor = similar; setStrokes(next); setSearched(next);
    setOutlineGlyph(reference ? similar : undefined);
  }, [index, similar, reference]);
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
  const down = (e: ReactPointerEvent<SVGSVGElement>) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); setCurrent([point(e)]); };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!current) return;
    const p = point(e), last = current[current.length - 1]!;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.004) setCurrent([...current, p]);
  };
  const up = () => { if (!current) return; commit([...strokes, current]); setCurrent(null); };
  const path = (s: FinderStroke) => s.length === 1 ? `M${s[0]![0] * BOARD} ${s[0]![1] * BOARD}h0.1` : s.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * BOARD).toFixed(1)} ${(p[1] * BOARD).toFixed(1)}`).join('');

  // The finder's own mount clears any stale detail trail; opening a match records
  // the finder as the single return step, so the details window's Back button
  // returns here (with the drawing kept in rememberedStrokes), like Practice does.
  useEffect(() => { detailTrail.clear(); }, []);
  const open = (hit: (typeof hits)[number]) => {
    detailTrail.replace({ label: 'Hanzi finder', href: window.location.href });
    navigate({ to: '/characters', search: { tab: hit.kind, character: hit.glyph } });
  };
  const status = loadError ? null : !index ? 'Loading stroke data…' : similar && !reference ? `${similar} has no recorded stroke data, so the finder can’t compare it. Draw it on the board instead.` : strokes.length === 0 ? 'Draw a character on the board, one stroke at a time.' : stale ? 'Press Find to compare this drawing.' : hits.length === 0 ? `No glyph matches ${cap}% or more yet. Keep drawing, or Clear and try again.` : null;

  return <div className="finder-page library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow">DRAW · COMPARE · OPEN</div><h1>Hanzi finder</h1><p>Draw a character you don’t know how to type. The finder compares your strokes with every recorded character, component and radical and shows each match’s similarity.</p></div></div>
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
      <span>{reference ? 'Its recorded strokes are on the board and compared like a drawing. Draw, Undo or Clear to search your own drawing instead.' : ''}</span>
    </p>}
    <div className="finder-layout">
      <section className="finder-board-column" aria-label="Drawing board">
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
          <span className="finder-count" aria-live="polite">{strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'}</span>
          <Button variant="outline" disabled={!strokes.length} title="Undo the last stroke (Ctrl/⌘Z)" onClick={() => commit(strokes.slice(0, -1))}><Undo2/>Undo</Button>
          <Button variant="outline" disabled={!strokes.length} title="Clear the board" onClick={() => commit([])}><Eraser/>Clear</Button>
          <Button variant="ghost" size="sm" className={`stroke-pill canvas-switch${live ? ' is-on' : ''}`} aria-pressed={live} title={live ? 'Stop updating results after every stroke' : 'Update results after every stroke'} onClick={() => setLive(!live)}>{live ? <Check size={16} aria-hidden="true"/> : <Radio size={16} aria-hidden="true"/>}Live results</Button>
          {!live && <Button disabled={!strokes.length || !stale || !index} onClick={() => setSearched(strokes)}><Search/>Find</Button>}
        </div>
        <p className="library-source-note">Compared with recorded stroke data from Hanzi Writer Data (Make Me a Hanzi). Glyphs without recorded strokes can’t be found. Percentages show similarity, not certainty.</p>
      </section>
      <section className="finder-results" aria-label="Matches">
        <div className="finder-results-head"><h2>{similar && reference ? <>Similar to <span lang="zh-CN">{similar}</span></> : 'Matches'}</h2>{!status && <span className="finder-results-count">{hits.length} at {cap}% or more</span>}</div>
        {loadError ? <div className="record-gap"><p>Stroke data couldn’t load.</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button></div>
          : status ? <div className="record-gap"><p>{status}</p></div>
          : <div className="finder-hits"><IncrementalList items={hits} resetKey={results} chunk={60} renderItem={hit => <FinderHitTile key={hit.glyph} hit={hit} onOpen={() => open(hit)}/>}/></div>}
      </section>
    </div>
  </div>;
}
