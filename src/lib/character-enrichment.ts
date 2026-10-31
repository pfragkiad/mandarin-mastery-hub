import { z } from 'zod';
import type { DecompositionNode } from './character-library';
import { parseIdsTree } from './ids-tree';

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
export type BoundGeometry = { data: StrokeGeometry; checksum: string };

export async function sha256(bytes: BufferSource): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
type TreeEncoding = string | null | TreeEncoding[];
export function treeEncoding(node?: DecompositionNode): TreeEncoding {
  if (!node) return null;
  if (node.children?.length) return [node.glyph, ...node.children.map(treeEncoding)];
  return node.glyph === '？' || node.glyph === '?' ? null : node.glyph;
}
export function treeChecksum(node?: DecompositionNode) {
  return sha256(new TextEncoder().encode(`${JSON.stringify(treeEncoding(node))}\n`));
}
/** Structural equality on the same encoding the checksum uses, so display deduplication never invents its own comparison. */
export function sameDecompositionTree(a?: DecompositionNode, b?: DecompositionNode): boolean {
  return JSON.stringify(treeEncoding(a)) === JSON.stringify(treeEncoding(b));
}
const geometries = new Map<string, Promise<BoundGeometry>>();
export function loadStrokeGeometry(character: string): Promise<BoundGeometry> {
  const cached = geometries.get(character);
  if (cached) return cached;
  const promise = fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(character)}.json`)
    .then(async response => {
      if (!response.ok) throw new Error('Stroke data unavailable');
      const bytes = await response.arrayBuffer();
      const data = geometrySchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
      if (!data.strokes.length || data.strokes.length !== data.medians.length) throw new Error('Invalid stroke geometry');
      return { data, checksum: await sha256(bytes) };
    }).catch(error => { geometries.delete(character); throw error; });
  geometries.set(character, promise);
  return promise;
}
const records = new Map<string, Promise<CharacterEnrichment | null>>();
async function loadRecord(character: string): Promise<CharacterEnrichment | null> {
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