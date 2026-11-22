import { describe, expect, it } from 'vitest';
import { buildCourse, courses, independentLessons, lessonPositions, projectIndependentLessons, sectionPlacements, unresolvedPlacements, wordLessonPlacements } from './lesson-curricula';
import { loadLesson, lessonSummaries, syllabusEntryFor, type LessonSummary } from './lessons';
import { words } from './mandarin';

// Course rules: order and prerequisites come only from the curriculum manifest, lessons are
// referenced (never copied), unknown lesson IDs fail closed, and lessons outside every course
// are the independent ones. Topic-lesson words resolve to Vocabulary only by HSK entry + headword.
const summary = (id: string) => ({ id, title: id }) as LessonSummary;

describe('HSK 3.0 Level 1 course', () => {
  it('places all 21 topic lessons in manifest order and resolves every placement', () => {
    expect(unresolvedPlacements).toEqual([]);
    const hsk = courses.find(c => c.id === 'hsk3-2025')!;
    const flat = sectionPlacements(hsk.sections[0]!);
    expect(flat).toHaveLength(21);
    expect(flat[0]!.lesson.id).toBe('topic-personal-pronouns');
    for (const unit of hsk.sections[0]!.units) expect(unit.placements.map(p => p.sequence)).toEqual([...unit.placements.map(p => p.sequence)].sort((a, b) => a - b));
    expect(hsk.sections[0]!.units.map(u => u.sequence)).toEqual([...hsk.sections[0]!.units.map(u => u.sequence)].sort((a, b) => a - b));
  });
  it('keeps 次 and 以 as independent lessons', () => {
    expect(projectIndependentLessons.map(s => s.id).sort()).toEqual(['char-4EE5', 'char-6B21']);
  });
  it('gives a lesson its number, previous and next inside its level', () => {
    const flat = sectionPlacements(courses.find(c => c.id === 'hsk3-2025')!.sections[0]!);
    const [p] = lessonPositions(courses, flat[1]!.lesson.id);
    expect(p?.index).toBe(2);
    expect(p?.total).toBe(21);
    expect(p?.previous?.id).toBe('topic-personal-pronouns');
    expect(p?.next?.id).toBe(flat[2]!.lesson.id);
    expect(lessonPositions(courses, 'topic-personal-pronouns')[0]?.previous).toBeNull();
  });
});

describe('course building', () => {
  const raw = { schema_version: 'mandarin-curriculum/3.0.0', curriculum_id: 'demo', sections: [{ section_id: 's', sequence: 1, units: [{ unit_id: 'u', sequence: 1, placements: [
    { placement_id: 'p2', lesson_id: 'b', sequence: 20, prerequisite_lesson_ids: ['a'] },
    { placement_id: 'p1', lesson_id: 'a', sequence: 10 },
    { placement_id: 'p3', lesson_id: 'missing', sequence: 30 },
  ] }] }] };
  const known = new Map([['a', summary('a')], ['b', summary('b')], ['c', summary('c')]]);
  it('sorts by recorded sequence and drops unknown lesson IDs', () => {
    const unresolved: string[] = [];
    const course = buildCourse(raw, id => known.get(id), unresolved)!;
    expect(sectionPlacements(course.sections[0]!).map(p => p.lesson.id)).toEqual(['a', 'b']);
    expect(sectionPlacements(course.sections[0]!)[1]!.prerequisites.map(p => p.id)).toEqual(['a']);
    expect(unresolved).toEqual(['demo:p3→missing']);
  });
  it('a lesson no course places is independent', () => {
    const course = buildCourse(raw, id => known.get(id))!;
    expect(independentLessons([course], [...known.values()]).map(s => s.id)).toEqual(['c']);
  });
});

describe('topic-lesson words and Vocabulary records', () => {
  const entries = words.flatMap(w => w.entry ? [{ ...w.entry, word: w }] : []);
  it('every HSK Level 1 topic-lesson word matches exactly one Vocabulary record', async () => {
    const topics = lessonSummaries.filter(s => s.kind === 'topic');
    let checked = 0;
    for (const s of topics) for (const item of (await loadLesson(s.id))!.topic!.items) {
      const hit = syllabusEntryFor(item, entries);
      expect(hit?.simplified, `${s.id} ${item.hanzi}`).toBe(item.hanzi);
      checked++;
    }
    expect(checked).toBe(300);
  });
  it('点 #33 and 点 #336 stay separate records', () => {
    const a = syllabusEntryFor({ hanzi: '点', syllabus_refs: [{ curriculum_id: 'hsk3-2025', entry_id: 33 }] }, entries);
    const b = syllabusEntryFor({ hanzi: '点', syllabus_refs: [{ curriculum_id: 'hsk3-2025', entry_id: 336 }] }, entries);
    expect(a?.hsk_index).toBe(33);
    expect(b?.hsk_index).toBe(336);
    expect(a?.id).not.toBe(b?.id);
  });
  it('a number whose headword differs, or an unknown course, matches nothing', () => {
    expect(syllabusEntryFor({ hanzi: '点', syllabus_refs: [{ curriculum_id: 'hsk3-2025', entry_id: 1 }] }, entries)).toBeNull();
    expect(syllabusEntryFor({ hanzi: '点', syllabus_refs: [{ curriculum_id: 'pimsleur', entry_id: 33 }] }, entries)).toBeNull();
  });
});

describe('course lessons on word cards', () => {
  const word = (hsk_index: number | null, over: Partial<{ entryKind: string; hskVersion: string | null }> = {}) => ({ entryKind: 'word', hskVersion: '3.0', hsk_index, ...over });
  it('the manifest names exactly the HSK entries each lesson teaches', async () => {
    for (const p of sectionPlacements(courses.find(c => c.id === 'hsk3-2025')!.sections[0]!)) {
      const items = (await loadLesson(p.lesson.id))!.topic!.items;
      expect([...p.introducedEntryIds, ...p.reviewedEntryIds].sort((a, b) => a - b), p.lesson.id).toEqual(items.flatMap(i => i.syllabus_refs.map(r => r.entry_id)).sort((a, b) => a - b));
    }
  });
  it('会 (HSK 3.0 #82) is taught by "What I Can and Want to Do", lesson 17 of 21', () => {
    const [p, ...rest] = wordLessonPlacements(courses, word(82));
    expect(rest).toEqual([]);
    expect(p?.placement.lesson.id).toBe('topic-abilities-interests');
    expect(p?.index).toBe(17);
    expect(p?.introduced).toBe(true);
  });
  it('every Level 1 word has exactly one lesson; other levels have none yet', () => {
    const level1 = words.filter(w => w.entry?.entryKind === 'word' && w.entry.hskLevel === 1);
    expect(level1.length).toBe(300);
    for (const w of level1) expect(wordLessonPlacements(courses, w.entry!), w.hanzi).toHaveLength(1);
    const level2 = words.find(w => w.entry?.entryKind === 'word' && w.entry.hskLevel === 2)!;
    expect(wordLessonPlacements(courses, level2.entry!)).toEqual([]);
  });
  it('example phrases with their parent word\'s number, other editions and unnumbered words get no lessons', () => {
    expect(wordLessonPlacements(courses, word(82, { entryKind: 'phrase' }))).toEqual([]);
    expect(wordLessonPlacements(courses, word(82, { hskVersion: '2.0' }))).toEqual([]);
    expect(wordLessonPlacements(courses, word(null))).toEqual([]);
  });
});
