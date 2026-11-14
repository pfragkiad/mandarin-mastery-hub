import { z } from 'zod';
import type { DecompositionNode } from './character-library';
import { parseIdsTree } from './ids-tree';
import { childOwner, sameContextualForm } from './radical-context';
import { breakdownDisplayGlyph } from './radical-identities';
import supplementaryOutlines from '@/data/supplementary-outlines.json';

const checksum = z.string().regex(/^[a-f0-9]{64}$/);
const indices = z.array(z.number().int().nonnegative());
const groupSchema = z.object({ glyph: z.string().min(1), path: indices, strokeIndices: indices,
  noncontiguous: z.boolean(), standaloneFit: z.string(), standaloneReuseAllowed: z.boolean(),
  standaloneGeometryChecksum: checksum.optional() });
const envelopeSchema = z.object({ format: z.literal('mandarin-character-enrichment'), schemaVersion: z.literal(1),
  reviewStatus: z.literal('unreviewed-source-annotations'), geometryRegion: z.literal('und'), character: z.string(),
  record: z.object({ decomposition: z.string().nullable(),
    bindings: z.object({ treeChecksum: checksum, geometryChecksum: checksum, strokeCount: z.number().int().positive() }),
    mapping: z.object({ status: z.enum(['complete', 'partial', 'unavailable']), groups: z.array(groupSchema), unknownStrokeIndices: indices }),
    comparison: z.object({ status: z.enum(['exact-G-agreement', 'different-G-expression', 'current-incomplete', 'G-incomplete-or-unparseable', 'absent-in-BabelStone']),
      alternatives: z.array(z.object({ expression: z.string(), qualifiers: z.string(), directG: z.boolean(), virtualG: z.boolean() })) }),
    teachingCheck: z.object({ scheme: z.literal('GF 0014-2009'), rule: z.string(), printedPage: z.number().int(), result: z.string(), expectedComponents: z.array(z.string()).optional(), expectedUnsplit: z.boolean().optional() }).optional(),
  }) });
export type CharacterEnrichment = z.infer<typeof envelopeSchema>['record'];
/** Regional alternatives qualify only through their recorded direct-G flag, never virtual-G. */
export function gSourceDecompositions(record: CharacterEnrichment | null) {
  return (record?.comparison.alternatives ?? []).filter(alternative => alternative.directG)
    .map(alternative => ({ ...alternative, tree: parseIdsTree(alternative.expression) }));
}
export type ComponentOccurrence = z.infer<typeof groupSchema>;
const geometrySchema = z.object({ strokes: z.array(z.string()), medians: z.array(z.array(z.tuple([z.number(), z.number()]))) }).passthrough();
export type StrokeGeometry = z.infer<typeof geometrySchema>;
/** Set only when the outline is not Hanzi Writer Data, so Practice can name the real source. */
/** `exact`: the source records this same code point (no reviewed look-alike link). */
export type OutlineSource = { name: string; recordedAs: string; style: string; license: string; exact: boolean };
export type BoundGeometry = { data: StrokeGeometry; checksum: string; source?: OutlineSource };

export async function sha256(bytes: BufferSource): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
type TreeEncoding = string | null | TreeEncoding[];
/** Keep this encoding aligned with import-character-enrichment.py, including null unknown leaves. */
export function treeEncoding(node?: DecompositionNode): TreeEncoding {
  if (!node) return null;
  if (node.children?.length) return [node.glyph, ...node.children.map(treeEncoding)];
  return node.glyph === '？' || node.glyph === '?' ? null : node.glyph;
}
export function treeChecksum(node?: DecompositionNode) {
  return sha256(new TextEncoder().encode(`${JSON.stringify(treeEncoding(node))}\n`));
}
/** Structural equality below the root: a recorded tree roots at the character itself while a parsed
 *  IDS expression roots at its operator, so the comparison uses the same child encoding the checksum
 *  uses and never invents its own. */
