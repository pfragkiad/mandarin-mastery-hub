import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetailSheet } from './detail-sheet';
import { PinyinSoundSheet } from './pinyin-sound-sheet';

afterEach(() => { cleanup(); localStorage.removeItem('tutor-detail-width'); vi.restoreAllMocks(); });

describe.each(['record', 'sound'] as const)('%s detail width', kind => {
  const open = (next = vi.fn()) => render(kind === 'record'
    ? <DetailSheet open title="Record" onClose={vi.fn()} onNext={next}><p>Details</p></DetailSheet>
    : <PinyinSoundSheet open title="ma" position={0} total={2} onBack={vi.fn()} onClose={vi.fn()} onClosed={vi.fn()} onNext={next}><p>Details</p></PinyinSoundSheet>);

  it('restores the shared preferred width and adjusts it without navigating records', () => {
    localStorage.setItem('tutor-detail-width', '800');
    const next = vi.fn();
    open(next);
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}) });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Resize detail window' }), { key: 'ArrowRight' });
    expect(localStorage.getItem('tutor-detail-width')).toBe('832');
    expect(next).not.toHaveBeenCalled();
    cleanup();
    open();
    expect(screen.getByRole('slider', { name: 'Resize detail window' })).toHaveAttribute('aria-valuenow', '832');
  });

  it('resets the shared width on double-click', () => {
    localStorage.setItem('tutor-detail-width', '900');
    open();
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Resize detail window' }));
    expect(localStorage.getItem('tutor-detail-width')).toBeNull();
  });
});