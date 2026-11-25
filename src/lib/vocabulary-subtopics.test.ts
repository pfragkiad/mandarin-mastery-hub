import { describe, expect, it } from 'vitest';
import { words, vocabularyKind } from './mandarin';
import { inSubtopic, primarySubtopicLabel, subtopicOptions, vocabularySubtopics, wordSubtopicIds } from './vocabulary-subtopics';
import { idiomToWord } from './idioms';

// The Subtopic dropdown uses only recorded subtopic IDs and the shared v2 registry.
describe('vocabulary subtopics', () => {
  it('offers the 25 active subtopics of taxonomy v2, never the deprecated "animals"', () => {
    expect(vocabularySubtopics.length).toBe(25);
    expect(vocabularySubtopics.some(s => s.id === 'animals')).toBe(false);
    expect(vocabularySubtopics.find(s => s.id === 'digital-technology')).toMatchObject({ label: 'Digital Technology', parentLabel: 'Science & Technology' });
  });
  it('Digital technology keeps exactly the recorded words across Levels 1–5', () => {
    // Headwords only: derived sentence phrases inherit their parent word's subtopic, so they
    // join the same filter but never change the recorded word count.
    const hits = words.filter(w => inSubtopic(w, 'digital-technology') && vocabularyKind(w) === 'word');
    expect(hits.length).toBe(32);
    expect(hits.map(w => w.hanzi)).toEqual(expect.arrayContaining(['电脑', '手机', '软件']));
    expect(hits.every(w => wordSubtopicIds(w).includes('digital-technology'))).toBe(true);
    expect(words.filter(w => inSubtopic(w, 'digital-technology') && vocabularyKind(w) === 'phrase').length).toBe(64);
  });
  it('a picked topic lists only its own subtopics', () => {
    expect(subtopicOptions(words, 'Science & Technology').map(s => s.id).sort()).toEqual(['digital-technology', 'engineering-devices', 'science-research']);
    expect(subtopicOptions(words, 'Numbers & Quantities')).toEqual([]);
  });
});

// Idiom card headers prefer the recorded subtopic and fall back to the parent topic only
// when no subtopic was recorded (word-card.tsx: primarySubtopicLabel(word) ?? word.collection).
describe('primary subtopic label', () => {
  const withSubtopic = idiomToWord({ id: 'idiom-1', rank: 1, hanzi: '坚定不移', pinyin: 'jiān dìng bù yí', meaning: 'firm and unwavering', topic: 'Qualities, Feelings & Evaluation', subtopics: ['emotions-attitudes'] }, 'THUOCL');
  const withoutSubtopic = idiomToWord({ id: 'idiom-150', rank: 150, hanzi: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: 'ruin the effect by adding what is superfluous', topic: 'Actions & Interactions' }, 'THUOCL');

  it('names the primary recorded subtopic of an idiom', () => {
    expect(primarySubtopicLabel(withSubtopic)).toBe('Emotions & Attitudes');
  });

  it('returns null when no subtopic is recorded, so the card can show its topic', () => {
    expect(primarySubtopicLabel(withoutSubtopic)).toBeNull();
    expect(primarySubtopicLabel(withSubtopic) ?? withSubtopic.collection).toBe('Emotions & Attitudes');
    expect(primarySubtopicLabel(withoutSubtopic) ?? withoutSubtopic.collection).toBe('Actions & Interactions');
  });

  it('never invents a label for an unknown subtopic id', () => {
    const unknown = idiomToWord({ id: 'idiom-2', rank: 2, hanzi: '随时随地', pinyin: 'suí shí suí dì', meaning: 'anytime and anywhere', topic: 'Time & Calendar', subtopics: ['not-a-real-subtopic'] }, 'THUOCL');
    expect(primarySubtopicLabel(unknown)).toBeNull();
  });
});
