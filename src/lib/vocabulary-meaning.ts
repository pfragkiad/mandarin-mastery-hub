import { cardMeaning, cardReadingSplit } from './glyph-presentation';
import { vocabularyKind, words, type Word } from './mandarin';
import { TRANSLATION_SEPARATOR } from './data-contract';

/**
 * Vocabulary-led character translations: when a Characters record's exact glyph is also an HSK
 * vocabulary word (和 hé "and; with") whose translation differs from the glyph's own, the
 * word's translation leads and the glyph's senses follow ("and; with; harmony, peace; peaceful,
 * calm"). Display-only — no record is rewritten.
 *
 * Rules:
 * - Exact glyph match on single-character vocabulary words (never phrases), whose reading is
 *   exactly one of the record's readings; a word read differently (长 cháng on a zhǎng card) is
 *   skipped so the card's pinyin never fronts another reading's meaning.
 * - Glyph comma terms that the vocabulary already gives are removed (爱 → "love; like; be fond
 *   of"), and a glyph sense left empty disappears.
 * - Records with a reviewed per-reading split (了 le / liǎo) keep that split unchanged.
 */
let index: Map<string, Word[]> | null = null;
function vocabularyWords(glyph: string): Word[] {
  if (!index) {
    index = new Map();
    for (const word of words) {
      if (vocabularyKind(word) === 'phrase' || Array.from(word.hanzi).length !== 1) continue;
      index.set(word.hanzi, [...(index.get(word.hanzi) ?? []), word]);
    }
  }
  return index.get(glyph) ?? [];
}

const norm = (text: string) => text.normalize('NFC').trim().toLowerCase();

/** The vocabulary-led text for a meaning already prepared for display (see module comment). */
export function vocabularyLedMeaning(glyph: string, readings: string, meaning: string, vocabulary: { pinyin: string; meaning: string }[] = vocabularyWords(glyph)): string {
  const recorded = new Set(readings.split('/').map(norm).filter(Boolean));
  const leading = [...new Set(vocabulary.filter(word => recorded.has(norm(word.pinyin)) && word.meaning.trim()).map(word => word.meaning.trim()))];
  if (!leading.length || leading.length === 1 && norm(leading[0]!) === norm(meaning)) return meaning;
  const vocab = leading.join(TRANSLATION_SEPARATOR);
  const given = new Set(leading.flatMap(text => splitTopLevel(text, /[·;,]/)).map(norm));
  const rest = splitTopLevel(meaning, /[;；]/)
    .map(sense => splitTopLevel(sense, /[,，]/).filter(term => !given.has(norm(term))).join(', '))
    .filter(Boolean);
  return rest.length ? `${vocab}; ${rest.join('; ')}` : vocab;
}

/** The translation a Characters record shows wherever it appears (cards, details, Finder,
 *  Flashcards, search, lesson hints, Practice): cardMeaning, led by its vocabulary word. */
export function characterMeaning(glyph: string, pinyin: string, meaning: string): string {
  const shown = cardMeaning(glyph, pinyin, meaning);
  return cardReadingSplit(glyph, pinyin, meaning) ? shown : vocabularyLedMeaning(glyph, pinyin, shown);
}

/** Split at separators outside brackets, trimming parts and dropping empty ones. */
export function splitTopLevel(text: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index]!;
    if ('(（['.includes(ch)) depth += 1;
    else if (')）]'.includes(ch) && depth > 0) depth -= 1;
    else if (depth === 0 && separator.test(ch)) { parts.push(text.slice(start, index)); start = index + 1; }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

/** Comparison key for one translation term: case, a leading "to"/"a"/"an"/"the" and trailing
 *  punctuation are ignored, so "to assemble" matches "assemble" and "a meeting" matches "meeting". */
export function termKey(term: string): string {
  return norm(term).replace(/^(?:to|a|an|the)\s+/, '').replace(/[.。!?]+$/, '').replace(/\s+/g, ' ').trim();
}

/**
 * Script-form translation merging (会 / 會): a further form on a shared Characters card shows only
 * the comma terms that none of the earlier forms' shown translations already give (compared by
 * termKey); senses left empty disappear. Returns '' when everything is already covered, so the
 * card collapses to one translation. Display-only — each form's record keeps its own text.
 * Example: "can; know how; assemble, meet together; meeting" + "to assemble, meet together;
 * a meeting; an organization" → "an organization".
 */
export function uniqueFormSenses(shown: string[], meaning: string): string {
  const given = new Set(shown.flatMap(text => splitTopLevel(text, /[·;；,，]/)).map(termKey));
  return splitTopLevel(meaning, /[;；]/)
    .map(sense => splitTopLevel(sense, /[,，]/).filter(term => !given.has(termKey(term))).join(', '))
    .filter(Boolean)
    .join(TRANSLATION_SEPARATOR);
}
