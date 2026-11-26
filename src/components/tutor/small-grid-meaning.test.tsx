import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmallGridMeaning } from './small-grid-meaning';

const measurement = vi.hoisted(() => ({ lines: vi.fn<(element: HTMLElement) => number>() }));
vi.mock('./use-side-fit', () => ({ lineCount: measurement.lines }));

describe('Small-grid translation limits', () => {
  it('drops trailing translations when they occupy more than three lines', () => {
    measurement.lines.mockImplementation(element => element.textContent?.includes('last meaning') ? 4 : 3);
    const { container } = render(<SmallGridMeaning text="first meaning; second meaning; last meaning"/>);
    expect(container.textContent).toBe('first meaning; second meaning');
  });

  it('keeps all translations when they occupy exactly three lines', () => {
    measurement.lines.mockReturnValue(3);
    const { container } = render(<SmallGridMeaning text="first meaning; second meaning; last meaning"/>);
    expect(container.textContent).toBe('first meaning; second meaning; last meaning');
  });

  it('keeps a sole translation even when it occupies more than three lines', () => {
    measurement.lines.mockReturnValue(5);
    const { container } = render(<SmallGridMeaning text="one complete translation (with an internal; explanation)"/>);
    expect(container.textContent).toBe('one complete translation (with an internal; explanation)');
  });
});