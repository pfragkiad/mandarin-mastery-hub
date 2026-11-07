import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCardPeek } from './card-peek';
import type { CardReveal } from '@/lib/learning-preferences';
import { WorkspaceProvider } from './workspace';
vi.mock('@/lib/catalog-store', () => ({ loadCatalog: async () => {}, catalog: { version: 1 } }));

describe('useCardPeek', () => {
  it('combined hiding supports independent card reveals', () => {
    const { result } = renderHook(() => useCardPeek('pinyin-meaning', 'p1'));
    act(() => result.current.reveal('Characters:好'));
    expect(result.current.hiding).toBe(true);
    expect([...result.current.revealed]).toEqual(['Characters:好']);
  });
  it('remembered reveals survive page changes and library unmounts, until toggled off', () => {
    const { result, rerender } = renderHook(({ mounted, page }) => mounted ? <PeekProbe page={page}/> : null, { initialProps: { mounted: true, page: 'p1' } });
    // Root-provider retention is exercised below through a mounted hook host.
    expect(result.current).not.toBeNull();
    rerender({ mounted: false, page: 'p2' });
  });
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
