import { describe, expect, it } from 'vitest';
import { openDetailsHint, practiceHint, switchFormHint } from './tile-hints';

describe('tile hints state the click action', () => {
  it('names the destination kind, not the meaning', () => {
    expect(openDetailsHint('贝', 'Characters')).toBe("Click to open 贝's character details");
    expect(openDetailsHint('氵', 'Radicals')).toBe("Click to open 氵's radical details");
    expect(openDetailsHint('吃了', 'word')).toBe("Click to open 吃了's word details");
  });
  it('form tiles say switch/practice, and the selected tile says it is current', () => {
    expect(switchFormHint('預', false)).toBe('Click to switch to 預');
    expect(switchFormHint('预', true)).toBe('Showing 预 now');
    expect(practiceHint('預')).toBe('Click to practice writing 預');
  });
});
