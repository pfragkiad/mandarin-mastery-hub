import { beforeEach, describe, expect, it } from 'vitest';
import { LESSON_VIEW_KEY, readLessonView, saveLessonView, setLessonPanel } from './lesson-view-state';

describe('remembered lesson view', () => {
  beforeEach(() => window.sessionStorage.removeItem(LESSON_VIEW_KEY));

  it('keeps the open sections of a lesson after the page is left', () => {
    saveLessonView('topic-greetings', 'sections', ['about', 'key-expressions']);
    expect(readLessonView('topic-greetings')?.sections).toEqual(['about', 'key-expressions']);
  });

  it('remembers each lesson separately', () => {
    saveLessonView('a', 'sections', ['about']);
    expect(readLessonView('b')).toBeNull();
  });

  it('opens and closes a remembered panel without touching the sections', () => {
    saveLessonView('a', 'sections', ['about']);
    setLessonPanel('a', 'reveal:build-1', true);
    setLessonPanel('a', 'word-bank', true);
    setLessonPanel('a', 'reveal:build-1', false);
    expect(readLessonView('a')).toEqual({ sections: ['about'], panels: ['word-bank'] });
  });
});