export function sameDecompositionTree(a?: DecompositionNode, b?: DecompositionNode): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a.children?.map(treeEncoding) ?? null) === JSON.stringify(b.children?.map(treeEncoding) ?? null);
}
/** Display-only agreement: explicit unknown Hanzi leaves may stand for recorded G-source parts.
 * Known glyphs, branch positions and nesting must still agree; checksums and bindings stay strict.
 * With the owner character, two codepoints for one radical form in that character's context
 * (胖: G-source 月, recorded ⺼, both 肉 #130's ⺼) agree — see sameContextualForm. */
export function matchesRecordedGSource(gSource?: DecompositionNode, recorded?: DecompositionNode, owner?: string): boolean {
  if (!gSource || !recorded) return false;
  function matches(g: DecompositionNode, r: DecompositionNode, root = false, current = owner): boolean {
    // Slot names differ between sources (outer/inner vs upper-right-enclosure/inside);
    // structure is fixed by the operator plus child order, so names are not compared.
    if (!r.children?.length && /^[?？]$/.test(r.glyph)) return true;
    const gChildren = g.children ?? [];
    const rChildren = r.children ?? [];
    if (gChildren.length !== rChildren.length) return false;
    const isOperator = (glyph: string) => /^[\u2FF0-\u2FFF\u31EF]$/u.test(glyph);
    // Two codepoints are one known part when context resolves them to the same family form,
    // or when the radical file records one as an alias of the other's family form (有's G-source
    // ⺝ is the recorded alias of 月, so its 月 part agrees and the duplicate tree is not repeated).
    const samePart = (a: string, b: string) => sameContextualForm(a, b, r.position, current)
      || breakdownDisplayGlyph(a) === breakdownDisplayGlyph(b);
    if ((!root || !rChildren.length || (isOperator(g.glyph) && isOperator(r.glyph)))
      && !(isOperator(g.glyph) ? g.glyph === r.glyph : samePart(g.glyph, r.glyph))) return false;
    // Inside a real component its own declared radical applies (same rule as the renderer).
    const next = childOwner(r, current);
    return rChildren.every((child, index) => {
      const gChild = gChildren[index];
      return gChild !== undefined && matches(gChild, child, false, next);
    });
  }
  return matches(gSource, recorded, true);
}
/**
 * Hanzi Writer Data has no file for this exact glyph (HTTP 404) and no reviewed supplementary outline exists.
 * Distinct from a network failure so Practice can say "no outline recorded" instead of offering a
 * retry, and never substitutes a look-alike glyph's outline.
 */
export class StrokeDataUnavailable extends Error {
  constructor(character: string) { super(`No Hanzi Writer outline recorded for ${character}`); this.name = 'StrokeDataUnavailable'; }
}
const supplementarySchema = z.object({
  character: z.string(),
  source: z.object({ name: z.string(), url: z.string(), recordedAs: z.string(), style: z.string(), license: z.string() }).passthrough(),
  strokes: z.array(z.string()), medians: z.array(z.array(z.tuple([z.number(), z.number()]))),
});
/**
 * Owner-reviewed outlines for exact glyphs Hanzi Writer Data lacks (see
 * scripts/import-supplementary-outlines.py). Only glyphs listed in the manifest
 * use them; the file must name the same exact character or loading fails closed.
 */
