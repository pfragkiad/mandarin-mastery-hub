import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { useKeyboardPaging } from './keyboard-paging';

function press(key: string, target?: HTMLElement) {
  if (target) target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  else window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

/** Harness mounts the hook on window so KeyboardEvents can be dispatched from any target. */
function Harness({ pages, onPageChange }: { pages: number; onPageChange: (page: number) => void }) {
  const [page, setPage] = useState(2);
  useKeyboardPaging({ current: page, pages, onPageChange });
  useEffect(() => { onPageChange(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input data-testid="field" aria-label="search" />;
}

describe('useKeyboardPaging', () => {
  it('moves to the next page on PageDown', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={5} onPageChange={onPageChange} />);
    press('PageDown');
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it('moves back on PageUp and clamps at the first page', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={5} onPageChange={onPageChange} />);
    press('PageUp');
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    press('PageUp');
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('never goes past the last page', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={3} onPageChange={onPageChange} />);
    press('PageDown');
    press('PageDown');
    press('PageDown');
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it('does nothing when focus is inside a text field', () => {
    const onPageChange = vi.fn();
    const { getByTestId } = render(<Harness pages={5} onPageChange={onPageChange} />);
    press('PageDown', getByTestId('field'));
    expect(onPageChange).toHaveBeenCalledTimes(1); // only the mount report, no key-driven change
  });

  it('stays idle on a single page', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={1} onPageChange={onPageChange} />);
    press('PageDown');
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
