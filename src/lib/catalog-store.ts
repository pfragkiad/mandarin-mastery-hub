// Unified reference catalogue, assembled lazily from the shared catalog.json and
// separate glyph row files (see public/data/catalog.md). Reference data stays out of page bundles.
// Rows are mutated in place so synchronous readers retain their array references.
import type { CharacterScript } from './learning-preferences';
import { playPronunciation, audioMessage, recordingCandidates, type AudioAttachment, type AudioRequest, type CharacterReadingAudio } from './audio';
// Tiny sidecar shared with the Sound chart: exact neutral-tone word recordings.
import neutralAudio from '@/data/pinyin/neutral-audio.json';
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
  /** Explicit source-reviewed pronunciation choices; original on-disk tuples stay intact. */
  readingRevisions?: ReadingRevisionRecord[];
  /** Reviewed links from one meaning sense to the related character that owns it (meaning-pointers.ts). */
  meaningPointers?: Record<string, import('./meaning-pointers').MeaningPointerRecord>;
};
/** Logical catalogue passed to hydration after joining metadata with the three row files. */
export type CatalogData = CatalogFile & CharacterFile & RadicalFile & ComponentFile;

/** One owner-reviewed split of a character's combined dictionary meaning by reading.
 *  `combined` is the catalogue meaning the split was reviewed against. */
export type ReadingMeaningRecord = { readings: Record<string, string>; combined: string; source: string; sourceUrl?: string; sourceLinks?: { label: string; url: string }[]; note?: string; date?: string; approvedBy?: string };

/** Legacy revisions document previous direct corrections. Only revisions with a complete
 * recordedRow binding can overlay a current row; an upstream edit invalidates that choice. */
export type ReadingRevisionRecord = {
  glyph: string; previous: string; reading: string; source: string; sourceUrl?: string;
  recordedRow?: CatalogRow; readingAudio?: Record<string, string>; [key: string]: unknown;
};

/** Exact tuple binding, including meaning/script/note; never retone a changed source row. */
export function matchingReadingRevision(row: CatalogRow, revisions: ReadingRevisionRecord[] = []): ReadingRevisionRecord | undefined {
  return revisions.find(revision => revision.glyph === row[0] && revision.previous === row[1] && revision.recordedRow &&
    JSON.stringify(revision.recordedRow) === JSON.stringify(row) && revision.reading.split('/').every(reading => reading.trim()));
}

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
  for (const key of ['characters', 'radicals', 'components'] as const) {
    const rows = key === 'characters' ? data.characters.map(row => {
      const revision = matchingReadingRevision(row, data.readingRevisions);
      return revision ? [row[0], revision.reading, ...row.slice(2)] as CatalogRow : row;
    }) : data[key];
    catalog[key].splice(0, catalog[key].length, ...rows);
  }
  if (strokeCatalog) catalog.strokes.splice(0, catalog.strokes.length, ...strokeCatalog.strokes);
  catalog.trees = data.trees; catalog.readingAudio = data.readingAudio; catalog.audio = data.audio; catalog.source = data.source; catalog.componentRadicals = data.componentRadicals ?? {};
  // A revised reading may use only an existing attachment already bound to that exact
  // Mandarin reading elsewhere. Preserve original bindings and never relabel their tone.
  for (const row of data.characters) {
    const revision = matchingReadingRevision(row, data.readingRevisions);
    if (!revision?.readingAudio) continue;
    const allowed = revision.reading.split('/').map(reading => reading.trim());
    const additions = Object.fromEntries(Object.entries(revision.readingAudio).filter(([reading, id]) =>
      allowed.includes(reading) && data.audio[id] && Object.values(data.readingAudio).some(bindings => bindings[reading] === id)));
    catalog.readingAudio = { ...catalog.readingAudio, [row[0]]: { ...catalog.readingAudio[row[0]], ...additions } };
  }
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

/** Consecutive readings that share one reviewed meaning, merged into one line (发 fà / fǎ "hair"),
 *  so a card or heading never repeats the same sense; readings keep their exact recorded order. */
export function groupReadingMeanings<T extends { reading: string; meaning: string }>(items: T[]): { readings: string[]; meaning: string; first: T }[] {
  const groups: { readings: string[]; meaning: string; first: T }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.meaning === item.meaning) last.readings.push(item.reading);
    else groups.push({ readings: [item.reading], meaning: item.meaning, first: item });
  }
  return groups;
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
// The legacy shared yán clip was reported to pronounce mén. Its 25 bindings have
// been replaced by reviewed Yue Tan recordings; keep the old asset ID quarantined
// defensively so stale data can never reintroduce it, and preserve raw provenance.
const excludedCharacterRecordings = new Set(['cmn-syl-yan2']);
// Neutral-tone syllables (no tone mark, e.g. 吧 ba, 地 de) never play the catalogue's
// syllable bindings: the imported tone-5 clips turned out to be unrelated French speech
// and were removed. The only neutral recordings are the Sound chart's exact word
// recordings (neutral-audio.json: a single-character word recorded in that toneless
// reading). Like the toned syllable clips every glyph shares, that clip IS the chart's
// neutral syllable, so any glyph whose recorded reading is exactly that toneless syllable
// speaks it (地 de and 的 de both play the chart's "de"); a toned reading never borrows
// it, and neutral syllables with no recording (me, ya…) stay labelled TTS.
const TONE_MARK = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]|[\u0304\u0301\u030C\u0300]/i;
type NeutralRecording = { word: string; reading: string; url: string; source: string; license: string; recordingKind?: string };
/** Neutral syllable recordings keyed by their exact toneless syllable (lower-case NFC), the
 * same key the Sound chart plays for tone 5. */
const neutralSyllableAudio = new Map<string, AudioAttachment>();
for (const r of Object.values(neutralAudio.recordings as Record<string, NeutralRecording>)) {
  if (!r.url || [...r.word].length !== 1 || !isNeutralReading(r.reading)) continue;
  neutralSyllableAudio.set(r.reading.normalize('NFC').toLowerCase(), { url: r.url, source: r.source, license: r.license, recordingKind: r.recordingKind ?? 'word' });
}
export function isNeutralReading(reading: string) { return /[a-zü]/i.test(reading) && !TONE_MARK.test(reading.normalize('NFC')) && !TONE_MARK.test(reading.normalize('NFD')); }
export function characterAudioRequest(glyph: string, reading?: string | null): AudioRequest {
  const readings = catalog.readingAudio[glyph] ?? {};
  const chosen = reading ?? null;
  const characterAudio = Object.entries(readings).flatMap(([r, id]) => { const a = id && !excludedCharacterRecordings.has(id) && !isNeutralReading(r) ? catalog.audio[id] : undefined; return a ? [{ ...a, glyph, reading: r }] : []; });
  // Neutral readings: offer the chart's neutral recording for exactly the reading asked
  // for (the card's own speaker for "de"), plus any toneless reading the glyph records.
  const neutralReadings = new Set([chosen, ...Object.keys(readings)].filter((r): r is string => Boolean(r) && isNeutralReading(r!)).map(r => r.normalize('NFC')));
  for (const r of neutralReadings) { const a = neutralSyllableAudio.get(r.toLowerCase()); if (a) characterAudio.push({ ...a, glyph, reading: r }); }
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
