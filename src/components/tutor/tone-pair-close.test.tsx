import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetailSheet } from './detail-sheet';
import { detailTrail, recordVisit } from '@/lib/detail-trail';

// Tone pairs uses the existing detail window: exact grid/detail origins survive
// subsequent word selections, while a card opened on its own page closes locally.
afterEach(() => { cleanup(); detailTrail.clear(); vi.restoreAllMocks(); });
function visit(index: number, path: string) {
  window.history.pushState({ __TSR_index: index, __TSR_key: `tone-close-${index}` }, '', path);
  recordVisit();
}
describe('Tone-pair shared Close destinations', () => {
  it('returns to the Vocabulary grid after changing the selected example', () => {
    visit(200, '/vocabulary?level=1&page=2');
    visit(201, '/pinyin/tone-pairs?pair=4-5&example=first');
    const localClose = vi.fn();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    const view = render(<DetailSheet open title="爸爸" onClose={localClose}><p>First example</p></DetailSheet>);
    visit(202, '/pinyin/tone-pairs?pair=4-5&example=second');
    view.rerender(<DetailSheet open title="弟弟" onClose={localClose}><p>Second example</p></DetailSheet>);
    fireEvent.click(screen.getByRole('button', { name: /^Close and return/ }));
    expect(go).toHaveBeenCalledWith(-2);
    expect(localClose).not.toHaveBeenCalled();
  });
  it('returns to the exact originating word detail card', () => {
    visit(210, '/vocabulary?word=recorded-word-id&level=1&page=2');
    detailTrail.replace({ label: '爸爸', href: window.location.href });
    visit(211, '/pinyin/tone-pairs?pair=4-5&example=first');
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    const localClose = vi.fn();
    render(<DetailSheet open title="爸爸" onClose={localClose}><p>Example</p></DetailSheet>);
    fireEvent.click(screen.getByRole('button', { name: 'Close and return to 爸爸' }));
    expect(go).toHaveBeenCalledWith(-1);
    expect(localClose).not.toHaveBeenCalled();
  });
  it('closes locally when opened from the tone-pair matrix', () => {
    visit(220, '/pinyin/tone-pairs');
    visit(221, '/pinyin/tone-pairs?pair=4-5');
    const localClose = vi.fn();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    render(<DetailSheet open title="爸爸" onClose={localClose}><p>Example</p></DetailSheet>);
    fireEvent.click(screen.getByRole('button', { name: 'Close and show card in list' }));
    expect(localClose).toHaveBeenCalledOnce();
    expect(go).not.toHaveBeenCalled();
  });
});