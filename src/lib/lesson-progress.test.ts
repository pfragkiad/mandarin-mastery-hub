import { describe, expect, it } from 'vitest';
import { continueLesson, lessonState } from './lesson-progress';

describe('lessonState', () => {
  it('is not started when never opened', () => expect(lessonState(undefined).state).toBe('not-started'));
  it('is in progress with some answers', () => expect(lessonState({ total: 4, answered: ['a'], at: 1 })).toEqual({ state: 'in-progress', fraction: 0.25 }));
  it('is done when every question is answered', () => expect(lessonState({ total: 2, answered: ['a', 'b'], at: 1 }).state).toBe('done'));
  it('continues the latest unfinished lesson', () => expect(continueLesson({ A: { total: 2, answered: [], at: 1 }, B: { total: 2, answered: ['x'], at: 5 }, C: { total: 1, answered: ['x'], at: 9 } })).toBe('B'));
});
