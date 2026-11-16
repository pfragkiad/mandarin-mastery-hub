import { describe, expect, it } from 'vitest';
import { collectionOptions, filterWords, vocabularyKind, wordCollections as topicsFor, words } from './mandarin';

// Each Vocabulary tab offers only collections that contain records of that tab's kind.
describe('collectionOptions', () => {
  const phraseCollections = collectionOptions(words.filter(w => vocabularyKind(w) === 'phrase'));
  const wordCollections = collectionOptions(words.filter(w => vocabularyKind(w) === 'word'));
  it('lists only phrase collections on the Phrases tab', () => {
    expect(phraseCollections).not.toContain('Family and relationships · L1 practice phrases');
    expect(phraseCollections).toContain('Grammar & expressions');
    for (const name of phraseCollections) expect(words.some(w => w.collection === name && vocabularyKind(w) === 'phrase')).toBe(true);
  });
  it('lists only word collections on the Words tab', () => {
    expect(wordCollections).not.toContain('Family and relationships · L1 practice phrases');
    for (const name of wordCollections) expect(words.some(w => topicsFor(w).includes(name) && vocabularyKind(w) === 'word')).toBe(true);
  });
  it('finds a word through both its primary and secondary topics', () => {
    const love = words.find(w => w.hanzi === '爱')!;
    expect(love.collection).toBe('Family & Relationships');
    expect(topicsFor(love)).toEqual(['Family & Relationships', 'Qualities, Feelings & Evaluation']);
    for (const topic of topicsFor(love)) expect(filterWords(words, '', topic)).toContain(love);
  });
});
