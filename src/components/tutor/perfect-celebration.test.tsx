import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { usePerfectCelebration } from './perfect-celebration';
import { defaultPreferences } from '@/lib/learning-preferences';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('celebrates exactly 100% accuracy, never a lower or absent score', () => {
  const { result } = renderHook(() => usePerfectCelebration(true));
  act(() => result.current.celebrate(99));
  expect(result.current.effect).toBeNull();
  act(() => result.current.celebrate(null));
  expect(result.current.effect).toBeNull();
  act(() => result.current.celebrate(100));
  expect(result.current.effect).not.toBeNull();
});
it('defaults on and responds immediately to disabling the saved preference', () => {
  expect(defaultPreferences.confetti).toBe(true);
  const { result, rerender } = renderHook(({ enabled }) => usePerfectCelebration(enabled), { initialProps: { enabled: true } });
  act(() => result.current.celebrate(100));
  expect(result.current.effect).not.toBeNull();
  rerender({ enabled: false });
  act(() => result.current.celebrate(100));
  expect(result.current.effect).toBeNull();
});
it('suppresses confetti for reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { result } = renderHook(() => usePerfectCelebration(true));
  act(() => result.current.celebrate(100));
  expect(result.current.effect).toBeNull();
});