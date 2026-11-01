import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCardPeek } from './card-peek';
import type { CardReveal } from '@/lib/learning-preferences';

describe('useCardPeek', () => {
  it('opens details immediately when nothing is hidden', () => {
    const { result } = renderHook(() => useCardPeek('all', 'p1'));
    let open = false; act(() => { open = result.current.peekOrOpen('a'); });
    expect(open).toBe(true);
  });
  it('first click in a Hide mode reveals, second opens', () => {
    const { result } = renderHook(() => useCardPeek('meaning', 'p1'));
    let open = true; act(() => { open = result.current.peekOrOpen('a'); });
    expect(open).toBe(false);
    expect(result.current.revealed.has('a')).toBe(true);
    act(() => { open = result.current.peekOrOpen('a'); });
    expect(open).toBe(true);
  });
  it('re-hides every card on page or mode change', () => {
    const { result, rerender } = renderHook(({ mode, key }: { mode: CardReveal; key: string }) => useCardPeek(mode, key), { initialProps: { mode: 'hanzi' as CardReveal, key: 'p1' } });
    act(() => { result.current.peekOrOpen('a'); });
    rerender({ mode: 'hanzi', key: 'p2' });
    expect(result.current.revealed.size).toBe(0);
    act(() => { result.current.peekOrOpen('a'); });
    rerender({ mode: 'pinyin', key: 'p2' });
    expect(result.current.revealed.size).toBe(0);
  });
});
