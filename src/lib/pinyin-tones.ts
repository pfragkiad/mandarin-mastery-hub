// Tone-number pinyin input: learners commonly type "shi1" for shī (the Pleco/MDBG
// convention, digits 1–4 for the four tones, 5 for neutral). These helpers convert
// recorded tone-marked readings to numbered syllables so both exact and loose pinyin
// search accept either notation without changing the stored data.

const TONE_MARKS: Record<string, [base: string, tone: string]> = {
  ā: ['a', '1'], á: ['a', '2'], ǎ: ['a', '3'], à: ['a', '4'],
  ē: ['e', '1'], é: ['e', '2'], ě: ['e', '3'], è: ['e', '4'],
  ī: ['i', '1'], í: ['i', '2'], ǐ: ['i', '3'], ì: ['i', '4'],
  ō: ['o', '1'], ó: ['o', '2'], ǒ: ['o', '3'], ò: ['o', '4'],
  ū: ['u', '1'], ú: ['u', '2'], ǔ: ['u', '3'], ù: ['u', '4'],
  ǖ: ['ü', '1'], ǘ: ['ü', '2'], ǚ: ['ü', '3'], ǜ: ['ü', '4'],
};

const isVowel = (c: string) => 'aeiouü'.includes(c);

/**
 * Convert tone-marked pinyin to numbered form: "shī" → "shi1",
 * "Zhōngguó" → "zhong1guo2", "nǐ hǎo" → "ni3hao3". Unmarked (neutral)
 * syllables get 5. Syllable boundaries are inferred from the tone marks:
 * after a marked vowel only the codas n / ng / r may extend the syllable.
 */
export function pinyinNumbered(value: string): string {
  let out = '';
  let syllable = '';
  let tone = '';
  let coda = '';
  const flush = () => {
    if (syllable) out += syllable + (tone || '5');
    syllable = '';
    tone = '';
    coda = '';
  };
  for (const raw of value.toLowerCase()) {
    const ch = raw === 'v' ? 'ü' : raw;
    if (ch === ' ' || ch === "'" || ch === '-' || ch === '·') { flush(); continue; }
    const marked = TONE_MARKS[ch];
    if (marked) {
      if (tone) flush(); // a second marked vowel always starts a new syllable
      syllable += marked[0];
      tone = marked[1];
      continue;
    }
    if (!/[a-zü]/.test(ch)) continue;
    if (tone) {
      if (isVowel(ch)) { flush(); syllable = ch; continue; }
      // After the tone, only n / ng / r may extend the syllable as a coda.
      if (coda === '' && (ch === 'n' || ch === 'r')) { syllable += ch; coda = ch; continue; }
      if (coda === 'n' && ch === 'g') { syllable += ch; coda = 'ng'; continue; }
      flush();
      syllable = ch;
      continue;
    }
    syllable += ch;
  }
  flush();
  return out;
}

/** Normalize a typed pinyin query: lowercase, v→ü, drop spaces and separators. */
export const normalizePinyinQuery = (query: string) =>
  query.toLowerCase().trim().replace(/v/g, 'ü').replace(/[\s'·-]+/g, '');

/**
 * Does a recorded reading match a typed pinyin query? Accepts tone marks or tone
 * numbers; exact mode requires the whole reading to equal the query, loose mode
 * accepts a substring. Exact mode still compares tone-stripped forms, so "shi"
 * keeps matching "shī" exactly as before, while "shi1" matches only shī.
 */
export function pinyinReadingMatches(reading: string, query: string, exact: boolean): boolean {
  const q = normalizePinyinQuery(query);
  if (!q) return true;
  const plain = reading.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s'·-]+/g, '');
  const numbered = pinyinNumbered(reading);
  return exact ? plain === q || numbered === q : plain.includes(q) || numbered.includes(q);
}
