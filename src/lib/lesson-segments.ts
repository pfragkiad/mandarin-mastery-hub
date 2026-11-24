/**
 * Splits a lesson expression that is not itself one vocabulary record (对不起请问, 明天见)
 * into linkable pieces, words first and single characters only as a last resort.
 *
 * Inputs: the recorded hanzi and `wordIdFor`, which returns the exact Vocabulary record ID
 * for a headword only when exactly one record carries that written form (ambiguous or
 * unknown headwords return null, so no identity is guessed).
 *
 * Rule: greedy longest match from the left over Han runs (2+ characters before 1); a single
 * character becomes a word piece when a unique one-character word exists, otherwise a
 * character piece (linked to Glyphs by the caller). Non-Han text (punctuation, spaces) stays
 * plain. Segmentation is presentation only: the recorded expression, its pinyin and its audio
 * are never split or changed.
 */
export type LessonSegment = { kind: 'word'; text: string; id: string } | { kind: 'char'; text: string } | { kind: 'text'; text: string };

const HAN = /^\p{Script=Han}$/u;
const MAX_WORD = 8;

export function segmentLessonExpression(hanzi: string, wordIdFor: (headword: string) => string | null): LessonSegment[] {
  const chars = Array.from(hanzi);
  const out: LessonSegment[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i]!;
    if (!HAN.test(ch)) {
      const last = out[out.length - 1];
      if (last?.kind === 'text') last.text += ch; else out.push({ kind: 'text', text: ch });
      i++; continue;
    }
    let run = i;
    while (run < chars.length && HAN.test(chars[run]!)) run++;
    let matched = false;
    for (let len = Math.min(MAX_WORD, run - i); len >= 1; len--) {
      const piece = chars.slice(i, i + len).join('');
      const id = wordIdFor(piece);
      if (id) { out.push({ kind: 'word', text: piece, id }); i += len; matched = true; break; }
    }
    if (!matched) { out.push({ kind: 'char', text: ch }); i++; }
  }
  return out;
}
