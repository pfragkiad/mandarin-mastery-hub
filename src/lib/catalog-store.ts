// Unified reference catalogue, assembled lazily from the shared catalog.json and
// separate glyph row files (see public/data/catalog.md). Reference data stays out of page bundles.
// Rows are mutated in place so synchronous readers retain their array references.
import type { CharacterScript } from './learning-preferences';
import { playPronunciation, audioMessage, recordingCandidates, type AudioAttachment, type AudioRequest } from './audio';
import type { DecompositionNode } from './character-library';
import type { RadicalIdentityFile } from './radical-identities';
import type { RadicalStrokeFile } from './radical-strokes';
import { hydrateUsageOrder, type UsageOrderFile } from './usage-frequency';
import { hydrateCharacterVariants, type CharacterVariantFile } from './character-variants';

export type CatalogRow = [string, string, string, string, CharacterScript?];
export type CharacterFile = { characters: CatalogRow[] };
export type RadicalFile = { radicals: CatalogRow[] };
export type ComponentFile = { components: CatalogRow[] };
export type StrokeFile = { strokes: CatalogRow[] };
/** Shared on-disk metadata; glyph rows live in their respective section files. */
export type CatalogFile = {
  version: number; source: string;
  trees: Record<string, DecompositionNode>; readingAudio: Record<string, Record<string, string | null>>; audio: Record<string, AudioAttachment>;
  /** Unihan kRSUnicode radical for components that are not themselves a radical form. */
  componentRadicals?: Record<string, string>;
  /** Reviewed meaning for each reading of a multi-reading character (see readingMeaning). */
  readingMeanings?: Record<string, ReadingMeaningRecord>;
  /** Reviewed links from one meaning sense to the related character that owns it (meaning-pointers.ts). */
  meaningPointers?: Record<string, import('./meaning-pointers').MeaningPointerRecord>;
};
/** Logical catalogue passed to hydration after joining metadata with the three row files. */
export type CatalogData = CatalogFile & CharacterFile & RadicalFile & ComponentFile;

/** One owner-reviewed split of a character's combined dictionary meaning by reading.
 *  `combined` is the catalogue meaning the split was reviewed against. */
export type ReadingMeaningRecord = { readings: Record<string, string>; combined: string; source: string; sourceUrl?: string; date?: string; approvedBy?: string };

export const catalog = {
  loaded: false, version: 0, source: '',
  characters: [] as CatalogRow[], radicals: [] as CatalogRow[], components: [] as CatalogRow[], strokes: [] as CatalogRow[],
  trees: {} as Record<string, DecompositionNode>, readingAudio: {} as CatalogFile['readingAudio'], audio: {} as CatalogFile['audio'], componentRadicals: {} as Record<string, string>,
  readingMeanings: {} as Record<string, ReadingMeaningRecord>,
  meaningPointers: {} as NonNullable<CatalogFile['meaningPointers']>,
  radicalIdentities: { schemaVersion: 1, sources: {}, identities: {} } as RadicalIdentityFile,
  radicalStrokes: { schemaVersion: 1, source: '', records: {} } as RadicalStrokeFile,
};

export function hydrateCatalog(data: CatalogData, identities?: RadicalIdentityFile, strokes?: RadicalStrokeFile, strokeCatalog?: StrokeFile) {
  // Preserve array identities held by synchronous readers; the version increment
  // tells workspace consumers to recompute after all sidecars are installed.
  for (const key of ['characters', 'radicals', 'components'] as const) catalog[key].splice(0, catalog[key].length, ...data[key]);
  if (strokeCatalog) catalog.strokes.splice(0, catalog.strokes.length, ...strokeCatalog.strokes);
  catalog.trees = data.trees; catalog.readingAudio = data.readingAudio; catalog.audio = data.audio; catalog.source = data.source; catalog.componentRadicals = data.componentRadicals ?? {};
  catalog.readingMeanings = data.readingMeanings ?? {};
  catalog.meaningPointers = data.meaningPointers ?? {};
  if (identities) catalog.radicalIdentities = identities;
  if (strokes) catalog.radicalStrokes = strokes;
  catalog.loaded = true; catalog.version += 1;
}

/** Reviewed per-reading meanings for a Characters record, in its recorded reading order, or null.
 *  Fails closed: the split applies only while the character's own catalogue row still records
 *  exactly the reviewed combined meaning and a reading list matching the reviewed readings, so a
 *  later data correction can never leave a stale split showing (callers keep the combined text). */
