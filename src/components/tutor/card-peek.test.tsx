import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCardPeek } from './card-peek';
import type { CardReveal } from '@/lib/learning-preferences';

describe('useCardPeek', () => {
  it('a click in a Hide mode reveals only that card, never the panel', () => {
    const { result } = renderHook(() => useCardPeek('meaning', 'p1'));
    act(() => { result.current.reveal('a'); });
    expect(result.current.revealed.has('a')).toBe(true);
    expect(result.current.revealed.size).toBe(1);
    // A second click on the revealed card hides it again.
    act(() => { result.current.reveal('a'); });
    expect(result.current.revealed.size).toBe(0);
  });
  it('a click in Show all changes nothing (panel opens only via the details button)', () => {
    const { result } = renderHook(() => useCardPeek('all', 'p1'));
    act(() => { result.current.reveal('a'); });
    expect(result.current.revealed.size).toBe(0);
  });
  it('re-hides every card on page or mode change', () => {
    const { result, rerender } = renderHook(({ mode, key }: { mode: CardReveal; key: string }) => useCardPeek(mode, key), { initialProps: { mode: 'hanzi' as CardReveal, key: 'p1' } });
    act(() => { result.current.reveal('a'); });
    rerender({ mode: 'hanzi', key: 'p2' });
    expect(result.current.revealed.size).toBe(0);
    act(() => { result.current.reveal('a'); });
    rerender({ mode: 'pinyin', key: 'p2' });
    expect(result.current.revealed.size).toBe(0);
  });
});
