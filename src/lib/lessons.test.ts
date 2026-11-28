import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { toTopicContent, buildLessonIndex, correctLessonChoices, lessonCategories, lessonCharacterRefs, lessonKindFor, lessonSummaries, lessonsForCharacterRecord, loadLesson, summarizeLesson, syllabusEntryFor, syllabusIndexForReference, type LessonQuestion } from './lessons';
import { lessonGlyphHintById } from './lesson-hints';

// Rules for the study lessons: kinds come from the explicit schema id, categories only from
// the shared registry, lesson IDs are unique, and a lesson attaches to a Characters record
// only through its recorded catalog ID or, without one, its exact headword.
const cats = [{ id: 'time-frequency-repetition', label: 'Time, Frequency & Repetition', description: '' }];

describe('syllabus references', () => {
  const entry = { id: 'preserved-word-id', simplified: '电脑', entryKind: 'word', hskVersion: '3.0', hsk_index: 35 };

  it('resolves a lesson reference through the current official hsk_index', () => {
    const item = { hanzi: '电脑', syllabus_refs: [{ curriculum_id: 'hsk3-2025', entry_id: 35 }] };
    const other = { id: 'different-word', simplified: '电影', entryKind: 'word', hskVersion: '3.0', hsk_index: 36 };
    expect(syllabusEntryFor(item, [other, entry])).toBe(entry);
    expect(syllabusEntryFor({ ...item, hanzi: '电影' }, [other, entry])).toBeNull();
    expect(syllabusIndexForReference(entry, 'hsk3-2025')).toBe(35);
  });

  it('rejects unknown curricula', () => {
    expect(syllabusIndexForReference(entry, 'unknown-curriculum')).toBeNull();
  });
});
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
  it('uses the 22 parent topics for top-level discovery while retaining subtopics in lesson vocabulary', () => {
    expect(lessonCategories).toHaveLength(22);
    expect(lessonCategories.some(c => c.id === 'science-technology')).toBe(true);
    expect(lessonCategories.some(c => c.id === 'digital-technology')).toBe(false);
  });
});

describe('lesson index', () => {
  it('rejects two files with the same lesson_id', () => {
    expect(() => buildLessonIndex({ 'a.json': raw(), 'b.json': raw() }, cats)).toThrow(/Duplicate lesson_id char-6B21/);
  });
  it('lists the two character lessons, the 21 HSK Level 1 + 25 Level 2 + 35 Level 3 topic lessons and the 17 conversational lessons, never the legacy copies', () => {
    const ids = lessonSummaries.map(s => s.id);
    expect(ids.length).toBe(100);
    expect(new Set(ids).size).toBe(100);
    expect(ids.filter(id => id.startsWith('convm-')).length).toBe(17);
    expect(ids.filter(id => id.startsWith('char-')).sort()).toEqual(['char-4EE5', 'char-6B21']);
    expect(ids.filter(id => id.startsWith('topic-')).length).toBe(81);
    // Core v3.6 (three-line patterns): topic lessons 3.4.0; character lessons still declare 3.2.0.
    expect(lessonSummaries.filter(s => s.id.startsWith('topic-')).every(s => s.schemaVersion === 'mandarin-topic-lesson/3.4.0')).toBe(true);
    expect(lessonSummaries.filter(s => s.id.startsWith('char-')).every(s => s.schemaVersion === 'mandarin-character-lesson/3.2.0')).toBe(true);
  });
});

