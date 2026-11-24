/**
 * Remembered open/collapsed state of the Lessons page drawers (one per course, one per level
 * inside a multi-level course, plus "Independent lessons"), kept in localStorage as { [drawerId]: open }. Shared so a lesson
 * page can open its course's drawer before sending the learner back to the course view
 * (Complete lesson), and the Lessons page then shows that course unfolded.
 */
export const LESSON_FOLD_KEY = 'lessons-fold-v1';

/** Drawer id of one level (course section) inside a course, e.g. "hsk3-2025/hsk3-l2". */
export const levelFoldId = (courseId: string, sectionId: string) => `${courseId}/${sectionId}`;

export function readLessonFolds(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(LESSON_FOLD_KEY);
    return saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
  } catch { return {}; }
}

export function setLessonFold(id: string, open: boolean) {
  try {
    const all = readLessonFolds();
    all[id] = open;
    localStorage.setItem(LESSON_FOLD_KEY, JSON.stringify(all));
  } catch { /* storage unavailable: the drawer keeps its default */ }
}
