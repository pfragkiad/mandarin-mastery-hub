/**
 * Lesson decks for Flashcards (browser-safe, no React).
 *
 * A flashcard deck can be narrowed to one study lesson. Cards join a lesson deck only
 * through what the lesson data records, never through spelling or shape:
 * - Characters: the lesson's recorded catalog_character_refs ("Characters:我"), which list
 *   every character the lesson uses. The IDs must equal the deck card IDs exactly.
 * - Words: the course placement's introduced/reviewed syllabus entry IDs, matched to word
 *   records of that course's own syllabus edition by HSK entry number (the same rule as
 *   lessonsForWord on word cards).
 * Components, Radicals and Phrases have no recorded lesson lists, so no lesson deck.
 *
 * The card back lists the lessons that teach that exact record (word: course placements
 * naming its HSK number; character: lessons about that record), reusing lessons.ts and
 * lesson-curricula.ts so the Flashcards links agree with the detail cards.
 */
import { SYLLABUS_VERSION, characterLessons, lessonCharacterRefs, lessonSummaries, type LessonSummary } from './lessons';
import { courses as projectCourses, lessonsForWord, projectIndependentLessons, sectionPlacements, type Course, type SyllabusWord } from './lesson-curricula';

/**
 * Flashcard kinds a study lesson can supply cards for. Pavlos (2026-11-24) moved the
 * lesson beside Topic as a Course → Lesson pair and kept it for Characters only: Words and
 * Phrases already break down by Topic, level and type, so they show no course dropdown at
 * all, and a stale `lesson` value from another kind never empties its deck.
 */
export type LessonDeckKind = 'Characters' | 'Words';
export const lessonDeckKind = (category: string): LessonDeckKind | undefined =>
  category === 'Ref:Character' ? 'Characters' : undefined;

/** A deck candidate: anything with an ID and (for words) the record's HSK identity. */
export type LessonDeckRecord = { id: string; entry?: SyllabusWord | undefined };

/** The exact card IDs a lesson records for one kind, among `records` (Words) — empty when none are recorded. */
export function lessonDeckIds(lessonId: string, kind: LessonDeckKind, records: readonly LessonDeckRecord[], all: Course[] = projectCourses, refs: Record<string, Record<string, string>> = lessonCharacterRefs): Set<string> {
  if (kind === 'Characters') return new Set(Object.values(refs[lessonId] ?? {}).filter(id => id.startsWith('Characters:')));
  // Each course placement of this lesson names entry numbers in its own syllabus edition.
  const wanted = all.flatMap(course => {
    const version = SYLLABUS_VERSION[course.id];
    if (!version) return [];
    return course.sections.flatMap(sectionPlacements).filter(p => p.lesson.id === lessonId).map(p => ({ version, ids: new Set([...p.introducedEntryIds, ...p.reviewedEntryIds]) }));
  });
  if (!wanted.length) return new Set();
  return new Set(records.flatMap(r => {
    const e = r.entry;
    if (!e || e.entryKind !== 'word' || e.hsk_index == null || !e.hskVersion) return [];
    return wanted.some(w => w.version === e.hskVersion && w.ids.has(e.hsk_index as number)) ? [r.id] : [];
  }));
}

/** Lesson choices in Lessons-page order: each course (its title as the group), then independent lessons. */
export type LessonDeckGroup = { id: string; label: string; lessons: { id: string; title: string }[] };
export function lessonDeckGroups(all: Course[] = projectCourses, independent: LessonSummary[] = projectIndependentLessons): LessonDeckGroup[] {
  const groups = all.map(course => {
    const seen = new Set<string>();
    const lessons = course.sections.flatMap(sectionPlacements).flatMap((p, i) => seen.has(p.lesson.id) ? [] : (seen.add(p.lesson.id), [{ id: p.lesson.id, title: `${i + 1}. ${p.lesson.title}` }]));
    return { id: course.id, label: course.title, lessons };
  });
  return [...groups, ...(independent.length ? [{ id: 'independent', label: 'Independent lessons', lessons: independent.map(l => ({ id: l.id, title: l.title })) }] : [])].filter(g => g.lessons.length);
}

/** Every card one course's lessons record for a kind: the union of its lessons' decks. */
export function lessonCourseIds(courseId: string, kind: LessonDeckKind, records: readonly LessonDeckRecord[], all: Course[] = projectCourses, refs: Record<string, Record<string, string>> = lessonCharacterRefs, independent: LessonSummary[] = projectIndependentLessons): Set<string> {
  const group = lessonDeckGroups(all, independent).find(g => g.id === courseId);
  const ids = new Set<string>();
  for (const l of group?.lessons ?? []) for (const id of lessonDeckIds(l.id, kind, records, all, refs)) ids.add(id);
  return ids;
}

/** Title of a lesson for summaries ("Personal Pronouns"); undefined for an unknown ID. */
export const lessonDeckTitle = (lessonId: string) => lessonSummaries.find(s => s.id === lessonId)?.title;

/** Lessons teaching one exact card: course lessons for a word record, lessons about a Characters record. */
export function cardLessons(card: { id: string; hanzi: string; libraryKind?: string | undefined; entry?: SyllabusWord | undefined }): { id: string; title: string }[] {
  const found = card.libraryKind === 'Characters' ? characterLessons(card.id, card.hanzi).map(l => ({ id: l.id, title: l.title }))
    : !card.libraryKind && card.entry ? lessonsForWord(card.entry).map(p => ({ id: p.placement.lesson.id, title: p.placement.lesson.title }))
    : [];
  return [...new Map(found.map(l => [l.id, l])).values()];
}
