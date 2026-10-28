import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ComponentPronunciation } from './component-pronunciation';
import { playCharacter } from '@/lib/catalog-store';
vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences: { slow: false } }) }));
vi.mock('@/lib/catalog-store', async original => ({ ...await original<object>(), characterRecording: () => null, playCharacter: vi.fn(async () => null) }));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: (_recording: boolean, reading: string | null) => Boolean(reading) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('uses the exact component reading for 木', () => {
  render(<ComponentPronunciation glyph="木"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Listen to 木' }));
  expect(playCharacter).toHaveBeenCalledWith('木', false, 'mù');
});
it('uses the recorded family fallback for ⻗', () => {
  render(<ComponentPronunciation glyph="⻗"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Listen to 雨' }));
  expect(playCharacter).toHaveBeenCalledWith('雨', false, 'yǔ');
});
it('does not invent a reading for unknown parts', () => {
  render(<ComponentPronunciation glyph="?"/>);
  fireEvent.click(screen.getByRole('button', { name: 'No audio available for ?' }));
  expect(playCharacter).not.toHaveBeenCalled();
});