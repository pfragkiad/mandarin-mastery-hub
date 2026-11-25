import { isHanziChar } from './sentence-align';

type SentenceSource = { id: number; text: string; url: string; contributor: string | null; license: string };
type SuppliedReview = { overall_status: string; zh_issues: string; en_issues: string; review_notes: string };
/** Exact first-candidate assignment. Source text, editorial text and review scopes
 * stay distinct; neither a sentence occurrence nor its review supplies a glyph reading.
 */
export type CharacterTatoebaExample = {
  id: string; character: string; sentence: string; translation: string; pinyin: string | null; audio: null;
  binding: { chineseSentenceId: number; englishSentenceId: number; originalChineseSha256: string; originalEnglishSha256: string; displayChineseSha256: string; displayEnglishSha256: string };
  source: { kind: 'tatoeba'; label: string; chinese: SentenceSource; english: SentenceSource; licenseUrl: string; okTag: boolean; positiveRatings: number };
  review: { status: 'Pass' | 'Minor_Review' | 'Needs_Fix'; latestRound: number; scope: string; notes: string;
    reviewer1: SuppliedReview; reviewer2: SuppliedReview | null; reviewer2Disposition: string;
    round3ReturnedForThisId: boolean; round3EvidenceIds: string[];
    pinyinVerified: false; targetCharacterSenseVerified: false; audioVerified: false };
  editorial: { chineseChanged: boolean; englishChanged: boolean; wordingSource: string;
    pinyin: { script: string; reviewer: string | null; markedReviewed: boolean; text: string } | null;
    pinyinWithheldAfterChineseEdit: boolean; recordingsImported: false;
    recordingEvidence: { externalRecordingsAllowed: boolean; sourceRecordingCount: number; missingLicenseCount: number; policy: string } };
  display: { marker: 'source_info' | 'warning_triangle'; label: string };
};
type ExampleFile = { version: number; examples: Record<string, CharacterTatoebaExample> };
let pending: Promise<ExampleFile | null> | undefined;
let indexPending: Promise<Record<string, string> | null> | undefined;

/** The library requests only the small availability index, never sentence bodies. */
export async function loadCharacterSentenceAvailability(recordId: string): Promise<boolean> {
  if (!recordId.startsWith('Characters:')) return false;
  if (!indexPending) indexPending = Promise.resolve().then(() => fetch('/data/character-sentence-index.json')).then(async response => {
    if (!response.ok) throw new Error('Sentence index unavailable');
    const data = await response.json() as { version: number; records: Record<string, string> };
    if (data.version !== 1 || !data.records || typeof data.records !== 'object') throw new Error('Unsupported sentence index');
    return data.records;
  }).catch(() => { indexPending = undefined; return null; });
  const marker = (await indexPending)?.[recordId];
  return marker === 'source_info' || marker === 'warning_triangle';
}

/** Lazy, shared fetch; malformed assignments fail closed and failed requests can retry. */
export async function loadCharacterTatoebaExample(recordId: string): Promise<CharacterTatoebaExample | null> {
  if (!recordId.startsWith('Characters:')) return null;
  if (!pending) pending = Promise.resolve().then(() => fetch('/data/character-tatoeba-examples.json')).then(async response => {
    if (!response.ok) throw new Error('Tatoeba examples unavailable');
    const data = await response.json() as ExampleFile;
    if (data.version !== 1 || !data.examples || typeof data.examples !== 'object') throw new Error('Unsupported Tatoeba examples');
    return data;
  }).catch(() => { pending = undefined; return null; });
  const example = (await pending)?.examples[recordId];
  if (!example || typeof example.character !== 'string' || Array.from(example.character).length !== 1
    || recordId !== `Characters:${example.character}` || typeof example.sentence !== 'string' || !example.sentence.includes(example.character)
    || typeof example.translation !== 'string' || !example.translation || example.audio !== null
    || !example.binding || !example.source || !example.review || !example.display || !example.editorial) return null;
  const { chinese, english } = example.source;
  if (!chinese || !english || !Number.isSafeInteger(chinese.id) || !Number.isSafeInteger(english.id)
    || example.id !== `tatoeba:${chinese.id}:${english.id}:U+${example.character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`
    || example.binding.chineseSentenceId !== chinese.id || example.binding.englishSentenceId !== english.id
    || chinese.url !== `https://tatoeba.org/en/sentences/show/${chinese.id}` || english.url !== `https://tatoeba.org/en/sentences/show/${english.id}`
    || chinese.license !== 'CC BY 2.0 FR' || english.license !== 'CC BY 2.0 FR'
    || example.source.licenseUrl !== 'https://creativecommons.org/licenses/by/2.0/fr/'
    || !['Pass', 'Minor_Review', 'Needs_Fix'].includes(example.review.status)
    || example.display.marker !== (example.review.status === 'Pass' ? 'source_info' : 'warning_triangle')
    || (example.pinyin !== null && (typeof example.pinyin !== 'string' || !example.pinyin.trim() || example.sentence !== chinese.text))) return null;
  return example;
}

/** Builds our own pinyin line for the exact displayed Tatoeba sentence from each
 * hanzi's recorded catalogue reading — never from the Tatoeba transcription, whose
 * word grouping does not match our translations. Pure presentation:
 * - multi-reading characters use the first recorded reading (the dictionary-primary
 *   one); name-specific readings cannot be detected and are never guessed;
 * - a sentence containing any hanzi without a recorded reading fails closed to no
 *   pinyin line at all, rather than showing a partial, misaligned one;
 * - Latin text, digits and punctuation pass through as recorded, syllables are
 *   spaced per character (which also keeps hover pairing exact), and the first
 *   syllable after sentence-ending punctuation is capitalized.
 */
export function ownSentencePinyin(sentence: string, readingFor: (glyph: string) => string | null): string | undefined {
  const NO_SPACE_BEFORE = new Set([...',.!?;:)%\\]』」’”…、，。！？；：']);
  const NO_SPACE_AFTER = new Set([...'([『「‘“']);
  const tokens: { text: string; syllable: boolean }[] = [];
  let latin = '';
  const flush = () => { if (latin) { tokens.push({ text: latin, syllable: false }); latin = ''; } };
  for (const ch of Array.from(sentence)) {
    if (isHanziChar(ch)) {
      flush();
      const reading = readingFor(ch)?.split(' / ')[0]?.trim();
      if (!reading) return undefined;
      tokens.push({ text: reading, syllable: true });
    } else if (/\s/.test(ch)) flush();
    else latin += ch;
  }
  flush();
  let out = '';
  let capitalize = true;
  for (const token of tokens) {
    if (out && !NO_SPACE_BEFORE.has(token.text.charAt(0)) && !NO_SPACE_AFTER.has(out.charAt(out.length - 1))) out += ' ';
    out += token.syllable && capitalize ? token.text.charAt(0).toUpperCase() + token.text.slice(1) : token.text;
    capitalize = /[.!?。！？]$/.test(token.text) ? true : token.syllable || /[A-Za-z0-9]/.test(token.text) ? false : capitalize;
  }
  return out;
}