export function readingMeanings(glyph: string): { reading: string; meaning: string }[] | null {
  const record = catalog.readingMeanings[glyph];
  const row = record ? catalog.characters.find(item => item[0] === glyph) : undefined;
  if (!record || !row || row[2] !== record.combined) return null;
  const readings = row[1].split('/').map(part => part.trim()).filter(Boolean);
  if (readings.length < 2 || readings.length !== Object.keys(record.readings).length || readings.some(reading => !record.readings[reading])) return null;
  return readings.map(reading => ({ reading, meaning: record.readings[reading] as string }));
}

/** Meaning for one exact reading (e.g. 了 liǎo), or undefined when no reviewed split applies. */
export function readingMeaning(glyph: string, reading: string): string | undefined {
  return readingMeanings(glyph)?.find(item => item.reading === reading.normalize('NFC'))?.meaning;
}

let pending: Promise<void> | null = null;
/** Share concurrent browser loads; a failed request clears the promise so a later visit can retry. */
export function loadCatalog(): Promise<void> {
  if (catalog.loaded || typeof window === 'undefined') return Promise.resolve();
  pending ??= Promise.all([
    fetch('/data/catalog.json').then(r => { if (!r.ok) throw new Error(`catalog ${r.status}`); return r.json() as Promise<CatalogFile>; }),
    fetch('/data/characters.json').then(r => { if (!r.ok) throw new Error(`characters ${r.status}`); return r.json() as Promise<CharacterFile>; }),
    fetch('/data/radicals.json').then(r => { if (!r.ok) throw new Error(`radicals ${r.status}`); return r.json() as Promise<RadicalFile>; }),
    fetch('/data/components.json').then(r => { if (!r.ok) throw new Error(`components ${r.status}`); return r.json() as Promise<ComponentFile>; }),
    fetch('/data/radical-identities.json').then(r => { if (!r.ok) throw new Error(`radical identities ${r.status}`); return r.json() as Promise<RadicalIdentityFile>; }),
    fetch('/data/radical-strokes.json').then(r => { if (!r.ok) throw new Error(`radical strokes ${r.status}`); return r.json() as Promise<RadicalStrokeFile>; }),
    fetch('/data/usage-order.json').then(r => { if (!r.ok) throw new Error(`usage order ${r.status}`); return r.json() as Promise<UsageOrderFile>; }),
    fetch('/data/character-variants-v1.4.0.json').then(r => { if (!r.ok) throw new Error(`character variants ${r.status}`); return r.json() as Promise<CharacterVariantFile>; }),
    fetch('/data/strokes.json').then(r => { if (!r.ok) throw new Error(`strokes ${r.status}`); return r.json() as Promise<StrokeFile>; }),
  ]).then(([data, characters, radicals, components, identities, strokes, usage, variants, strokeCatalog]) => {
    // Commit only after every required file succeeds, so consumers never see a partial catalogue.
    hydrateUsageOrder(usage); hydrateCharacterVariants(variants);
    hydrateCatalog({ ...data, characters: characters.characters, radicals: radicals.radicals, components: components.components }, identities, strokes, strokeCatalog);
  }).catch(err => { pending = null; throw err; });
  return pending;
}

/** Audio request for a single character, offering its exact-reading recording when one exists.
 * With no pinyin recorded, no tone is guessed; UI availability still requires a known reading for TTS. */
// This shared yán clip was reported to pronounce mén. Quarantine the asset ID
// across every glyph binding until its source audio is corrected; preserve raw
// imported provenance and choose labelled Mandarin TTS before playback instead.
const excludedCharacterRecordings = new Set(['cmn-syl-yan2']);
export function characterAudioRequest(glyph: string, reading?: string | null): AudioRequest {
  const readings = catalog.readingAudio[glyph] ?? {};
  const chosen = reading ?? null;
  const characterAudio = Object.entries(readings).flatMap(([r, id]) => { const a = id && !excludedCharacterRecordings.has(id) ? catalog.audio[id] : undefined; return a ? [{ ...a, glyph, reading: r }] : []; });
  return { text: glyph, reading: chosen, characterAudio };
}

/** Exact-reading recording for a glyph, or null when only browser TTS could speak it. */
export function characterRecording(glyph: string, reading?: string | null): AudioAttachment | null {
  return recordingCandidates(characterAudioRequest(glyph, reading))[0]?.attachment ?? null;
}

/** Plays a character (exact-reading recording first, then validated Mandarin TTS); returns an error message or null. */
export async function playCharacter(glyph: string, slow = false, reading?: string | null) {
  return audioMessage(await playPronunciation(characterAudioRequest(glyph, reading), slow));
}
