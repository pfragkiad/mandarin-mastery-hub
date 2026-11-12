import { describe, expect, it } from 'vitest';
import { characterScore, completionWord, finishedResult, mistakeNote, strokeColor, strokeScore } from './stroke-score';

describe('stroke accuracy', () => {
  it('a stroke with no mistakes scores 100%', () => expect(strokeScore(0)).toBe(100));
  it('each mistake costs 25% and never goes below 0%', () => { expect(strokeScore(1)).toBe(75); expect(strokeScore(5)).toBe(0); });
  it('character score averages stroke scores', () => expect(characterScore([100, 75, 50])).toBe(75));
  it('a finished character with drawn strokes reports its total accuracy', () => expect(finishedResult([100, null, 50], [0, null, 2])).toEqual({ kind: 'score', percent: 75, mistakes: 2 }));
  it('mistakes on strokes that were not hand-drawn are not counted', () => expect(finishedResult([100, null], [1, 3])).toEqual({ kind: 'score', percent: 100, mistakes: 1 }));
  it('the tile reads "(1 mistake)", "(3 mistakes)", or nothing when there were none', () => { expect(mistakeNote(1)).toBe(' (1 mistake)'); expect(mistakeNote(3)).toBe(' (3 mistakes)'); expect(mistakeNote(0)).toBe(''); });
  it('a round that was not wholly hand-drawn completes with "Complete.", never "Perfect!"', () => expect(completionWord(null)).toBe('Complete.'));
  it('a finished character with no drawn strokes reads "shown"', () => expect(finishedResult([null, null])).toEqual({ kind: 'shown' }));
  it('100% completes with "Perfect!", anything lower with "Complete."', () => { expect(completionWord(100)).toBe('Perfect!'); expect(completionWord(99)).toBe('Complete.'); });
  it('neighbouring strokes get different colours', () => expect(strokeColor(0, 'dark')).not.toBe(strokeColor(1, 'dark')));
});
