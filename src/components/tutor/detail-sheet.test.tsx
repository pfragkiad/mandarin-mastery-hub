import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DetailSheet } from './detail-sheet';

beforeEach(() => {
  class TestPointerEvent extends MouseEvent {
    pointerId = 1;
    isPrimary = true;
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  const onClose = vi.fn();
  render(<DetailSheet open title="Character details" onClose={onClose}><p>Record</p></DetailSheet>);
  return { onClose, handle: screen.getByRole('button', { name: 'Close details using handle' }) };
}

describe('Detail sheet handle dismissal', () => {
  it('closes when activated', () => {
    const { handle, onClose } = setup();
    fireEvent.click(handle);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes after a downward drag and does not close twice on the following click', () => {
    const { handle, onClose } = setup();
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
    fireEvent.pointerMove(handle, { clientY: 170 });
    fireEvent.pointerUp(handle, { clientY: 170 });
    fireEvent.click(handle, { detail: 1 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel open after a short drag', () => {
    const { handle, onClose } = setup();
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
    fireEvent.pointerMove(handle, { clientY: 120 });
    fireEvent.pointerUp(handle, { clientY: 120 });
    fireEvent.click(handle, { detail: 1 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the panel open after a cancelled drag', () => {
    const { handle, onClose } = setup();
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
    fireEvent.pointerMove(handle, { clientY: 180 });
    fireEvent.pointerCancel(handle);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').style.transform).toBe('');
  });
});