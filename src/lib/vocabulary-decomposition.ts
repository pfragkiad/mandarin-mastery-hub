import { vocabularyKind, type Word } from './mandarin';

export const isChineseGlyph = (text: string) => /^[\p{Script=Han}]$/u.test(text);
export type VocabularyPart = { text: string; word?: Word };

/** Textual vocabulary matching, not a claim about grammar or etymology. */
export function phraseParts(phrase: Word, items: Word[]): VocabularyPart[] {
  const recorded = new Set(phrase.entry?.phraseMetadata?.matchedVocabularyIds ?? []);
  const candidates = items.filter(item => vocabularyKind(item) === 'word' && item.hanzi && item.id !== phrase.id);
  candidates.sort((a, b) => b.hanzi.length - a.hanzi.length || Number(recorded.has(b.hskId ?? -1)) - Number(recorded.has(a.hskId ?? -1)));
  const parts: VocabularyPart[] = [];
  let rest = phrase.hanzi;
  while (rest) {
    const match = candidates.find(item => rest.startsWith(item.hanzi));
    const text = match?.hanzi ?? Array.from(rest)[0] ?? '';
    if (!text) break;
    parts.push({ text, ...(match ? { word: match } : {}) });
    rest = rest.slice(text.length);
  }
  return parts;
}

export function wordCharacters(word: Word) {
  const tokens = word.entry?.tokens.filter(token => token.kind === 'hanzi') ?? [];
  const glyphs = Array.from(word.hanzi).filter(isChineseGlyph);
  return glyphs.map((text, index) => ({ text, pinyin: tokens[index]?.text === text ? tokens[index]?.pinyin ?? '' : '' }));
}