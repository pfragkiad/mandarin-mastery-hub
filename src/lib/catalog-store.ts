// Imported reference catalogue (characters, radicals, components, strokes, decompositions,
// character-reading audio). Fetched once in the browser from /data/catalog.json so the
// ~2 MB file never sits in the page bundle. Rows are mutated in place so existing
// synchronous readers see the data after the workspace bumps its catalogue version.
import type { CharacterScript } from './learning-preferences';
import { playPronunciation, audioMessage, recordingCandidates, type AudioAttachment, type AudioRequest } from './audio';
import type { DecompositionNode } from './character-library';
import type { RadicalIdentityFile } from './radical-identities';
import type { RadicalStrokeFile } from './radical-strokes';
import { hydrateUsageOrder, type UsageOrderFile } from './usage-frequency';

export type CatalogRow = [string, string, string, string, CharacterScript?];
export type CatalogFile = {
  version: number; source: string;
  characters: CatalogRow[]; radicals: CatalogRow[]; components: CatalogRow[]; strokes: CatalogRow[];
  trees: Record<string, DecompositionNode>; readingAudio: Record<string, Record<string, string | null>>; audio: Record<string, AudioAttachment>;
  /** Unihan kRSUnicode radical for components that are not themselves a radical form. */
  componentRadicals?: Record<string, string>;
};

export const catalog = {
  loaded: false, version: 0, source: '',
  characters: [] as CatalogRow[], radicals: [] as CatalogRow[], components: [] as CatalogRow[], strokes: [] as CatalogRow[],
  trees: {} as Record<string, DecompositionNode>, readingAudio: {} as CatalogFile['readingAudio'], audio: {} as CatalogFile['audio'], componentRadicals: {} as Record<string, string>,
  radicalIdentities: { schemaVersion: 1, sources: {}, identities: {} } as RadicalIdentityFile,
  radicalStrokes: { schemaVersion: 1, source: '', records: {} } as RadicalStrokeFile,
};

export function hydrateCatalog(data: CatalogFile, identities?: RadicalIdentityFile, strokes?: RadicalStrokeFile) {
  // Preserve array identities held by synchronous readers; the version increment
  // tells workspace consumers to recompute after all sidecars are installed.
  for (const key of ['characters', 'radicals', 'components', 'strokes'] as const) catalog[key].splice(0, catalog[key].length, ...data[key]);
  catalog.trees = data.trees; catalog.readingAudio = data.readingAudio; catalog.audio = data.audio; catalog.source = data.source; catalog.componentRadicals = data.componentRadicals ?? {};
  if (identities) catalog.radicalIdentities = identities;
  if (strokes) catalog.radicalStrokes = strokes;
  catalog.loaded = true; catalog.version += 1;
}

let pending: Promise<void> | null = null;
/** Share concurrent browser loads; a failed request clears the promise so a later visit can retry. */
export function loadCatalog(): Promise<void> {
  if (catalog.loaded || typeof window === 'undefined') return Promise.resolve();
  pending ??= Promise.all([
    fetch('/data/catalog.json').then(r => { if (!r.ok) throw new Error(`catalog ${r.status}`); return r.json() as Promise<CatalogFile>; }),
    fetch('/data/radical-identities.json').then(r => { if (!r.ok) throw new Error(`radical identities ${r.status}`); return r.json() as Promise<RadicalIdentityFile>; }),
    fetch('/data/radical-strokes.json').then(r => { if (!r.ok) throw new Error(`radical strokes ${r.status}`); return r.json() as Promise<RadicalStrokeFile>; }),
    fetch('/data/usage-order.json').then(r => { if (!r.ok) throw new Error(`usage order ${r.status}`); return r.json() as Promise<UsageOrderFile>; }),
  ]).then(([data, identities, strokes, usage]) => { hydrateUsageOrder(usage); hydrateCatalog(data, identities, strokes); }).catch(err => { pending = null; throw err; });
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
