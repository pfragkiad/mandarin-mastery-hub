// Guards the out-of-the-box state of the "Sound chart links on cards" switch:
// a fresh browser (and Settings -> Reset preferences, which writes this object)
// must show the sound-wave link beside every glyph card's speaker. Only an
// explicit stored `false` hides it, so the default can never drift to hidden.
import { describe, expect, it } from 'vitest';
import { defaultPreferences } from './learning-preferences';

describe('sound chart links default', () => {
  it('shows the links on cards for new visitors', () => {
    expect(defaultPreferences.soundChartLinks).toBe(true);
  });
});
