/**
 * Pairs a phrase headword's characters with the syllables of its recorded pinyin, so phrase
 * cards and the phrase detail heading can cross-highlight character ↔ syllable on hover
 * (the same interaction as "In a sentence", see sentence-align.ts).
 *
 * Phrase pinyin is recorded word by word ("bù hǎoyìsi", "Xièxie nǐ!"), not one token per
 * character, and phrases carry no per-character readings. So each recorded token is split
 * into syllables against the attested syllable inventory (the Sound chart's CC-CEDICT
 * list). This only cuts the recorded spelling at syllable edges; it never adds, changes or
 * looks up a reading. Rules, all fail closed (null → no pairing, plain rendering):
 * - every piece must be an attested syllable base with at most one tone mark; an apostrophe
 *   is a forced boundary; a token-final "r" (erhua) is its own piece and must pair with 儿;
 * - the total piece count must equal the number of Han characters;
 * - exactly one such split may exist — two different valid splits (e.g. fang|an vs
 *   fan|gan) mean the spelling is ambiguous, so nothing is paired.
 */

import { splitPinyinTokens } from './sentence-align';

/** One displayed piece of a pinyin token: a syllable (paired) or a separator such as an apostrophe. */
export interface PinyinPiece { text: string; pair: number | null }
export interface PinyinTokenPieces { leading: string; trailing: string; pieces: PinyinPiece[] }
export interface PhrasePairing {
  /** Display tokens of the recorded pinyin, in order, joined by single spaces. */
  tokens: PinyinTokenPieces[];
  /** For each glyph of Array.from(hanzi): its pair index, or null (punctuation, whitespace). */
  glyphPairs: (number | null)[];
}

const HAN = /\p{Script=Han}/u;
const TONE_ACCENTS = /[\u0300\u0301\u0304\u030c]/g;
const MAX_SPLITS = 64;

/** Base letter (tone removed, lower case, ü kept) and whether the letter carried a tone mark. */
function baseLetter(ch: string): { base: string; marked: boolean } {
  const decomposed = ch.normalize('NFD');
  const stripped = decomposed.replace(TONE_ACCENTS, '');
  const base = stripped.normalize('NFC').toLowerCase();
  return { base: base === 'v' ? 'ü' : base, marked: stripped.length !== decomposed.length };
}

/** All ways to cut one token (a syllable run, apostrophes allowed) into attested syllables. */
function tokenSplits(token: string, inventory: ReadonlySet<string>): Array<Array<[number, number]>> {
  const letters = Array.from(token.normalize('NFC')).map(baseLetter);
  const results: Array<Array<[number, number]>> = [];
  const walk = (start: number, acc: Array<[number, number]>) => {
    if (results.length >= MAX_SPLITS) return;
    if (start === letters.length) { results.push(acc); return; }
    if (letters[start]!.base === "'" || letters[start]!.base === '’') { walk(start + 1, acc); return; }
    for (let end = start + 1; end <= Math.min(letters.length, start + 6); end++) {
      const piece = letters.slice(start, end);
      if (piece.some(l => l.base === "'" || l.base === '’')) break;
      const text = piece.map(l => l.base).join('');
      const marks = piece.filter(l => l.marked).length;
      // Token-final "r" after a syllable is erhua (written 儿 in the headword).
      const erhua = text === 'r' && end === letters.length && acc.length > 0;
      if (marks <= 1 && (inventory.has(text) || erhua)) walk(end, [...acc, [start, end]]);
    }
  };
  walk(0, []);
  return results;
}

export function alignPhrasePinyin(hanzi: string, pinyin: string, inventory: ReadonlySet<string>): PhrasePairing | null {
  const glyphs = Array.from(hanzi);
  const hanIndexes = glyphs.map((g, i) => (HAN.test(g) ? i : -1)).filter(i => i >= 0);
  const tokens = splitPinyinTokens(pinyin);
  if (!hanIndexes.length || !tokens.length) return null;
  const options = tokens.map(t => tokenSplits(t.syllable, inventory));
  if (options.some(o => o.length === 0)) return null;

  // Combine one split per token so the pieces cover the Han characters exactly; erhua "r"
  // pieces must land on 儿. Stop at two complete combinations: more than one is ambiguous.
  const found: Array<Array<Array<[number, number]>>> = [];
  const combine = (t: number, used: number, acc: Array<Array<[number, number]>>) => {
    if (found.length > 1) return;
    if (t === tokens.length) { if (used === hanIndexes.length) found.push(acc); return; }
    for (const split of options[t]!) {
      const next = used + split.length;
      if (next > hanIndexes.length) continue;
      const letters = Array.from(tokens[t]!.syllable.normalize('NFC'));
      const erhuaOk = split.every(([s, e], k) => letters.slice(s, e).join('').toLowerCase() !== 'r' || k === 0 || glyphs[hanIndexes[used + k]!] === '儿');
      if (erhuaOk) combine(t + 1, next, [...acc, split]);
    }
  };
  combine(0, 0, []);
  if (found.length !== 1) return null;

  const glyphPairs: (number | null)[] = glyphs.map(() => null);
  hanIndexes.forEach((glyphIndex, pair) => { glyphPairs[glyphIndex] = pair; });
  let pair = 0;
  const pieced = tokens.map((token, t) => {
    const letters = Array.from(token.syllable.normalize('NFC'));
    const pieces: PinyinPiece[] = [];
    let cursor = 0;
    for (const [s, e] of found[0]![t]!) {
      if (s > cursor) pieces.push({ text: letters.slice(cursor, s).join(''), pair: null });
      pieces.push({ text: letters.slice(s, e).join(''), pair: pair++ });
      cursor = e;
    }
    if (cursor < letters.length) pieces.push({ text: letters.slice(cursor).join(''), pair: null });
    return { leading: token.leading, trailing: token.trailing, pieces };
  });
  return { tokens: pieced, glyphPairs };
}
