// Guards the out-of-the-box state of the "Sound chart links on cards" switch:
// a fresh browser (and Settings -> Reset preferences, which writes this object)
// must show the sound-wave link beside every glyph card's speaker. Only an
// explicit stored `false` hides it, so the default can never drift to hidden.
import { describe, expect, it } from 'vitest';
import { defaultPreferences, practiceProgressPicture, PRACTICE_PROGRESS_PICTURE_MIN, PRACTICE_PROGRESS_PICTURE_MAX } from './learning-preferences';

describe('sound chart links default', () => {
  it('shows the links on cards for new visitors', () => {
    expect(defaultPreferences.soundChartLinks).toBe(true);
  });
});

// The progress tiles' preview box is dragged from the grip under the row. An unsaved
// preference must stay absent so Compact, Comfortable and phones each keep their own
// smaller default, and a saved drag must never escape the usable range.
describe('practice progress preview size', () => {
  it('keeps each display size default when nothing was dragged', () => {
    expect(practiceProgressPicture(undefined)).toBeNull();
    expect(practiceProgressPicture('70')).toBeNull();
    expect(practiceProgressPicture(Number.NaN)).toBeNull();
  });
  it('clamps a dragged size to the usable range', () => {
    expect(practiceProgressPicture(12)).toBe(PRACTICE_PROGRESS_PICTURE_MIN);
    expect(practiceProgressPicture(900)).toBe(PRACTICE_PROGRESS_PICTURE_MAX);
    expect(practiceProgressPicture(84)).toBe(84);
    expect(practiceProgressPicture(84.6)).toBe(85);
  });
});
