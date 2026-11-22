/**
 * Lesson progress kept in this browser (there is no account storage yet).
 * Per lesson we keep: the count of progress tasks seen on the page (graded questions and
 * "Show answer" reveals), the completed task keys, the last visit time, and whether the
 * learner marked the lesson complete by hand. State is derived, never guessed:
 *   - not started: never opened (or its progress was reset from the course)
 *   - in progress: opened, not every task done and not marked complete
 *   - done: every task done, marked complete, or opened when it has no tasks
 * Storage: localStorage, not a cookie. Browsers refuse cookies set inside an embedded
 * cross-site frame (the editor preview), which silently dropped every write, and a cookie
 * also caps at ~4 KB. An in-memory copy is always the source of truth for this tab, so the
 * page updates even when storage is blocked; an older lesson_progress_v1 cookie is imported
 * once and then cleared.
 * Readers subscribe through useLessonProgress, which reads after mount so the server and
 * first client render agree, and re-reads on the 'lesson-progress' window event, on
 * back/forward restores and on other tabs' storage writes.
 */
import { useEffect, useState } from 'react';

/** `answered` holds required task keys — checkpoint IDs for Core v3.3 lessons, page task keys
 *  for older ones; `bonus` holds completed optional checkpoints, which never count toward total. */
export type LessonProgressEntry = { total: number; answered: string[]; bonus?: string[]; at: number; completed?: boolean };
export type LessonProgressMap = Record<string, LessonProgressEntry>;
export type LessonState = 'not-started' | 'in-progress' | 'done';

const KEY = 'lesson_progress_v1';
const EVENT = 'lesson-progress';
let memory: LessonProgressMap | null = null;

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/** The legacy cookie's map (published site visitors may have one), or null. */
function legacyCookie(): LessonProgressMap | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.split('; ').find(c => c.startsWith(`${KEY}=`));
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw.slice(KEY.length + 1))) as LessonProgressMap; } catch { return null; }
}

function parse(raw: string | null): LessonProgressMap | null {
  if (!raw) return null;
  try { const v = JSON.parse(raw) as unknown; return v && typeof v === 'object' ? v as LessonProgressMap : null; } catch { return null; }
}

export function readProgress(): LessonProgressMap {
  if (typeof window === 'undefined') return {};
  const store = storage();
  let stored: LessonProgressMap | null = null;
  try { stored = parse(store?.getItem(KEY) ?? null); } catch { /* storage blocked */ }
  if (stored) return (memory = stored);
  if (memory) return memory;
  // First read in this tab with nothing stored: import the old cookie once.
  const legacy = legacyCookie();
  memory = legacy ?? {};
  if (legacy) {
    try { store?.setItem(KEY, JSON.stringify(legacy)); } catch { /* keep in memory */ }
    document.cookie = `${KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
  return memory;
}

function write(map: LessonProgressMap) {
  memory = map;
  try { storage()?.setItem(KEY, JSON.stringify(map)); } catch { /* blocked or full: this tab keeps it in memory */ }
  window.dispatchEvent(new Event(EVENT));
}

/** Record a visit and the page's current required task count. `remap` (checkpoint lessons)
 *  turns previously saved keys into the lesson's current checkpoint IDs, dropping unknown ones. */
export function markLessonOpened(id: string, total: number, remap?: (keys: string[]) => { answered: string[]; bonus: string[] }) {
  const map = readProgress();
  const prev = map[id];
  const keys = [...(prev?.answered ?? []), ...(prev?.bonus ?? [])];
  const next = remap ? remap(keys) : { answered: prev?.answered ?? [], bonus: prev?.bonus ?? [] };
  const entry: LessonProgressEntry = { ...prev, total, answered: next.answered, at: Date.now() };
  if (next.bonus.length) entry.bonus = next.bonus; else delete entry.bonus;
  map[id] = entry;
  write(map);
}

/** Record one completed task (by its stable key); optional checkpoints go to `bonus`. */
export function markQuestionAnswered(id: string, key: string, optional = false) {
  const map = readProgress();
  const prev = map[id] ?? { total: 0, answered: [], at: Date.now() };
  const list = optional ? prev.bonus ?? [] : prev.answered;
  if (list.includes(key)) return;
  map[id] = optional ? { ...prev, bonus: [...list, key], at: Date.now() } : { ...prev, answered: [...list, key], at: Date.now() };
  write(map);
}

/** Untick one manual checkpoint ("Mark as done" pressed again); answered items stay done. */
export function unmarkCheckpoint(id: string, key: string) {
  const map = readProgress();
  const prev = map[id];
  if (!prev) return;
  map[id] = { ...prev, answered: prev.answered.filter(k => k !== key), ...(prev.bonus ? { bonus: prev.bonus.filter(k => k !== key) } : {}), at: Date.now() };
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
  return Boolean(entry && (entry.answered.length > 0 || (entry.bonus?.length ?? 0) > 0 || entry.completed));
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
    // A page restored from the browser's back/forward cache keeps its old state; re-read.
    window.addEventListener('pageshow', read);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) { memory = null; read(); } };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(EVENT, read); window.removeEventListener('pageshow', read); window.removeEventListener('storage', onStorage); };
  }, []);
  return map;
}
