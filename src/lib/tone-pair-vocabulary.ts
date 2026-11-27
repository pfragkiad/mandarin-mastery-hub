/** Extend the authored tone bank with exact recorded Vocabulary words. The shared phrase
 * splitter only separates recorded pinyin; it never supplies character readings. 一/不
 * need authored citation/speech labels, so new contextual examples fail closed. */
import { alignPhrasePinyin } from './phrase-pinyin-align';
import { soundChartTarget, toneMark, type PinyinSyllable } from './pinyin-guide';
import { vocabularyKind, type Word } from './mandarin';
import type { TonePairData, TonePairExample, PairTone } from './tone-pairs';

export function vocabularyToneExample(word: Word, syllables: PinyinSyllable[]): TonePairExample | null {
  if (vocabularyKind(word) !== 'word' || !/^\p{Script=Han}{2}$/u.test(word.hanzi) || /[一不]/u.test(word.hanzi)) return null;
  const audio = word.audio;
  // Keep the bank's existing speaker/source contract. Unrecorded words never promise a clip.
  if (!audio?.url || !audio.source.includes('Yue Tan') || !audio.license) return null;
  const pairing = alignPhrasePinyin(word.hanzi, word.pinyin, new Set(syllables.map(s => s.base)));
  if (!pairing) return null;
  const readings = pairing.tokens.flatMap(t => t.pieces.filter(p => p.pair !== null).map(p => p.text));
  if (readings.length !== 2) return null;
  const chartLinks: TonePairExample['chartLinks'] = [];
  for (const reading of readings) {
    const target = soundChartTarget({ syllables }, reading);
    if (!target) return null;
    chartLinks.push({ reading, ...target });
  }
  const first = chartLinks[0]; const second = chartLinks[1];
  if (!first || !second || first.tone === 5) return null;
  const citationTones: PairTone[] = [first.tone, second.tone];
  const third = first.tone === 3 && second.tone === 3;
  // This is the same explicitly unreviewed 3+3 teaching draft as the authored examples.
  const expectedSpokenTones: PairTone[] = third ? [2, 3] : [...citationTones];
  return {
    id: `vocabulary:${word.id}`, vocabularyEntryId: word.id, sourceFileIds: [],
    headword: word.hanzi, sourceReading: word.pinyin, english: word.meaning,
    citationSyllables: readings, citationTones, expectedSpokenTones,
    expectedSpokenSyllables: chartLinks.map((l, i) => toneMark(l.base, expectedSpokenTones[i] ?? l.tone)),
    pair: `${first.tone}-${second.tone}`, rule: third ? 'third' : null, inPairMatrix: true,
    reviewStatus: 'editorial_draft_audio_not_listening_reviewed', chartLinks,
    audio: { url: audio.url, source: audio.source, license: audio.license, speaker: 'Yue Tan',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/us/', recordingKind: audio.recordingKind ?? 'whole-word' },
  };
}

/** Authored rows retain their IDs, order, provenance and speech labels; additions use exact
 * vocabulary IDs, even when multiple records have the same written form. */
export function enrichTonePairs(data: TonePairData, words: readonly Word[], syllables: PinyinSyllable[]): TonePairData {
  const existing = new Set(data.examples.map(e => e.vocabularyEntryId));
  const examples = [...data.examples];
  for (const word of words) {
    if (existing.has(word.id)) continue;
    const row = vocabularyToneExample(word, syllables);
    if (row) { examples.push(row); existing.add(word.id); }
  }
  return { ...data, examples };
}