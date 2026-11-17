/**
 * Hanzi finder matching (browser-safe, no React).
 *
 * Purpose: rank catalogue glyphs by how closely their recorded stroke centre
 * lines (public/data/finder-medians.json, built by scripts/build-finder-medians.py
 * from Hanzi Writer Data only) resemble a learner's drawing.
 *
 * Inputs: the drawing as strokes of [x, y] points in board units (0..1, y down)
 * and the decoded index. Output: { glyph, score } with score 0..100, a
 * similarity — never a probability that the drawing "is" that glyph.
 *
 * How a score is made (tricky parts):
 * - Both sides are resampled to the same number of points per stroke and scaled
 *   by their own bounding box (aspect kept, centred), so drawing size and
 *   placement on the board don't matter, only the strokes' shapes and layout.
 * - Two strokes compare by mean point distance; a stroke drawn backwards is
 *   compared reversed with a small penalty, so direction counts but never hides
 *   the right glyph.
 * - Strokes pair up two ways and the better total wins: in drawing order (a DP
 *   alignment where an extra or missing stroke costs GAP), and order-free
 *   (greedy best pairs plus a small penalty), so a slightly wrong stroke order
 *   still finds the glyph.
 * - Glyphs whose stroke count is far from the drawing's are skipped before any
 *   comparison; this keeps a whole-catalogue search fast enough for every stroke.
 */
export type FinderPoint = readonly [number, number];
export type FinderStroke = readonly FinderPoint[];
export type FinderIndexFile = { points: number; grid: number; alphabet: string; glyphs: Record<string, string>; source: { name: string; version: string; derivedFrom: string; license: string } };
export type FinderCandidate = { glyph: string; strokes: Float32Array[] };
export type FinderIndex = { points: number; candidates: FinderCandidate[]; byCount: Map<number, FinderCandidate[]>; byGlyph: Map<string, FinderCandidate>; source: FinderIndexFile['source'] };
export type FinderMatch = { glyph: string; score: number };

/** Cost of an unmatched (extra or missing) stroke, in bounding-box units. */
const GAP = 0.3;
/** Extra cost for comparing a stroke reversed (drawn in the wrong direction). */
const REVERSED = 0.08;
/** Per-stroke penalty for the order-free pairing, so correct order wins ties. */
const ORDER_FREE = 0.025;
/** Mean per-stroke cost that scores 0%; 0 cost scores 100%. */
const ZERO_AT = 0.32;
/** Default similarity cutoff; the page offers FINDER_CAP_OPTIONS as a switch. */
export const FINDER_MIN_SCORE = 50;
/** The cutoffs the finder page's switch offers, lowest first. */
export const FINDER_CAP_OPTIONS = [40, 50, 60] as const;

/** Equidistant resampling along a polyline, as the build script does. */
export function resampleStroke(stroke: FinderStroke, n: number): [number, number][] {
  if (stroke.length === 0) return [];
  if (stroke.length === 1) return Array.from({ length: n }, () => [stroke[0]![0], stroke[0]![1]]);
  const lengths = [0];
  for (let i = 1; i < stroke.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(stroke[i]![0] - stroke[i - 1]![0], stroke[i]![1] - stroke[i - 1]![1]));
  const total = lengths[lengths.length - 1]!;
  if (total === 0) return Array.from({ length: n }, () => [stroke[0]![0], stroke[0]![1]]);
  const out: [number, number][] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = total * i / (n - 1);
    while (j < stroke.length - 2 && lengths[j + 1]! < target) j++;
    const seg = lengths[j + 1]! - lengths[j]!;
    const t = seg === 0 ? 0 : (target - lengths[j]!) / seg;
    const a = stroke[j]!, b = stroke[j + 1]!;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** Scale resampled strokes into a unit box by their joint bounding box (aspect kept, centred). */
function normalize(strokes: [number, number][][]): Float32Array[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const [x, y] of s) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const size = Math.max(maxX - minX, maxY - minY, 1e-3);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return strokes.map(s => {
    const flat = new Float32Array(s.length * 2);
    s.forEach(([x, y], i) => { flat[i * 2] = (x - cx) / size + 0.5; flat[i * 2 + 1] = (y - cy) / size + 0.5; });
    return flat;
  });
}

/** Prepare a drawing for matching; strokes with no points are dropped. */
export function prepareDrawing(strokes: readonly FinderStroke[], points: number): Float32Array[] {
  return normalize(strokes.filter(s => s.length > 0).map(s => resampleStroke(s, points)));
}

