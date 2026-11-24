/**
 * Browser-safe etymology adapter (public/data/etymology, see its README.md / AGENTS.md).
 *
 * Purpose: resolve the exact selected glyph record (or family-qualified radical form) to the
 * complementary Howell / Shuowen Jiezi source notes, without touching catalogue records.
 * Inputs: an EtymologyRequest naming the exact record ID and glyph, plus the radical family ID
 * and form key when a radical form is selected.
 * Loading: index.json is fetched once on the first request; each shard only when needed, and only
 * after its original response bytes match the index's recorded length and SHA-256.
 * Tricky rules (all fail closed — any mismatch yields null, never a guessed entry):
 *  - a radical form looks up radicalForms[family/form] BEFORE records[id], because a heading form's
 *    ID equals the heading's ID; identities (id, glyph, family, form key, status) must agree in both
 *    the index and the shard;
 *  - only `exact-headword` on a Characters record exposes source text; components/radicals
 *    (`context-review-required`) only point at the standalone character's own card; blocked
 *    contextual identities (#96 jade 王) and candidates never display text;
 *  - related-form suggestions (发 → 發 / 髮) are links with their recorded note, never copied text.
 */
import { z } from 'zod';

const BASE = '/data/etymology/';
const checksum = z.string().regex(/^[a-f0-9]{64}$/);
const status = z.enum(['exact-headword', 'context-review-required', 'blocked-contextual-identity', 'no-exact-headword']);
export type EtymologyStatus = z.infer<typeof status>;
const metadataSchema = z.object({ source_name: z.string(), import_date: z.string(), version: z.string(), disclaimer: z.string(),
  license_notices: z.array(z.object({ source_id: z.string(), license: z.string(), copyright_notice: z.string().optional() }).passthrough()) }).passthrough();
const recordTarget = z.object({ glyph: z.string(), status, file: z.string() });
const formTarget = z.object({ id: z.string(), headingId: z.string(), familyId: z.number().int(), formKey: z.string(), glyph: z.string(), status, file: z.string() }).passthrough();
const indexSchema = z.object({ format: z.literal('mandarin-etymology-index'), schemaVersion: z.literal(1), dataset_metadata: metadataSchema,
  shards: z.record(z.string(), z.object({ sha256: checksum, bytes: z.number().int().positive() }).passthrough()),
  records: z.record(z.string(), recordTarget), radicalForms: z.record(z.string(), formTarget) });
export type EtymologyIndex = z.infer<typeof indexSchema>;
const editorialReviewSchema = z.object({ reviewId: z.string().min(1), status: z.literal('partial-editorial-review'),
  changes: z.array(z.enum(['translation', 'uncertainty', 'source-reading', 'review-assessment'])).min(1),
  sourceReading: z.object({ headword: z.string().min(1), text: z.string(), textSha256: checksum,
    classification: z.string().min(1), note: z.string().min(1), evidenceUrls: z.array(z.string().url()) }).optional(),
  caseEvidence: z.object({ decision: z.enum(['clear', 'checked_retained', 'revised_retained']),
    checkedInSuppliedReview: z.literal(true), reviewerNote: z.string().min(1), sourceUrls: z.array(z.string().url()).min(1) }).optional() });
const translationSchema = z.object({ language: z.literal('en'), text: z.string().min(1), method: z.literal('ai-generated'),
  reviewStatus: z.literal('unreviewed-ai-draft'), sourceTextSha256: checksum, uncertain: z.boolean(),
  editorialReview: editorialReviewSchema.optional() });
const entrySchema = z.object({ id: z.string(), sourceId: z.enum(['howell', 'shuowen']), headword: z.string(),
  contentKind: z.string(), language: z.string(), text: z.string(), reviewStatus: z.string(), sourceUrl: z.string(),
  translation: translationSchema.optional() }).passthrough();
export type EtymologyEntry = z.infer<typeof entrySchema>;
const association = z.object({ id: z.string(), kind: z.string(), glyph: z.string(), status, entryIds: z.array(z.string()) }).passthrough();
const formAssociation = association.extend({ headingId: z.string(), familyId: z.number().int(), formKey: z.string() });
const suggestion = z.object({ glyph: z.string(), recordId: z.string().nullable().optional(), entryIds: z.array(z.string()),
  recordedNotes: z.record(z.string(), z.object({ explanation: z.string().optional() }).passthrough()).optional() }).passthrough();
