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
  it('leaves PageUp/PageDown to the browser for scrolling', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={50} onPageChange={onPageChange} />);
    press('PageDown');
    press('PageUp');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('never goes past the last page', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={3} onPageChange={onPageChange} />);
    press('ArrowRight');
    press('ArrowRight');
    press('ArrowRight');
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it('does nothing when focus is inside a text field', () => {
    const onPageChange = vi.fn();
    const { getByTestId } = render(<Harness pages={5} onPageChange={onPageChange} />);
    press('ArrowRight', getByTestId('field'));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('stays idle on a single page', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={1} onPageChange={onPageChange} />);
    press('ArrowRight');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('ignores paging keys while a record sheet is open', () => {
    const onPageChange = vi.fn();
    render(<Harness pages={5} disabled onPageChange={onPageChange} />);
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
