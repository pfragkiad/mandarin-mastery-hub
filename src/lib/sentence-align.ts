/**
 * Aligns a recorded example sentence's hanzi characters with the syllables of its
 * recorded pinyin, so the "In a sentence" section can cross-highlight the
 * character ↔ syllable pair under the pointer.
 *
 * Pure presentation pairing: the sentence and its pinyin are both recorded data,
 * and the pairing only matches positions (nth hanzi ↔ nth pinyin token). It never
 * infers a reading — when the token count does not match the hanzi count exactly
 * (punctuation-bearing tokens, apostrophe-joined syllables like Xī'ān, latin
 * words inline) it fails closed to null and the sentence renders without
 * cross-highlighting rather than guessing a wrong pairing.
 */

export interface SentencePair {
  /** Index of the hanzi character within Array.from(sentence). */
  charIndex: number;
  /** Index of the syllable token within the split pinyin. */
  syllableIndex: number;
}

const HANZI = /[㐀-鿿豈-﫿]/;
/** Pinyin letters including tone-marked vowels and ü; used to strip surrounding punctuation. */
const PINYIN_LETTER = "a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ";

export function isHanziChar(ch: string): boolean {
  return HANZI.test(ch);
}

/**
 * Splits recorded pinyin into display tokens. Punctuation attached to a token
 * (commas, question marks, quotes) is kept as a separate trailing/leading piece
 * so the syllable itself can be highlighted without the punctuation.
 */
export function splitPinyinTokens(pinyin: string): { syllable: string; leading: string; trailing: string }[] {
  return splitPinyinDisplayTokens(pinyin).filter(t => t.syllable.length > 0);
}

/** Every whitespace-separated token, including ones without pinyin letters ("+", "...") whose
 *  whole text sits in `trailing` — for renderers that must show the recorded text unchanged. */
export function splitPinyinDisplayTokens(pinyin: string): { syllable: string; leading: string; trailing: string }[] {
  const strip = new RegExp(`^[^${PINYIN_LETTER}]+|[^${PINYIN_LETTER}']+$`, 'g');
  return pinyin
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => {
      const syllable = token.replace(strip, '');
      const start = syllable ? token.indexOf(syllable) : 0;
      return { syllable, leading: token.slice(0, start), trailing: token.slice(start + syllable.length) };
    });
}

/**
 * Pairs each hanzi character of the sentence with the pinyin token at the same
 * position. Returns null when the counts differ (fail closed: no pairing).
 */
export function alignSentencePinyin(sentence: string, pinyin: string): SentencePair[] | null {
  const chars = Array.from(sentence);
  const hanziIndexes = chars.map((ch, i) => (isHanziChar(ch) ? i : -1)).filter(i => i >= 0);
  const tokens = splitPinyinTokens(pinyin);
  if (hanziIndexes.length === 0 || tokens.length !== hanziIndexes.length) return null;
  return hanziIndexes.map((charIndex, syllableIndex) => ({ charIndex, syllableIndex }));
}
