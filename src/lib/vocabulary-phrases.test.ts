import { describe, expect, it } from 'vitest';
import { vocabularyData, phraseStyle, entryTypeLabel } from './data-contract';
import { vocabularyKind, words } from './mandarin';
import { inSubtopic, wordSubtopicIds } from './vocabulary-subtopics';

describe('Full Level 1 replacement', () => {
  it('removes all unofficial Level 1 phrase records and their orphan collections', () => {
    expect(vocabularyData.entries.filter(e => e.hskLevel === 1)).toHaveLength(300);
    expect(vocabularyData.entries.some(e => e.phraseMetadata || (e.hskLevel === 1 && e.entryKind === 'phrase'))).toBe(false);
    expect(vocabularyData.categories.some(c => c.name.includes('L1 practice phrases'))).toBe(false);
  });
  it('keeps the four Level 2 phrases and the unclassified phrase', () => {
    const phrases = vocabularyData.entries.filter(e => e.entryKind === 'phrase'); // recorded file only; sentence phrases are derived
    expect(phrases).toHaveLength(5);
    expect(phrases.filter(e => e.hskLevel === 2).map(e => e.simplified)).toEqual(['不好意思', '没意思', '为什么', '有意思']);
    expect(phrases.find(e => e.hskLevel == null)?.id).toBe('63c1c762-a714-4778-a662-718f2872c8ef');
  });
  it('keeps the greeting headword as its exact word record', () => {
    const greeting = words.find(w => w.hanzi === '你好')!;
    expect(vocabularyKind(greeting)).toBe('word');
    expect(words.some(w => w.hanzi === '你好！')).toBe(false);
  });
});

describe('Sentence phrases', () => {
  const derived = words.filter(w => w.entry?.sentenceSource);
  it('Conversational and Written sentences default to the Example Phrase type; unclassified ones do not', () => {
    const styled = derived.filter(w => phraseStyle(w.entry) !== 'Unclassified');
    expect(styled.length).toBeGreaterThan(0);
    expect(styled.every(w => w.type === 'Example Phrase')).toBe(true);
    expect(derived.filter(w => phraseStyle(w.entry) === 'Unclassified').some(w => w.type === 'Example Phrase')).toBe(false);
  });
  it('a styled standalone phrase without a recorded type also reads Example Phrase', () => {
    const entry = { ...vocabularyData.entries.find(e => e.entryKind === 'phrase' && e.hskLevel == null)!, partOfSpeech: null, style: 'written' as const };
    expect(entryTypeLabel(entry)).toBe('Example Phrase');
    const { style: _style, ...unstyled } = entry;
    expect(entryTypeLabel(unstyled)).not.toBe('Example Phrase');
  });
  it('turns every distinct recorded example sentence into one phrase', () => {
    const sentences = new Set(vocabularyData.entries.filter(e => e.entryKind === 'word').flatMap(e => e.examples.map(x => x.simplified)));
    expect(derived).toHaveLength(sentences.size);
    expect(derived.every(w => vocabularyKind(w) === 'phrase')).toBe(true);
  });
  it('carries the HSK level and syllabus index recorded for one owning parent word', () => {
    // Level and index always come from the same recorded word, never a mixture of two parents.
    // Matched by record id: 点, 过 and 花 are recorded as two headwords each, so the written form is ambiguous.
    expect(derived.every(w => {
      const owner = vocabularyData.entries.find(e => e.id === w.entry?.sentenceSource?.hskFromWordId);
      return owner != null && w.hskId === owner.hsk_index && w.entry?.hskLevel === owner.hskLevel;
    })).toBe(true);
    // 请开门。 is recorded under 开 (level 1, #97) and 门 (level 2, #400): the higher-level word owns it.
    const go = derived.find(w => w.hanzi === '请开门。')!;
    expect(go.entry?.sentenceSource?.hskFromWord).toBe('门');
    expect(go.hskId).toBe(400);
    expect(go.entry?.hskLevel).toBe(2);
  });
  it('classifies phrases as Conversational, Written or Unclassified from the recorded style', () => {
    const love = derived.find(w => w.hanzi === '我爱我的家。')!;
    expect(phraseStyle(love.entry)).toBe('Conversational');
    expect(phraseStyle(words.find(w => w.hanzi === '不好意思')!.entry)).toBe('Unclassified');
    expect(derived.some(w => phraseStyle(w.entry) === 'Written')).toBe(true);
    const standalone = words.find(w => w.hanzi === '不好意思')!.entry!;
    expect(phraseStyle({ ...standalone, style: 'conversational' })).toBe('Conversational');
  });
  it('inherits recorded subtopics from parent words so Phrases filter by subtopic consistently with Words', () => {
    const withSubtopics = derived.filter(w => wordSubtopicIds(w).length > 0);
    expect(withSubtopics.length).toBeGreaterThan(0);
    const samplePhrase = withSubtopics[0]!;
    const firstSubtopic = wordSubtopicIds(samplePhrase)[0]!;
    expect(inSubtopic(samplePhrase, firstSubtopic)).toBe(true);
    expect(inSubtopic(samplePhrase, 'nonexistent-subtopic')).toBe(false);
  });
});