const characterSchema = z.object({ glyph: z.string(), entries: z.array(entrySchema), associations: z.array(association),
  radicalForms: z.array(formAssociation), relatedFormSuggestions: z.array(suggestion),
  comparison: z.object({ coverage: z.string(), interpretationStatus: z.string() }).passthrough() }).passthrough();
export type EtymologyCharacter = z.infer<typeof characterSchema>;
const shardSchema = z.object({ format: z.string(), schemaVersion: z.literal(1), dataset_metadata: metadataSchema,
  characters: z.record(z.string(), z.unknown()) });

export type EtymologyRequest = { recordId: string; glyph: string; familyId?: number | undefined; formKey?: string | undefined };
/** `classification`: the written-form note's recorded classification for this pair
 *  (context_dependent_not_error, orthographic_variant, …), absent when none is recorded. */
export type RelatedForm = { glyph: string; recordId: string; explanation?: string; classification?: string };
export type EtymologyView = {
  glyph: string; status: EtymologyStatus;
  /** Source entries allowed for display — only for exact-headword Characters records. */
  entries: EtymologyEntry[];
  coverage: string;
  /** context-review-required: the standalone Characters record with its own exact-headword notes. */
  standalone: string | null;
  /** no-exact-headword: recorded related written forms that have their own records. */
  related: RelatedForm[];
  metadata: EtymologyIndex['dataset_metadata'];
};

/** Resolves the index target for the exact request; null when identities disagree (fail closed). */
export function etymologyTarget(index: EtymologyIndex, request: EtymologyRequest) {
  if (request.familyId !== undefined && request.formKey) {
    const form = index.radicalForms[`${request.familyId}/${request.formKey}`];
    if (form) return form.id === request.recordId && form.glyph === request.glyph && form.familyId === request.familyId && form.formKey === request.formKey ? { ...form, radical: true as const } : null;
    // A variant ID (…:variant:96-1) has no ordinary record; only a heading may fall through.
    if (request.recordId.includes(':variant:')) return null;
  }
  const record = index.records[request.recordId];
  return record && record.glyph === request.glyph ? { ...record, id: request.recordId, radical: false as const } : null;
}

/** Grid-card marker (index only, no shard): a Characters record whose exact headword the index
 *  routes to source text. Components/Radicals only ever link to a character's notes, and related
 *  forms need the shard, so neither earns the marker. */
export function hasOwnEtymologyText(index: EtymologyIndex, recordId: string, glyph: string) {
  const record = index.records[recordId];
  return recordId.startsWith('Characters:') && record?.glyph === glyph && record.status === 'exact-headword';
}

/** Pure status → display decision for one shard character (exported for tests). */
export function etymologyView(index: EtymologyIndex, request: EtymologyRequest, character: EtymologyCharacter): EtymologyView | null {
  const target = etymologyTarget(index, request);
  if (!target || character.glyph !== request.glyph) return null;
  const found = target.radical
    ? character.radicalForms.find(item => item.familyId === request.familyId && item.formKey === request.formKey && item.glyph === request.glyph && item.id === request.recordId)
    : character.associations.find(item => item.id === request.recordId && item.glyph === request.glyph);
  if (!found || found.status !== target.status) return null;
  const base = { glyph: request.glyph, status: found.status, coverage: character.comparison.coverage, entries: [] as EtymologyEntry[], standalone: null as string | null, related: [] as RelatedForm[], metadata: index.dataset_metadata };
  if (found.status === 'exact-headword') {
    // Source coverage for an ordinary character only; every listed entry must resolve exactly.
    if (found.kind !== 'Characters' || target.radical) return null;
    const entries = found.entryIds.map(id => character.entries.find(entry => entry.id === id && entry.headword === request.glyph));
    if (!entries.length || entries.some(entry => !entry)) return null;
    return { ...base, entries: entries as EtymologyEntry[] };
  }
  if (found.status === 'context-review-required') {
    const own = `Characters:${request.glyph}`;
    const standalone = own !== request.recordId && index.records[own]?.status === 'exact-headword' && index.records[own]?.glyph === request.glyph ? own : null;
    return { ...base, standalone };
  }
  if (found.status === 'no-exact-headword') {
    const related = character.relatedFormSuggestions.flatMap(item => {
      const id = item.recordId;
      // Only forms whose own record exists with its own exact headword become links.
      if (!id || index.records[id]?.glyph !== item.glyph || index.records[id]?.status !== 'exact-headword') return [];
      const note = item.recordedNotes?.[item.glyph];
      const explanation = note?.explanation;
      const classification = typeof note?.['classification'] === 'string' ? note['classification'] : undefined;
      return [{ glyph: item.glyph, recordId: id, ...(explanation ? { explanation } : {}), ...(classification ? { classification } : {}) }];
    });
    return { ...base, related };
  }
  return base;
}

