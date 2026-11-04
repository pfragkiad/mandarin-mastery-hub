import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetailSheet } from './detail-sheet';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  const onClose = vi.fn();
  render(<DetailSheet open title="Character details" onClose={onClose}><p>Record</p></DetailSheet>);
  return { onClose, close: screen.getByRole('button', { name: 'Close and show card in list' }) };
}

describe('Modal detail sheet', () => {
  it('keeps navigation available while changing records and closes only explicitly', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<><button>Background card</button><DetailSheet open title="First record" position={0} total={2} onClose={onClose} onNext={onNext}><p>First</p></DetailSheet></>);
    expect(screen.getByRole('button', { name: 'Previous card in this list' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next card in this list' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    rerender(<><button>Background card</button><DetailSheet open title="Second record" position={1} total={2} onClose={onClose} onPrevious={onPrevious}><p>Second</p></DetailSheet></>);
    fireEvent.click(screen.getByRole('button', { name: 'Previous card in this list' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Next card in this list' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Background card' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Close details$/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when activated', () => {
    const { close, onClose } = setup();
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to the previous record with ArrowLeft and the next with ArrowRight', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<DetailSheet open title="Record details" onClose={vi.fn()} onPrevious={onPrevious} onNext={onNext}><p>Record</p></DetailSheet>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close and show card in list' }), { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('respects navigation boundaries and does not intercept editing or modified arrow keys', () => {
    const onNext = vi.fn();
    render(<DetailSheet open title="Record details" onClose={vi.fn()} onNext={onNext}><input aria-label="Notes"/></DetailSheet>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight', altKey: true });
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});