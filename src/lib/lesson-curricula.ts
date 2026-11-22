/**
 * Course curricula for the study lessons (browser-safe, no React).
 *
 * Source of truth: the curriculum manifests under src/data/study_lessons/lessons/curricula/
 * (schema mandarin-curriculum/3.x, core/curriculum.schema.json). A curriculum is a course
 * (HSK 3.0, later Pimsleur or custom paths) made of sections (levels) → units → placements;
 * each placement only *references* a reusable lesson by lesson_id, so one lesson can sit in
 * several courses without being copied, and a lesson never claims its own course.
 *
 * Course order, prerequisites and syllabus coverage come only from these manifests, sorted
 * by their recorded `sequence` numbers. A placement whose lesson_id matches no lesson is
 * dropped (fail closed) and reported in `unresolved`, never shown as a fabricated card.
 * Lessons that no curriculum places are the independent lessons (次, 以 today).
 *
 * Kept apart from lessons.ts so character cards and the menu import lessons.ts without the
 * manifests; the Lessons pages and the Vocabulary word cards (lessonsForWord: which course
 * lessons teach this exact HSK word) import this module.
 */
import { SYLLABUS_VERSION, lessonSummaries, lessonSummary, type LessonSummary } from './lessons';

export type CoursePlacement = {
  id: string;
  sequence: number;
  role: string;
  lesson: LessonSummary;
  prerequisites: LessonSummary[];
  introducedEntryIds: number[];
  reviewedEntryIds: number[];
};
export type CourseUnit = { id: string; title: string; sequence: number; placements: CoursePlacement[] };
export type CourseSection = { id: string; title: string; sequence: number; level: number | null; description: string; units: CourseUnit[] };
export type Course = { id: string; title: string; kind: string; edition: string; status: string; description: string; sections: CourseSection[] };

type RawPlacement = { placement_id?: string; lesson_id?: string; sequence?: number; role?: string; prerequisite_lesson_ids?: string[]; introduced_syllabus_entry_ids?: number[]; reviewed_syllabus_entry_ids?: number[] };
type RawUnit = { unit_id?: string; title?: string; sequence?: number; placements?: RawPlacement[] };
type RawSection = { section_id?: string; title?: string; sequence?: number; level_number?: number | null; description?: string; units?: RawUnit[] };
export type RawCurriculum = { schema_version?: string; curriculum_id?: string; title?: string; kind?: string; edition?: string; status?: string; description?: string; sections?: RawSection[] };

const bySequence = <T extends { sequence: number }>(a: T, b: T) => a.sequence - b.sequence;
const seq = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER);

/** One manifest → a Course, resolving lesson IDs through `find`; unknown IDs go to `unresolved`. */
export function buildCourse(raw: RawCurriculum, find: (id: string) => LessonSummary | undefined, unresolved: string[] = []): Course | null {
  if (!raw.curriculum_id || !(raw.schema_version ?? '').startsWith('mandarin-curriculum/')) return null;
  const sections = (raw.sections ?? []).map((s): CourseSection => ({
    id: s.section_id ?? '', title: s.title ?? '', sequence: seq(s.sequence), level: typeof s.level_number === 'number' ? s.level_number : null, description: s.description ?? '',
    units: (s.units ?? []).map((u): CourseUnit => ({
      id: u.unit_id ?? '', title: u.title ?? '', sequence: seq(u.sequence),
      placements: (u.placements ?? []).flatMap((p): CoursePlacement[] => {
        const lesson = p.lesson_id ? find(p.lesson_id) : undefined;
        if (!lesson) { unresolved.push(`${raw.curriculum_id}:${p.placement_id ?? '?'}→${p.lesson_id ?? '?'}`); return []; }
        return [{
          id: p.placement_id ?? lesson.id, sequence: seq(p.sequence), role: p.role ?? '', lesson,
          prerequisites: (p.prerequisite_lesson_ids ?? []).flatMap(id => { const s = find(id); return s ? [s] : []; }),
          introducedEntryIds: p.introduced_syllabus_entry_ids ?? [], reviewedEntryIds: p.reviewed_syllabus_entry_ids ?? [],
        }];
      }).sort(bySequence),
    })).filter(u => u.placements.length).sort(bySequence),
  })).filter(s => s.units.length).sort(bySequence);
  return { id: raw.curriculum_id, title: raw.title ?? raw.curriculum_id, kind: raw.kind ?? '', edition: raw.edition ?? '', status: raw.status ?? '', description: raw.description ?? '', sections };
}

