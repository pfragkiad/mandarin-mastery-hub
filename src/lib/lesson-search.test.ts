import { describe, expect, it } from 'vitest';
import { lessonSearchEntry, lessonTexts, searchLessons } from './lesson-search';
import type { LessonSummary } from './lessons';

const summary = (id: string, title: string): LessonSummary => ({ id, kind: 'topic', schemaVersion: '3', title, subtitle: '', description: '', categories: [], primaryCategory: null, tags: [], status: 'draft', audience: '', dateReviewed: null, lessonType: '', objectives: [], headword: null, catalogCharacterId: null });
const raw = { lesson_id: 'x', catalog_character_refs: { 学: 'Characters:学' }, sections: [{ id: 'sec-student', blocks: [{ hanzi: '我是学生。', pinyin: 'Wǒ shì xuéshēng.', english: 'I’m a student.', register: 'neutral' }] }] };
const entries = [lessonSearchEntry(summary('a', 'Talking about people'), raw), lessonSearchEntry(summary('b', 'Students and school'), {})];

describe('lesson search', () => {
  it('reads lesson text but never IDs, codes or the character reference table', () => {
    expect(lessonTexts(raw)).toEqual(['我是学生。', 'Wǒ shì xuéshēng.', 'I’m a student.']);
  });
  it('matches hanzi, toneless pinyin and English inside the lesson', () => {
    expect(searchLessons(entries, '学生').map(h => h.lesson.id)).toEqual(['a']);
    expect(searchLessons(entries, 'xuesheng')[0]?.snippet.match).toBe('xuéshēng');
    expect(searchLessons(entries, "i'm a").map(h => h.lesson.id)).toEqual(['a']);
  });
  it('a query typed with tone marks matches only that tone spelling', () => {
    expect(searchLessons(entries, 'xuéshēng')).toHaveLength(1);
    expect(searchLessons(entries, 'xuěshēng')).toHaveLength(0);
  });
  it('lessons matching in their title come first', () => {
    expect(searchLessons(entries, 'student').map(h => h.lesson.id)).toEqual(['b', 'a']);
  });
  it('an internal code alone never matches', () => {
    expect(searchLessons(entries, 'neutral')).toHaveLength(0);
    expect(searchLessons(entries, 'sec-student')).toHaveLength(0);
  });
});
