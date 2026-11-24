/**
 * Remembered lesson VIEW state (not progress): which collapsible sections (narrow layout)
 * and which fold-out panels (Show answer, Word bank, recall quiz…) are open, per lesson.
 *
 * Why: following a word link to its Vocabulary/Glyphs card unmounts the lesson page, so
 * React state is lost and Back used to show every section closed (and the restored scroll
 * position then pointed at the wrong place). The state is kept in sessionStorage — one tab,
 * this visit only — as { [lessonId]: { sections: string[]; panels: string[] } }, so a
 * temporary trip outside the lesson returns to the same view, while a new visit starts fresh.
 * Storage failures (private mode, blocked frames) fall back to an in-memory copy.
 */
export const LESSON_VIEW_KEY = 'lesson-view-v1';

export type LessonViewState = { sections: string[]; panels: string[] };
type All = Record<string, LessonViewState>;

let memory: All = {};

function readAll(): All {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(LESSON_VIEW_KEY);
    return raw ? (JSON.parse(raw) as All) : memory;
  } catch { return memory; }
}

function writeAll(all: All) {
  memory = all;
  try { window.sessionStorage.setItem(LESSON_VIEW_KEY, JSON.stringify(all)); } catch { /* memory copy kept */ }
}

/** The saved view of one lesson, or null when this tab has none yet. */
export function readLessonView(lessonId: string): LessonViewState | null {
  return readAll()[lessonId] ?? null;
}

/** Replace one part (sections or panels) of a lesson's saved view. */
export function saveLessonView(lessonId: string, part: keyof LessonViewState, ids: Iterable<string>) {
  const all = readAll();
  const current = all[lessonId] ?? { sections: [], panels: [] };
  all[lessonId] = { ...current, [part]: [...new Set(ids)] };
  writeAll(all);
}

/** Open or close one remembered panel. */
export function setLessonPanel(lessonId: string, panel: string, open: boolean) {
  const panels = new Set(readLessonView(lessonId)?.panels ?? []);
  if (open) panels.add(panel); else panels.delete(panel);
  saveLessonView(lessonId, 'panels', panels);
}
