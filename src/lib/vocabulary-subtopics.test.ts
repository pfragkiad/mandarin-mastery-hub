import { describe, expect, it } from 'vitest';
import { words } from './mandarin';
import { inSubtopic, subtopicOptions, vocabularySubtopics, wordSubtopicIds } from './vocabulary-subtopics';

// The Subtopic dropdown uses only recorded subtopic IDs and the shared v2 registry.
describe('vocabulary subtopics', () => {
  it('offers the 25 active subtopics of taxonomy v2, never the deprecated "animals"', () => {
    expect(vocabularySubtopics.length).toBe(25);
    expect(vocabularySubtopics.some(s => s.id === 'animals')).toBe(false);
    expect(vocabularySubtopics.find(s => s.id === 'digital-technology')).toMatchObject({ label: 'Digital Technology', parentLabel: 'Science & Technology' });
  });
  it('Digital technology keeps exactly the recorded words across Levels 1–5', () => {
    const hits = words.filter(w => inSubtopic(w, 'digital-technology'));
    expect(hits.length).toBe(32);
    expect(hits.map(w => w.hanzi)).toEqual(expect.arrayContaining(['电脑', '手机', '软件']));
    expect(hits.every(w => wordSubtopicIds(w).includes('digital-technology'))).toBe(true);
  });
  it('a picked topic lists only its own subtopics', () => {
    expect(subtopicOptions(words, 'Science & Technology').map(s => s.id).sort()).toEqual(['digital-technology', 'engineering-devices', 'science-research']);
    expect(subtopicOptions(words, 'Numbers & Quantities')).toEqual([]);
  });
});
