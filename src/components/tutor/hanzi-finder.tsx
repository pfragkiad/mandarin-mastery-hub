import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Check, Eraser, Radio, Search, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findMatches, FINDER_MIN_SCORE, loadFinderIndex, type FinderIndex, type FinderStroke } from '@/lib/hanzi-finder';
import { finderRecord, FINDER_SCOPES, type FinderScope } from '@/lib/hanzi-finder-records';
import { accuracyGrade } from '@/lib/accuracy-grade';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { cardMeaning, glyphPresentation } from '@/lib/glyph-presentation';
import { radicalVariantFallback, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import { IncrementalList } from './incremental-list';
import { TileSpeaker } from './tile-speaker';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';

/**
 * HanziFinderPage — draw a character on the board and see the catalogue glyphs
 * whose recorded strokes resemble it, each with a similarity percentage.
 *
 * Inputs: `scope` (URL-backed: all kinds or one library) and `onScope`, which
 * pushes the choice into the URL so Back restores it.
 * State: the drawn strokes (kept in a module variable too, so opening a result
 * and coming Back shows the same drawing), the lazily loaded comparison index,
 * the remembered "Live results" switch and the last searched drawing.
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
 */
let rememberedStrokes: FinderStroke[] = [];
const LIVE_KEY = 'tutor-finder-live';
const BOARD = 300;

export function HanziFinderPage({ scope, onScope }: { scope: FinderScope; onScope: (scope: FinderScope) => void }) {
  const navigate = useNavigate();
  const { preferences, catalogVersion } = useWorkspace();
  const [strokes, setStrokes] = useState<FinderStroke[]>(rememberedStrokes);
  const [current, setCurrent] = useState<[number, number][] | null>(null);
  const [index, setIndex] = useState<FinderIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [live, setLiveState] = useState(true);
  // The drawing the shown results belong to; Live keeps it equal to `strokes`.
  const [searched, setSearched] = useState<FinderStroke[]>(rememberedStrokes);
  useEffect(() => { try { const saved = localStorage.getItem(LIVE_KEY); if (saved !== null) setLiveState(saved === '1'); } catch { /* storage unavailable */ } }, []);
  const setLive = (value: boolean) => { setLiveState(value); try { localStorage.setItem(LIVE_KEY, value ? '1' : '0'); } catch { /* ignore */ } if (value) setSearched(strokes); };
  useEffect(() => { let active = true; setLoadError(false); loadFinderIndex().then(i => { if (active) setIndex(i); }).catch(() => { if (active) setLoadError(true); }); return () => { active = false; }; }, [retry]);
  const commit = (next: FinderStroke[]) => { rememberedStrokes = next; setStrokes(next); if (live || next.length === 0) setSearched(next); };

  // Results: computed after the stroke has painted, so pointer-up never waits for the search.
  const [results, setResults] = useState<{ glyph: string; score: number }[]>([]);
  useEffect(() => {
    if (!index || !searched.length) { setResults([]); return; }
    const timer = window.setTimeout(() => {
      const accept = (glyph: string) => finderRecord(glyph, scope, preferences.includeTraditional) !== null;
      setResults(findMatches(searched, index, accept));
    }, 16);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion re-runs the search once the catalogue hydrates
  }, [index, searched, scope, preferences.includeTraditional, catalogVersion]);
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

  const open = (hit: (typeof hits)[number]) => navigate({ to: '/characters', search: { tab: hit.kind, character: hit.glyph } });
  const status = loadError ? null : !index ? 'Loading stroke data…' : strokes.length === 0 ? 'Draw a character on the board, one stroke at a time.' : stale ? 'Press Find to compare this drawing.' : hits.length === 0 ? `No glyph matches ${FINDER_MIN_SCORE}% or more yet. Keep drawing, or Clear and try again.` : null;

  return <div className="finder-page library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow">DRAW · COMPARE · OPEN</div><h1>Hanzi finder</h1><p>Draw a character you don’t know how to type. The finder compares your strokes with every recorded character, component and radical and shows each match’s similarity.</p></div></div>
    <div className="lesson-filter finder-scope" role="group" aria-label="Search in">
      {FINDER_SCOPES.map(s => <Button key={s.key} size="sm" variant={scope === s.key ? 'default' : 'outline'} aria-pressed={scope === s.key} onClick={() => onScope(s.key)}>{s.label}</Button>)}
    </div>
    <div className="finder-layout">
      <section className="finder-board-column" aria-label="Drawing board">
        <div className="writer-board finder-board"><div className="writing-grid">
          <svg ref={svg} className="finder-canvas" viewBox={`0 0 ${BOARD} ${BOARD}`} role="img" aria-label={`Drawing board, ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'} drawn`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {strokes.map((s, i) => <path key={i} d={path(s)}/>)}
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
        <div className="finder-results-head"><h2>Matches</h2>{!status && <span className="finder-results-count">{hits.length} at {FINDER_MIN_SCORE}% or more</span>}</div>
        {loadError ? <div className="record-gap"><p>Stroke data couldn’t load.</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Try again</Button></div>
          : status ? <div className="record-gap"><p>{status}</p></div>
          : <div className="finder-hits"><IncrementalList items={hits} resetKey={results} chunk={60} renderItem={hit => <FinderHitTile key={hit.glyph} hit={hit} onOpen={() => open(hit)}/>}/></div>}
      </section>
    </div>
  </div>;
}
