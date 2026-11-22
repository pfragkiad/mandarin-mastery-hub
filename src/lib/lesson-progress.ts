/**
 * Lesson progress kept in one browser cookie (there is no account storage yet).
 * Per lesson we keep: question count seen on the page, the answered question keys, and
 * the last visit time. State is derived, never guessed:
 *   - not started: never opened
 *   - in progress: opened, not every question answered
 *   - done: every recorded question answered (or opened, when it has no questions)
 * Readers subscribe through useLessonProgress, which reads after mount so the server and
 * first client render agree, and re-reads on the 'lesson-progress' window event.
 */
import { useEffect, useState } from 'react';

export type LessonProgressEntry = { total: number; answered: string[]; at: number };
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
  map[id] = { total, answered: prev?.answered ?? [], at: Date.now() };
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

/** Pure: the state and 0–1 fraction one entry stands for. */
export function lessonState(entry: LessonProgressEntry | undefined): { state: LessonState; fraction: number } {
  if (!entry) return { state: 'not-started', fraction: 0 };
  if (entry.total === 0) return { state: 'done', fraction: 1 };
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
