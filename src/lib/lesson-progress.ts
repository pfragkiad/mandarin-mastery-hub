/**
 * Lesson progress kept in one browser cookie (there is no account storage yet).
 * Per lesson we keep: the count of progress tasks seen on the page (graded questions and
 * "Show answer" reveals), the completed task keys, the last visit time, and whether the
 * learner marked the lesson complete by hand. State is derived, never guessed:
 *   - not started: never opened (or its progress was reset from the course)
 *   - in progress: opened, not every task done and not marked complete
 *   - done: every task done, marked complete, or opened when it has no tasks
 * Readers subscribe through useLessonProgress, which reads after mount so the server and
 * first client render agree, and re-reads on the 'lesson-progress' window event.
 */
import { useEffect, useState } from 'react';

export type LessonProgressEntry = { total: number; answered: string[]; at: number; completed?: boolean };
export type LessonProgressMap = Record<string, LessonProgressEntry>;
export type LessonState = 'not-started' | 'in-progress' | 'done';

const COOKIE = 'lesson_progress_v1';
const EVENT = 'lesson-progress';

export function readProgress(): LessonProgressMap {
  if (typeof document === 'undefined') return {};
  const raw = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE}=`));
  if (!raw) return {};
  try { return JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) as LessonProgressMap; } catch { return {}; }
}

function write(map: LessonProgressMap) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(map))}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  window.dispatchEvent(new Event(EVENT));
}

/** Record a visit and the page's current question count. */
export function markLessonOpened(id: string, total: number) {
  const map = readProgress();
  const prev = map[id];
  map[id] = { ...prev, total, answered: prev?.answered ?? [], at: Date.now() };
  write(map);
}

/** Record one answered question (by its stable key on the page). */
export function markQuestionAnswered(id: string, key: string) {
  const map = readProgress();
  const prev = map[id] ?? { total: 0, answered: [], at: Date.now() };
  if (prev.answered.includes(key)) return;
  map[id] = { ...prev, answered: [...prev.answered, key], at: Date.now() };
  write(map);
}

/** The learner's "Complete lesson" button: done regardless of how many tasks were opened. */
export function markLessonCompleted(id: string) {
  const map = readProgress();
  const prev = map[id] ?? { total: 0, answered: [], at: Date.now() };
  map[id] = { ...prev, completed: true, at: Date.now() };
  write(map);
}

/** Start one lesson over from its page: keeps the visit (so it reads "in progress" at 0%),
 *  clears every completed task and the manual completion. */
export function resetLesson(id: string) {
  const map = readProgress();
  const prev = map[id];
  if (!prev) return;
  map[id] = { total: prev.total, answered: [], at: Date.now() };
  write(map);
}

/** Clear a whole course: its lessons return to "not started". Only the given lessons change,
 *  so a lesson shared with another course loses its progress there too (it is one lesson). */
export function resetCourseProgress(ids: readonly string[]) {
  const map = readProgress();
  let changed = false;
  for (const id of ids) if (map[id]) { delete map[id]; changed = true; }
  if (changed) write(map);
}

/** Whether an entry holds anything a reset would clear. */
export function hasLessonProgress(entry: LessonProgressEntry | undefined): boolean {
  return Boolean(entry && (entry.answered.length > 0 || entry.completed));
}

/** Pure: the state and 0–1 fraction one entry stands for. */
export function lessonState(entry: LessonProgressEntry | undefined): { state: LessonState; fraction: number } {
  if (!entry) return { state: 'not-started', fraction: 0 };
  if (entry.completed || entry.total === 0) return { state: 'done', fraction: 1 };
  const fraction = Math.min(1, entry.answered.length / entry.total);
  return { state: fraction >= 1 ? 'done' : 'in-progress', fraction };
}

/** Most recently visited lesson that is not done yet, if any. */
export function continueLesson(map: LessonProgressMap): string | null {
  const open = Object.entries(map).filter(([, e]) => lessonState(e).state === 'in-progress').sort((a, b) => b[1].at - a[1].at);
  return open[0]?.[0] ?? null;
}

export function useLessonProgress(): LessonProgressMap {
  const [map, setMap] = useState<LessonProgressMap>({});
  useEffect(() => {
    const read = () => setMap(readProgress());
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return map;
}
