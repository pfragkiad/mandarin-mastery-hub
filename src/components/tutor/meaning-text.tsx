import { vocabularyData } from '@/lib/data-contract';

/** Split points: form descriptions and parenthesised spans are not lexical translations. */
const SPLIT = /(component form of[^;·\n]*|[（(][^（）()·\n]*[）)])/gi;

/** Pure splitter so the italic rule is testable without rendering. */
export function meaningParts(text: string): string[] {
  return text.split(SPLIT);
}

/** Abbreviations and ellipses whose final period is part of the word, not sentence punctuation. */
const KEEP_FINAL_PERIOD = /(?:\b(?:etc|e\.g|i\.e|cf|esp|approx|lit|fig|abbr|usu|var|ca)\.|\.\.\.)$/i;

/**
 * Translations are glosses, not sentences: one trailing period is trimmed for display
 * ("King, ruler, surname." → "King, ruler, surname"), keeping "etc.", "e.g." and "...".
 * Display-only — the recorded text is never rewritten.
 */
/**
 * Translations of recorded vocabulary entries whose Chinese ends with sentence punctuation
 * (我姓王。) are full sentences, so their final period is kept. Exact text match only.
 */
const SENTENCE_TRANSLATIONS = new Set(vocabularyData.entries
  .filter(entry => /[。！？.!?]$/.test(entry.simplified.trim()))
  .flatMap(entry => [...entry.meanings.map(meaning => meaning.trim()), entry.meanings.join(' · ').trim(), entry.meanings.join('; ').trim()]));

export function trimTranslationPeriod(text: string): string {
  const trimmed = text.trimEnd();
  if (SENTENCE_TRANSLATIONS.has(trimmed)) return trimmed;
  return trimmed.endsWith('.') && !KEEP_FINAL_PERIOD.test(trimmed) ? trimmed.slice(0, -1).trimEnd() : trimmed;
}

/**
 * Form descriptions and parenthesised spans render italic; surrounding meanings stay upright.
 * `sentence` keeps a full-sentence translation (example sentences) exactly as recorded.
 */
export function MeaningText({ text, sentence = false }: { text: string; sentence?: boolean }) {
  return <>{meaningParts(sentence ? text : trimTranslationPeriod(text)).map((part, index) => /^component form of/i.test(part) || /^[（(]/.test(part)
    ? <em key={index} className="italic">{part}</em>
    : part)}</>;
}