function loadSupplementaryGeometry(character: string, file: string): Promise<BoundGeometry> {
  return fetch(file).then(async response => {
    if (!response.ok) throw new Error('Stroke data unavailable');
    const bytes = await response.arrayBuffer();
    const record = supplementarySchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
    if (record.character !== character || !record.strokes.length || record.strokes.length !== record.medians.length) throw new Error('Invalid stroke geometry');
    const { name, recordedAs, style, license } = record.source;
    return { data: { strokes: record.strokes, medians: record.medians }, checksum: await sha256(bytes), source: { name, recordedAs, style, license, exact: recordedAs === character } };
  });
}
const geometries = new Map<string, Promise<BoundGeometry>>();
export function loadStrokeGeometry(character: string): Promise<BoundGeometry> {
  const cached = geometries.get(character);
  if (cached) return cached;
  const supplementary = (supplementaryOutlines as Record<string, { file: string } | undefined>)[character];
  if (supplementary) {
    const promise = loadSupplementaryGeometry(character, supplementary.file).catch(error => { geometries.delete(character); throw error; });
    geometries.set(character, promise);
    return promise;
  }
  const promise = fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(character)}.json`)
    .then(async response => {
      if (response.status === 404) throw new StrokeDataUnavailable(character);
      if (!response.ok) throw new Error('Stroke data unavailable');
      const bytes = await response.arrayBuffer();
      // Bind to the original downloaded bytes, not reserialized JSON: the
      // annotation names this exact geometry file with its SHA-256 checksum.
      const data = geometrySchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
      if (!data.strokes.length || data.strokes.length !== data.medians.length) throw new Error('Invalid stroke geometry');
      return { data, checksum: await sha256(bytes) };
    }).catch(error => { geometries.delete(character); throw error; });
  geometries.set(character, promise);
  return promise;
}
const records = new Map<string, Promise<CharacterEnrichment | null>>();
export async function loadRecord(character: string): Promise<CharacterEnrichment | null> {
  const cached = records.get(character);
  if (cached) return cached;
  const point = character.codePointAt(0);
  if (point === undefined || Array.from(character).length !== 1) return null;
  const promise = fetch(`/data/character-enrichment/${point.toString(16)}.json`).then(async response => {
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Enrichment unavailable');
    const envelope = envelopeSchema.parse(await response.json());
    return envelope.character === character ? envelope.record : null;
  }).catch(() => { records.delete(character); return null; });
  records.set(character, promise);
  return promise;
}
function nodeAt(root: DecompositionNode, path: number[]) {
  let node: DecompositionNode | undefined = root;
  for (const index of path) node = node?.children?.[index];
  return node;
}
/** Fail closed: annotations never overwrite a tree, a reviewed decision or geometry. */
export async function validateEnrichment(record: CharacterEnrichment, tree: DecompositionNode | undefined,
  geometry: BoundGeometry, preserveOverride = false): Promise<boolean> {
  if (preserveOverride || !tree || geometry.checksum !== record.bindings.geometryChecksum ||
    geometry.data.strokes.length !== record.bindings.strokeCount || await treeChecksum(tree) !== record.bindings.treeChecksum) return false;
  const all = [...record.mapping.unknownStrokeIndices];
  // Paths identify occurrences, not merely glyph names: the same component can
  // appear twice in a tree and must keep separate, non-overlapping stroke groups.
  const paths = new Set<string>();
  for (const group of record.mapping.groups) {
    const key = JSON.stringify(group.path);
    if (paths.has(key) || nodeAt(tree, group.path)?.glyph !== group.glyph || !group.strokeIndices.length) return false;
    paths.add(key);
    if (group.strokeIndices.some((index, i) => i > 0 && index <= (group.strokeIndices[i - 1] ?? -1))) return false;
    const noncontiguous = group.strokeIndices.some((index, i) => i > 0 && index !== (group.strokeIndices[i - 1] ?? -1) + 1);
    if (noncontiguous !== group.noncontiguous) return false;
    all.push(...group.strokeIndices);
  }
  if (record.mapping.status === 'complete' && record.mapping.unknownStrokeIndices.length) return false;
  if (record.mapping.status === 'unavailable' && record.mapping.groups.length) return false;
  return all.length === record.bindings.strokeCount && new Set(all).size === all.length &&
    all.every(index => Number.isInteger(index) && index >= 0 && index < record.bindings.strokeCount);
}
export async function resolveEnrichment(character: string, tree?: DecompositionNode, preserveOverride = false) {
  const record = await loadRecord(character);
  if (!record || !tree || preserveOverride) return null;
  try {
    const geometry = await loadStrokeGeometry(character);
    return await validateEnrichment(record, tree, geometry, preserveOverride) ? record : null;
  } catch { return null; }
}