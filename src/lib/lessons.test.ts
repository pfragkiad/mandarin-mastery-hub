import { describe, expect, it } from 'vitest';
import { buildLessonIndex, lessonCategories, lessonKindFor, lessonSummaries, lessonsForCharacterRecord, loadLesson, summarizeLesson } from './lessons';

// Rules for the study lessons: kinds come from the explicit schema id, categories only from
// the shared registry, lesson IDs are unique, and a lesson attaches to a Characters record
// only through its recorded catalog ID or, without one, its exact headword.
const cats = [{ id: 'time-frequency-repetition', label: 'Time, Frequency & Repetition', description: '' }];
const raw = (over: Record<string, unknown> = {}) => ({ schema_version: 'mandarin-character-lesson/2.4.0', lesson_id: 'char-6B21', lesson: { title: 'Talking About Times', categories: ['time-frequency-repetition'], primary_category_id: 'time-frequency-repetition', tags: [] }, metadata: { status: 'reviewed', catalog_character_id: null }, headword: { hanzi: '次', pinyin: 'cì' }, ...over });

describe('lesson kinds', () => {
  it('reads the kind from the schema family, not the headword', () => {
    expect(lessonKindFor('mandarin-character-lesson/2.4.0')).toBe('character');
    expect(lessonKindFor('mandarin-word-lesson/1.0.0')).toBe('word');
    expect(lessonKindFor('mandarin-phrase-lesson/1.0.0')).toBe('phrase');
    expect(lessonKindFor('mandarin-topic-lesson/1.0.0')).toBe('topic');
  });
  it('keeps a lesson without a headword as a topic lesson with no headword', () => {
    const s = summarizeLesson(raw({ schema_version: 'mandarin-topic-lesson/1.0.0', headword: null }), cats);
    expect(s?.kind).toBe('topic');
    expect(s?.headword).toBeNull();
  });
});

describe('lesson categories', () => {
  it('resolves categories only through the registry', () => {
    const s = summarizeLesson(raw({ lesson: { title: 'X lesson', categories: ['time-frequency-repetition', 'not-registered'], primary_category_id: 'time-frequency-repetition' } }), cats);
    expect(s?.categories.map(c => c.id)).toEqual(['time-frequency-repetition']);
    expect(s?.primaryCategory?.label).toBe('Time, Frequency & Repetition');
  });
  it('every project lesson has a registered primary category', () => {
    for (const s of lessonSummaries) expect(lessonCategories.some(c => c.id === s.primaryCategory?.id)).toBe(true);
  });
});

describe('lesson index', () => {
  it('rejects two files with the same lesson_id', () => {
    expect(() => buildLessonIndex({ 'a.json': raw(), 'b.json': raw() }, cats)).toThrow(/Duplicate lesson_id char-6B21/);
  });
  it('lists both supplied lessons by their lesson IDs', () => {
    expect(lessonSummaries.map(s => s.id).sort()).toEqual(['char-4EE5', 'char-6B21']);
  });
});

describe('lessons on character records', () => {
  const plain = summarizeLesson(raw(), cats)!;
  const pinned = summarizeLesson(raw({ lesson_id: 'char-pinned', metadata: { status: 'reviewed', catalog_character_id: 'Characters:次' } }), cats)!;
  it('matches the exact headword when no catalog ID is recorded', () => {
    expect(lessonsForCharacterRecord([plain], 'Characters:次', '次').map(s => s.id)).toEqual(['char-6B21']);
    expect(lessonsForCharacterRecord([plain], 'Characters:欠', '欠')).toEqual([]);
  });
  it('uses the recorded catalog ID instead of the headword when present', () => {
    expect(lessonsForCharacterRecord([pinned], 'Characters:次', '次').map(s => s.id)).toEqual(['char-pinned']);
    expect(lessonsForCharacterRecord([pinned], 'Components:次', '次')).toEqual([]);
  });
  it('never attaches word or topic lessons to a character record', () => {
    const word = summarizeLesson(raw({ schema_version: 'mandarin-word-lesson/1.0.0', lesson_id: 'word-1' }), cats)!;
    expect(lessonsForCharacterRecord([word], 'Characters:次', '次')).toEqual([]);
  });
});

describe('loading a lesson', () => {
  it('loads a whole lesson by ID and returns null for an unknown ID', async () => {
    const lesson = await loadLesson('char-4EE5');
    expect(lesson?.headword?.hanzi).toBe('以');
    expect(lesson?.sections.vocabulary?.items.length).toBe(12);
    expect(await loadLesson('char-0000')).toBeNull();
  });
});