describe('topic registry v3.2', () => {
  it('offers the 22 active top-level topics, never subtopics, for lesson grouping', () => {
    expect(lessonCategories.length).toBe(22);
    expect(lessonCategories.map(c => c.id)).toEqual(expect.arrayContaining(['science-technology', 'society-government-law']));
    expect(lessonCategories.some(c => c.id === 'animals-wildlife' || c.id === 'digital-technology')).toBe(false);
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

describe('recorded quiz answers', () => {
  const question: LessonQuestion = {
    id: 'q-choice', kind: 'selection', prompt: 'Next time?', explanation: '',
    choices: [{ id: 'previous', hanzi: '上次', pinyin: 'shàng cì' }, { id: 'next', hanzi: '下次', pinyin: 'xià cì' }],
    correct_choice_ids: ['next'],
  };

  it('resolves answers by ID even when choices are reordered', () => {
    expect(correctLessonChoices(question).map(c => c.hanzi)).toEqual(['下次']);
    expect(correctLessonChoices({ ...question, choices: [...question.choices].reverse() }).map(c => c.hanzi)).toEqual(['下次']);
  });

  it('fails closed on missing references, duplicate choice IDs or invalid answer counts', () => {
    expect(correctLessonChoices({ ...question, correct_choice_ids: ['missing'] })).toEqual([]);
    expect(correctLessonChoices({ ...question, choices: [question.choices[1]!, question.choices[1]!] })).toEqual([]);
    expect(correctLessonChoices({ ...question, correct_choice_ids: ['next', 'next'] })).toEqual([]);
    expect(correctLessonChoices({ ...question, correct_choice_ids: ['previous', 'next'] })).toEqual([]);
  });

  it('supports recorded text options and multiple correct answers', () => {
    const choices = [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }, { id: 'c', text: 'Third' }];
    expect(correctLessonChoices({ ...question, kind: 'multi_selection', choices, correct_choice_ids: ['a', 'c'] }).map(c => c.text)).toEqual(['First', 'Third']);
  });

  it('does not infer choice identity from legacy answer text', () => {
    const { correct_choice_ids, ...legacy } = question;
    expect(correctLessonChoices({ ...legacy, answer: '下次' })).toEqual([]);
  });

  it('every supplied selection question references an existing unique choice', async () => {
    for (const summary of lessonSummaries) {
      const lesson = (await loadLesson(summary.id))!;
      for (const q of lesson.sections.practice?.questions ?? []) {
        if (q.kind === 'selection' || q.kind === 'multi_selection') {
          expect(correctLessonChoices(q).map(c => c.id).sort()).toEqual([...q.correct_choice_ids!].sort());
          expect(correctLessonChoices(q).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every recorded catalog_character_refs entry names a real exact record', () => {
    for (const summary of lessonSummaries) {
      const refs = lessonCharacterRefs[summary.id];
      expect(refs, `lesson ${summary.id} records character refs`).toBeDefined();
      for (const [glyph, id] of Object.entries(refs!)) {
        expect(Array.from(glyph)).toHaveLength(1);
        expect(id.endsWith(`:${glyph}`)).toBe(true);
        expect(lessonGlyphHintById(id, false), `${id} resolves`).not.toBeNull();
      }
    }
  });
});

// Every lesson file must carry each key lessons.ts imports by name: in the browser a named
// import of a missing JSON key fails the whole app, not just the lesson.
describe('lesson files', () => {
  const root = 'src/data/study_lessons/lessons';
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const path = join(dir, d.name);
    if (d.isDirectory()) return d.name === 'legacy' || d.name === 'curricula' ? [] : files(path);
    return d.name.endsWith('.json') && /_LESSON_/.test(dir) ? [path] : [];
  });
  const all = files(root);
  it('every lesson file has the eagerly read keys', () => {
    expect(all.length).toBe(100);
    for (const f of all) {
      const json = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
      for (const key of ['lesson_id', 'schema_version', 'lesson_type', 'lesson', 'classification', 'learning_objectives', 'metadata', 'catalog_character_refs']) expect(key in json, `${f} ${key}`).toBe(true);
      const headwordKind = /[\\/](CHARACTER|WORD|PHRASE)_LESSON_/.test(f);
      expect('headword' in json, `${f} headword`).toBe(headwordKind);
    }
  });
});

// v3.1 topic lessons teach through sections.teaching_plan; every one must parse into the
// path the page renders, and its review words must all be words this lesson carries.
describe('v3.1 teaching plans', () => {
  const root = 'src/data/study_lessons/lessons/hsk3/level1';
  const plans = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(({ name: dir }) => {
    const json = JSON.parse(readFileSync(join(root, dir, `${dir}.json`), 'utf8')) as { lesson_id: string; sections: Record<string, unknown> };
    return { id: json.lesson_id, topic: toTopicContent(json.sections) };
  });
  it('all 21 topic lessons carry a complete plan', () => {
    expect(plans.length).toBe(21);
    for (const { id, topic } of plans) {
      const p = topic.plan;
      expect(p, id).not.toBeNull();
      expect(p!.dialogue.turns.length, id).toBeGreaterThanOrEqual(4);
      expect(p!.patterns.length, id).toBeGreaterThanOrEqual(2);
      expect(p!.guided_building.substitutions.length, id).toBeGreaterThanOrEqual(2);
      expect(p!.reading.questions.length, id).toBeGreaterThanOrEqual(2);
      expect(p!.speaking_tasks.length, id).toBeGreaterThanOrEqual(2);
      const entries = new Set(topic.items.flatMap(item => item.syllabus_refs.map(r => r.entry_id)));
      expect(p!.review.entry_ids.every(n => entries.has(n)), id).toBe(true);
    }
  });
  it('a lesson without a teaching plan keeps the word-list layout', () => {
    expect(toTopicContent({ vocabulary: { items: [] } }).plan).toBeNull();
  });
});

// Conversational Mandarin: general dialogue lessons rendered from their recorded blocks.
describe('conversational lessons', () => {
  const root = 'src/data/study_lessons/lessons/conversational';
  const docs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => JSON.parse(readFileSync(join(root, d.name, `${d.name}.json`), 'utf8')) as { schema_version: string; lesson_type: string; sections: { blocks: { kind: string }[] } });
  it('are 17 general dialogue lessons whose blocks are all kinds the page renders', () => {
    expect(docs.length).toBe(17);
    for (const d of docs) {
      // Core v3.6 general lessons (schema 3.4.0: pattern pseudo-translation); 3.2.0/3.3.0 stay supported.
      expect(['mandarin-general-lesson/3.2.0', 'mandarin-general-lesson/3.3.0', 'mandarin-general-lesson/3.4.0']).toContain(d.schema_version);
      expect(d.lesson_type).toBe('dialogue');
      expect(d.sections.blocks.every(b => ['explanation', 'dialogue', 'grammar_pattern', 'review_set'].includes(b.kind))).toBe(true);
    }
  });
});