/** Decode the packed index (one base64-alphabet character per quantised coordinate). */
export function decodeFinderIndex(file: FinderIndexFile): FinderIndex {
  const value = new Map([...file.alphabet].map((c, i) => [c, i / (file.grid - 1)] as const));
  const per = file.points * 2;
  const candidates: FinderCandidate[] = [];
  const byCount = new Map<number, FinderCandidate[]>();
  const byGlyph = new Map<string, FinderCandidate>();
  for (const [glyph, packed] of Object.entries(file.glyphs)) {
    if (!packed.length || packed.length % per) continue;
    const strokes: [number, number][][] = [];
    for (let s = 0; s < packed.length; s += per) {
      const stroke: [number, number][] = [];
      for (let p = 0; p < per; p += 2) stroke.push([value.get(packed[s + p]!) ?? 0, value.get(packed[s + p + 1]!) ?? 0]);
      strokes.push(stroke);
    }
    const candidate = { glyph, strokes: normalize(strokes) };
    candidates.push(candidate);
    byGlyph.set(glyph, candidate);
    const list = byCount.get(strokes.length);
    if (list) list.push(candidate); else byCount.set(strokes.length, [candidate]);
  }
  return { points: file.points, candidates, byCount, byGlyph, source: file.source };
}

function strokeCost(a: Float32Array, b: Float32Array): number {
  const n = a.length / 2;
  let forward = 0, backward = 0;
  for (let i = 0; i < n; i++) {
    const ax = a[i * 2]!, ay = a[i * 2 + 1]!;
    forward += Math.hypot(ax - b[i * 2]!, ay - b[i * 2 + 1]!);
    const r = n - 1 - i;
    backward += Math.hypot(ax - b[r * 2]!, ay - b[r * 2 + 1]!);
  }
  return Math.min(forward / n, backward / n + REVERSED);
}

/** Similarity 0..100 between a prepared drawing and one candidate's strokes. */
export function similarity(drawn: Float32Array[], target: Float32Array[]): number {
  const m = drawn.length, n = target.length;
  if (!m || !n) return 0;
  const cost: number[][] = drawn.map(d => target.map(t => strokeCost(d, t)));
  // In-order alignment: dp[i][j] = best cost pairing the first i drawn with the first j target strokes.
  let prev = Array.from({ length: n + 1 }, (_, j) => j * GAP);
  for (let i = 1; i <= m; i++) {
    const row = [i * GAP];
    for (let j = 1; j <= n; j++) row.push(Math.min(prev[j - 1]! + cost[i - 1]![j - 1]!, prev[j]! + GAP, row[j - 1]! + GAP));
    prev = row;
  }
  const ordered = prev[n]!;
  // Order-free pairing: cheapest pairs first, each stroke used once, leftovers cost GAP.
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) pairs.push([cost[i]![j]!, i, j]);
  pairs.sort((a, b) => a[0] - b[0]);
  const usedD = new Uint8Array(m), usedT = new Uint8Array(n);
  let free = 0, paired = 0;
  for (const [c, i, j] of pairs) {
    if (usedD[i] || usedT[j]) continue;
    usedD[i] = 1; usedT[j] = 1; free += c; paired++;
    if (paired === Math.min(m, n)) break;
  }
  free += (Math.max(m, n) - paired) * GAP + ORDER_FREE * Math.max(m, n);
  const mean = Math.min(ordered, free) / Math.max(m, n);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - mean / ZERO_AT))));
}

/** Stroke counts close enough to the drawing's to be worth comparing. */
export function comparableCounts(strokes: number): number[] {
  const spread = 2 + Math.floor(strokes / 6);
  return Array.from({ length: spread * 2 + 1 }, (_, i) => strokes - spread + i).filter(c => c > 0);
}

/**
 * Every glyph scoring at least `minScore`, best first (ties keep index order).
 * `accept` limits the search (scope, script preference) before any comparison.
 */
export function findMatches(drawing: readonly FinderStroke[], index: FinderIndex, accept: (glyph: string) => boolean = () => true, minScore = FINDER_MIN_SCORE): FinderMatch[] {
  const drawn = prepareDrawing(drawing, index.points);
  if (!drawn.length) return [];
  const out: FinderMatch[] = [];
  for (const count of comparableCounts(drawn.length)) {
    for (const candidate of index.byCount.get(count) ?? []) {
      if (!accept(candidate.glyph)) continue;
      const score = similarity(drawn, candidate.strokes);
      if (score >= minScore) out.push({ glyph: candidate.glyph, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * "Find similar": an exact glyph's own recorded strokes as a board drawing
 * (board units, 10% margin), so it is compared with the same metric as a
 * learner's drawing. Null when the index has no recorded geometry for that
 * exact code point — never a look-alike's strokes.
 */
export function referenceDrawing(index: FinderIndex, glyph: string): FinderStroke[] | null {
  const candidate = index.byGlyph.get(glyph);
  if (!candidate) return null;
  return candidate.strokes.map(flat => Array.from({ length: flat.length / 2 }, (_, i) => [flat[i * 2]! * 0.8 + 0.1, flat[i * 2 + 1]! * 0.8 + 0.1] as const));
}

let loading: Promise<FinderIndex> | null = null;
/** Lazily fetch and decode the index once per visit; a failed load can be retried. */
export function loadFinderIndex(): Promise<FinderIndex> {
  loading ??= fetch('/data/finder-medians.json')
    .then(r => { if (!r.ok) throw new Error('Finder data unavailable'); return r.json() as Promise<FinderIndexFile>; })
    .then(decodeFinderIndex)
    .catch(error => { loading = null; throw error; });
  return loading;
}
