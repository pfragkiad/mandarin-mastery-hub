import { describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { useKeyboardPaging } from './keyboard-paging';

function press(key: string, target?: HTMLElement) {
  if (target) target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  else window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

/** Harness mounts the hook on window so KeyboardEvents can be dispatched from any target. */
function Harness({ pages, disabled = false, onPageChange }: { pages: number; disabled?: boolean; onPageChange: (page: number) => void }) {
  useKeyboardPaging({ current: 2, pages, disabled, onPageChange });
  return <input data-testid="field" aria-label="search" />;
}

afterEach(cleanup);

describe('useKeyboardPaging', () => {
  it('moves ten pages on PageDown', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={50} onPageChange={onPageChange} />);
    press('PageDown');
    expect(onPageChange).toHaveBeenLastCalledWith(12);
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
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('stays idle on a single page', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={1} onPageChange={onPageChange} />);
    press('PageDown');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('ignores PageUp/PageDown while a record sheet is open', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={5} disabled onPageChange={onPageChange} />);
    press('PageDown');
    press('PageUp');
    press('ArrowRight');
    press('Home');
    press('End');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it.each([['ArrowLeft', 1], ['ArrowRight', 3], ['Home', 1], ['End', 50]])('maps %s to page %i', (key, page) => {
    const onPageChange = vi.fn();
    render(<Harness pages={50} onPageChange={onPageChange}/>);
    press(key);
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(page);
  });

  it('moves back exactly ten pages away from the boundary', () => {
    const onPageChange = vi.fn();
    function Middle() { useKeyboardPaging({ current: 25, pages: 50, onPageChange }); return null; }
    render(<Middle/>);
    press('PageUp');
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(15);
  });

  it('leaves modified shortcuts and widget keys untouched', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={50} onPageChange={onPageChange}/>);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true }));
    const tab = document.createElement('div');
    tab.setAttribute('role', 'tab');
    document.body.append(tab);
    press('ArrowRight', tab);
    tab.remove();
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
