import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DrawingGamePage } from './drawing-game';
import type { LibraryEntry } from '@/lib/character-library';

const fake = vi.hoisted(() => ({ create: vi.fn(), cancelQuiz: vi.fn(), showCharacter: vi.fn(), quiz: vi.fn() }));
vi.mock('hanzi-writer', () => ({ default: { create: fake.create } }));
const workspace = vi.hoisted(() => ({ useWorkspace: vi.fn() }));
vi.mock('./workspace', () => ({ useWorkspace: workspace.useWorkspace }));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => false }));
vi.mock('@/lib/character-enrichment', () => ({ loadStrokeGeometry: async () => ({ data: { strokes: ['one'], medians: [[[0, 0], [400, 0]]] } }) }));
vi.mock('@/lib/catalog-store', () => ({ characterRecording: () => null, playCharacter: async () => undefined }));
const entries = vi.hoisted(() => [] as LibraryEntry[]);
vi.mock('@/lib/character-library', async importOriginal => ({ ...(await importOriginal<object>()), libraryEntries: () => entries }));

const search = { kind: 'Characters' as const };
const onSearch = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  entries.length = 0;
  for (let i = 0; i < 12; i++) entries.push({ id: `Characters:${i}`, hanzi: '一', pinyin: 'yī', meaning: 'one', note: '', strokes: 1 });
  workspace.useWorkspace.mockReturnValue({ catalogVersion: 1, theme: 'dark', saved: [], toggleSaved: vi.fn(), preferences: { slow: false, includeTraditional: false, font: 'handwritten' } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  fake.create.mockReturnValue(fake);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('shows the filtered total and deals the selected deck size', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start · 10 of 12 cards' })).toBeTruthy());
  expect(screen.getByText(/12 cards match your filters/)).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  expect(screen.getByRole('button', { name: 'Start · 5 of 12 cards' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Start · 5 of 12 cards' }));
  expect(await screen.findByText('Card 1 of 5')).toBeTruthy();
});

it('deals every filtered card when the deck size is All cards', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Deck size' })).toBeTruthy());
  fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: 'all' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start · 12 cards' }));
  expect(await screen.findByText('Card 1 of 12')).toBeTruthy();
});

it('a review round replays every missed card', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.change(await screen.findByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start · 5 of 12 cards' }));
  await screen.findByText('Card 1 of 5');
  for (let i = 0; i < 5; i++) {
    fireEvent.click(await screen.findByRole('button', { name: 'Pass card' }));
    if (i < 4) await screen.findByText(`Card ${i + 2} of 5`);
  }
  expect(screen.getByText(/to review/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Review cards' }));
  expect(await screen.findByText('Card 1 of 5')).toBeTruthy();
});
