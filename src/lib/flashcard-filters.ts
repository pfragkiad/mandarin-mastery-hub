/**
 * Flashcards "What to practise" kinds, in the app's glyphs-first order
 * (Characters, Components, Radicals, then vocabulary Words and Phrases).
 *
 * The URL `category` value is one of these kinds. Vocabulary collections live in a
 * separate `collection` value. Older links stored a collection name or "All vocabulary"
 * in `category`; `normalizeFlashcardCategory` maps them onto the Words kind (plus that
 * collection) so they still open the closest deck rather than an empty one.
 */
export const flashcardKinds = [
  { value: 'Ref:Character', label: 'Characters' },
  { value: 'Ref:Component', label: 'Components' },
  { value: 'Ref:Radical', label: 'Radicals' },
  { value: 'Words', label: 'Words' },
  { value: 'Phrases', label: 'Phrases' },
  { value: 'Idioms', label: 'Idioms' },
] as const;
export type FlashcardKind = typeof flashcardKinds[number]['value'];
export const DEFAULT_FLASHCARD_KIND: FlashcardKind = 'Ref:Character';
export const flashcardKindLabel = (kind: string) => flashcardKinds.find(k => k.value === kind)?.label ?? kind;
/** 'word' / 'phrase' / 'idiom' for vocabulary kinds, undefined for reference kinds. */
export const flashcardVocabularyKind = (kind: string): 'word' | 'phrase' | 'idiom' | undefined =>
  kind === 'Words' ? 'word' : kind === 'Phrases' ? 'phrase' : kind === 'Idioms' ? 'idiom' : undefined;

export function normalizeFlashcardCategory(category: string | undefined, collection: string | undefined, knownCollections: readonly string[]): { category: FlashcardKind; collection: string } {
  const kind = flashcardKinds.find(k => k.value === category);
  if (kind) return { category: kind.value, collection: flashcardVocabularyKind(kind.value) ? collection ?? '' : '' };
  if (category === 'All vocabulary') return { category: 'Words', collection: '' };
  if (category && knownCollections.includes(category)) return { category: 'Words', collection: category };
  return { category: DEFAULT_FLASHCARD_KIND, collection: '' };
}
