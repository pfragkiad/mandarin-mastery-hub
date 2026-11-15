import { describe, expect, it } from 'vitest';
import { normalizeFlashcardCategory } from './flashcard-filters';

describe('normalizeFlashcardCategory', () => {
  const known = ['Greetings', 'Numbers'];
  it('defaults to Characters', () => expect(normalizeFlashcardCategory(undefined, undefined, known)).toEqual({ category: 'Ref:Character', collection: '' }));
  it('keeps a vocabulary collection only for Words/Phrases', () => {
    expect(normalizeFlashcardCategory('Phrases', 'Greetings', known)).toEqual({ category: 'Phrases', collection: 'Greetings' });
    expect(normalizeFlashcardCategory('Ref:Radical', 'Greetings', known)).toEqual({ category: 'Ref:Radical', collection: '' });
  });
  it('reads older collection links as Words of that collection', () => {
    expect(normalizeFlashcardCategory('Numbers', undefined, known)).toEqual({ category: 'Words', collection: 'Numbers' });
    expect(normalizeFlashcardCategory('All vocabulary', undefined, known)).toEqual({ category: 'Words', collection: '' });
  });
});