/** Every placement of a course section in learning order (units, then placements). */
export const sectionPlacements = (section: CourseSection) => section.units.flatMap(u => u.placements);

/** Lessons that no course places, in stable lesson order. */
export function independentLessons(courses: Course[], summaries: LessonSummary[]): LessonSummary[] {
  const placed = new Set(courses.flatMap(c => c.sections.flatMap(s => sectionPlacements(s).map(p => p.lesson.id))));
  return summaries.filter(s => !placed.has(s.id));
}

export type LessonPosition = { course: Course; section: CourseSection; unit: CourseUnit; placement: CoursePlacement; index: number; total: number; previous: LessonSummary | null; next: LessonSummary | null };
/** Where a lesson sits in each course (one entry per placement); previous/next stay inside its section (level). */
export function lessonPositions(courses: Course[], lessonId: string): LessonPosition[] {
  return courses.flatMap(course => course.sections.flatMap(section => {
    const flat = sectionPlacements(section);
    return flat.flatMap((placement, i) => {
      if (placement.lesson.id !== lessonId) return [];
      const unit = section.units.find(u => u.placements.includes(placement))!;
      return [{ course, section, unit, placement, index: i + 1, total: flat.length, previous: flat[i - 1]?.lesson ?? null, next: flat[i + 1]?.lesson ?? null }];
    });
  }));
}

/** The vocabulary-record identity a course placement can name: an official syllabus word. */
export type SyllabusWord = { entryKind: string; hskVersion: string | null; hsk_index: number | null };
export type WordLessonPlacement = LessonPosition & { introduced: boolean };
/**
 * Course lessons that teach one exact Vocabulary word: placements whose recorded
 * introduced/reviewed syllabus entry IDs contain the word's official HSK entry number, in a
 * course whose syllabus edition is the word's own (SYLLABUS_VERSION). Only `word` records
 * count — example-sentence phrases carry their parent word's number but are not that word —
 * and a word without an HSK number, or from another edition, has no course lessons.
 */
export function wordLessonPlacements(all: Course[], word: SyllabusWord): WordLessonPlacement[] {
  if (word.entryKind !== 'word' || word.hsk_index == null || !word.hskVersion) return [];
  const id = word.hsk_index;
  return all.filter(c => SYLLABUS_VERSION[c.id] === word.hskVersion).flatMap(course => course.sections.flatMap(section => {
    const flat = sectionPlacements(section);
    return flat.flatMap((placement, i): WordLessonPlacement[] => {
      const introduced = placement.introducedEntryIds.includes(id);
      if (!introduced && !placement.reviewedEntryIds.includes(id)) return [];
      const unit = section.units.find(u => u.placements.includes(placement))!;
      return [{ course, section, unit, placement, index: i + 1, total: flat.length, previous: flat[i - 1]?.lesson ?? null, next: flat[i + 1]?.lesson ?? null, introduced }];
    });
  }));
}

/* ---------- Project data ---------- */
const manifests = import.meta.glob<RawCurriculum>('/src/data/study_lessons/lessons/curricula/*.json', { eager: true, import: 'default' });
/** Placements whose lesson_id matched no lesson (should stay empty; checked by tests). */
export const unresolvedPlacements: string[] = [];
export const courses: Course[] = Object.keys(manifests).sort().flatMap(path => {
  const course = buildCourse(manifests[path]!, lessonSummary, unresolvedPlacements);
  return course ? [course] : [];
});
export const projectIndependentLessons = independentLessons(courses, lessonSummaries);
export const positionsOf = (lessonId: string) => lessonPositions(courses, lessonId);
export const lessonsForWord = (word: SyllabusWord) => wordLessonPlacements(courses, word);
