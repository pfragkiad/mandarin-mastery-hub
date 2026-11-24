import { afterEach, describe, expect, it, vi } from 'vitest';
import { continueLesson, hasLessonProgress, lessonState, markLessonCompleted, markLessonOpened, markQuestionAnswered, readProgress } from './lesson-progress';

describe('lessonState', () => {
  it('is not started when never opened', () => expect(lessonState(undefined).state).toBe('not-started'));
  it('is in progress with some answers', () => expect(lessonState({ total: 4, answered: ['a'], at: 1 })).toEqual({ state: 'in-progress', fraction: 0.25 }));
  it('is done when every question is answered', () => expect(lessonState({ total: 2, answered: ['a', 'b'], at: 1 }).state).toBe('done'));
  it('continues the latest unfinished lesson', () => expect(continueLesson({ A: { total: 2, answered: [], at: 1 }, B: { total: 2, answered: ['x'], at: 5 }, C: { total: 1, answered: ['x'], at: 9 } })).toBe('B'));
  it('is done when marked complete by hand, even with tasks left', () => expect(lessonState({ total: 5, answered: ['a'], at: 1, completed: true })).toEqual({ state: 'done', fraction: 1 }));
  it('has nothing to reset right after opening', () => expect(hasLessonProgress({ total: 3, answered: [], at: 1 })).toBe(false));
  it('has progress to reset once marked complete', () => expect(hasLessonProgress({ total: 3, answered: [], at: 1, completed: true })).toBe(true));
});

// Saving: the editor preview runs the app in an embedded frame where cookies are refused, so
// progress must survive through localStorage and, if that is blocked, this tab's memory.
describe('saving progress', () => {
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
  it('stores an opened reveal in localStorage', () => {
    markLessonOpened('save-a', 10);
    markQuestionAnswered('save-a', 'build-1');
    expect(JSON.parse(localStorage.getItem('lesson_progress_v1')!)['save-a'].answered).toEqual(['build-1']);
  });
  it('keeps a quiz answer in memory when storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    markLessonOpened('save-b', 4);
    markQuestionAnswered('save-b', 'q1');
    expect(lessonState(readProgress()['save-b']).fraction).toBe(0.25);
  });
  it('Complete lesson fills the bar', () => {
    markLessonOpened('save-c', 8);
    markLessonCompleted('save-c');
    expect(lessonState(readProgress()['save-c'])).toEqual({ state: 'done', fraction: 1 });
  });
});
