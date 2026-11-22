import { useEffect, useState } from 'react';
import { courses, positionsOf, projectIndependentLessons, sectionPlacements } from '@/lib/lesson-curricula';
import { lessonSummaries, loadAllLessonsForSearch, type LessonSummary } from '@/lib/lessons';
import { lessonSearchEntry, searchLessons, type LessonSearchEntry } from '@/lib/lesson-search';
import { LessonCard } from './lessons-index';

/** Search scope sentinel for lessons no course places. */
export const INDEPENDENT_SCOPE = 'independent';

/** Scope choices for the Lessons search dropdown: every course, then Independent lessons. */
export const lessonScopes = [
  ...courses.map(c => ({ id: c.id, label: c.title })),
  ...(projectIndependentLessons.length ? [{ id: INDEPENDENT_SCOPE, label: 'Independent lessons' }] : []),
];
export const lessonScopeLabel = (scope: string | undefined) => lessonScopes.find(s => s.id === scope)?.label;

/** Lessons in a scope, in reading order: a course's placements as recorded; all lessons as
 *  every course in order, then Independent lessons, each lesson once. */
function scopeLessons(scope: string | undefined): LessonSummary[] {
  if (scope === INDEPENDENT_SCOPE) return projectIndependentLessons;
  const chosen = scope ? courses.filter(c => c.id === scope) : courses;
  const ordered = chosen.flatMap(c => c.sections.flatMap(s => sectionPlacements(s).map(p => p.lesson)));
  const all = scope ? ordered : [...ordered, ...projectIndependentLessons, ...lessonSummaries];
  return [...new Map(all.map(l => [l.id, l])).values()];
}

/** Built search entries, kept for the page's lifetime once every lesson has loaded. */
let entriesCache: Map<string, LessonSearchEntry> | null = null;

/**
 * Lesson search results (Lessons page, while a search is applied).
 *
 * Inputs: the applied `query` and `scope` (a course ID, "independent", or undefined for all).
 * State: the loaded search entries — the first search lazily loads every lesson's JSON once
 * (lessons.ts loadAllLessonsForSearch); until then a "Searching" note shows.
 * Each hit is the usual lesson card, numbered by its place in the chosen course, with the
 * passage that matched and where the lesson sits in each course that places it.
 */
export function LessonSearchResults({ query, scope }: { query: string; scope: string | undefined }) {
  const [entries, setEntries] = useState(entriesCache);
  useEffect(() => {
    if (entries) return;
    let alive = true;
    void loadAllLessonsForSearch().then(list => {
      entriesCache = new Map(list.map(({ summary, raw }) => [summary.id, lessonSearchEntry(summary, raw)]));
      if (alive) setEntries(entriesCache);
    });
    return () => { alive = false; };
  }, [entries]);
  const where = lessonScopeLabel(scope) ?? 'all lessons';
  if (!entries) return <div className="record-gap"><p>Searching {where}…</p></div>;
  const pool = scopeLessons(scope).flatMap(l => { const e = entries.get(l.id); return e ? [e] : []; });
  const hits = searchLessons(pool, query);
  const course = courses.find(c => c.id === scope);
  return <section className="lessons-group lesson-search-results" aria-labelledby="lesson-search-title">
    <h2 id="lesson-search-title">{hits.length} {hits.length === 1 ? 'lesson matches' : 'lessons match'} “{query.trim()}”<span className="lessons-level-count">in {where}</span></h2>
    {hits.length === 0 ? <div className="record-gap"><p>No lesson in {where} mentions this. Try fewer letters, or search all lessons.</p></div>
      : <div className="lessons-grid">{hits.map(({ lesson, snippet }) => {
        const positions = positionsOf(lesson.id);
        const here = course ? positions.find(p => p.course.id === course.id) : undefined;
        const places = positions.map(p => `${p.course.title} · ${p.section.title} · Lesson ${p.index}`);
        return <LessonCard key={lesson.id} lesson={lesson} {...(here ? { number: here.index } : {})}
          extra={<>
            <span className="lesson-search-snippet">{snippet.before}<mark>{snippet.match}</mark>{snippet.after}</span>
            {!course && places.length > 0 && <small>{places.join(' / ')}</small>}
          </>}/>;
      })}</div>}
  </section>;
}