/**
 * The one traditional form whose notes a simplified character without its own entry may show
 * in place (owner-requested, labelled as that form's notes and "suggested, not reviewed"), or
 * null. Only a plain one-to-one pair qualifies: exactly one related form with its own exact
 * headword, recorded as Traditional (`isTraditional`, the caller's exact script metadata), and
 * no note other than a plain "traditional" one — so context-dependent pairs (发 → 發 / 髮,
 * 后 → 後) and orthographic/regional variants keep only their links, never borrowed text.
 */
export function inheritableCounterpart(view: EtymologyView | null | undefined, isTraditional: (glyph: string) => boolean): RelatedForm | null {
  if (!view || view.status !== 'no-exact-headword' || view.related.length !== 1) return null;
  const form = view.related[0]!;
  if (form.classification !== undefined && form.classification !== 'traditional') return null;
  return isTraditional(form.glyph) ? form : null;
}

/** Howell marks glossed senses with *asterisks*; split them out for emphasis without altering text.
 *  An unpaired asterisk stays literal. `#` cross-reference markers are kept as written. */
export function howellSegments(text: string): { text: string; emphasis: boolean }[] {
  const out: { text: string; emphasis: boolean }[] = [];
  const pattern = /\*([^*\n]+)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), emphasis: false });
    out.push({ text: match[1] ?? '', emphasis: true });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), emphasis: false });
  return out;
}

// High fetch priority: a component card also queues thousands of small breakdown files for its
// "In a character" list, and the browser would otherwise hold these two requests behind them.
const FETCH_OPTIONS = { priority: 'high' } as RequestInit;
async function sha256(bytes: ArrayBuffer) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
let indexPromise: Promise<EtymologyIndex> | undefined;
export function loadEtymologyIndex() {
  return indexPromise ??= fetch(`${BASE}index.json`, FETCH_OPTIONS).then(async response => {
    if (!response.ok) throw new Error(`etymology index ${response.status}`);
    return indexSchema.parse(await response.json());
  }).catch(error => { indexPromise = undefined; throw error; });
}
const shards = new Map<string, Promise<Record<string, unknown>>>();
function loadShard(index: EtymologyIndex, file: string) {
  const hit = shards.get(file);
  if (hit) return hit;
  const pinned = index.shards[file];
  if (!pinned || !/^glyphs\/[0-9a-f]{4}\.json$/.test(file)) return Promise.reject(new Error('unpinned etymology shard'));
  const promise = fetch(`${BASE}${file}`, FETCH_OPTIONS).then(async response => {
    if (!response.ok) throw new Error(`etymology shard ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== pinned.bytes || await sha256(bytes) !== pinned.sha256) throw new Error('etymology shard checksum mismatch');
    const shard = shardSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
    if (shard.dataset_metadata.version !== index.dataset_metadata.version) throw new Error('etymology version mismatch');
    return shard.characters;
  }).catch(error => { shards.delete(file); throw error; });
  shards.set(file, promise);
  return promise;
}
/** English stays bound to its imported entry; an explicit editorial reading has its
 * own checksum. A stale draft is dropped independently, preserving the original. */
export async function validateEtymologyTranslations(character: EtymologyCharacter): Promise<EtymologyCharacter> {
  const entries = await Promise.all(character.entries.map(async entry => {
    if (!entry.translation) return entry;
    const reading = entry.translation.editorialReview?.sourceReading;
    const readingMatches = !reading || await sha256(new TextEncoder().encode(reading.text).buffer) === reading.textSha256;
    if (entry.sourceId === 'shuowen' && readingMatches && await sha256(new TextEncoder().encode(entry.text).buffer) === entry.translation.sourceTextSha256) return entry;
    const { translation: _translation, ...original } = entry;
    return original;
  }));
  return { ...character, entries };
}

/** Full lookup for the detail card; resolves null whenever any identity or integrity check fails. */
export async function resolveEtymology(request: EtymologyRequest): Promise<EtymologyView | null> {
  try {
    const index = await loadEtymologyIndex();
    const target = etymologyTarget(index, request);
    if (!target) return null;
    const characters = await loadShard(index, target.file);
    const parsed = characterSchema.safeParse(characters[request.glyph]);
    return parsed.success ? etymologyView(index, request, await validateEtymologyTranslations(parsed.data)) : null;
  } catch { return null; }
}
