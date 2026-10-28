import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DrawingGamePage } from './drawing-game';
import type { LibraryEntry } from '@/lib/character-library';
import type { Word } from '@/lib/mandarin';

vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children, ...props }: { to: string; search: Record<string, string>; children: React.ReactNode }) => <a href={`${to}?${new URLSearchParams(search)}`} {...props}>{children}</a> }));

const fake = vi.hoisted(() => ({ create: vi.fn(), cancelQuiz: vi.fn(), showCharacter: vi.fn(), quiz: vi.fn() }));
vi.mock('hanzi-writer', () => ({ default: { create: fake.create } }));
const state = vi.hoisted(() => ({ saved: [] as string[], toggleSaved: vi.fn() }));
const workspace = vi.hoisted(() => ({ useWorkspace: vi.fn() }));
vi.mock('./workspace', () => ({ useWorkspace: workspace.useWorkspace }));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => false }));
vi.mock('@/lib/character-enrichment', () => ({ loadStrokeGeometry: async () => ({ data: { strokes: ['one'], medians: [[[0, 0], [400, 0]]] } }) }));
vi.mock('@/lib/catalog-store', async importOriginal => ({ ...(await importOriginal<object>()), characterRecording: () => null, playCharacter: async () => undefined }));
const entries = vi.hoisted(() => [] as LibraryEntry[]);
vi.mock('@/lib/character-library', async importOriginal => ({ ...(await importOriginal<object>()), libraryEntries: () => entries }));

const search = { kind: 'Characters' as const };
const onSearch = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  entries.length = 0;
  for (let i = 0; i < 12; i++) entries.push({ id: `Characters:${i}`, hanzi: '一', pinyin: 'yī', meaning: 'one', note: '', strokes: 1 });
  state.saved = [];
  state.toggleSaved = vi.fn((id: string) => { state.saved.push(id); });
  const word: Word = { id: 'word-hello', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'HSK 1', type: '', sentence: '', translation: '', entryKind: 'word' };
  workspace.useWorkspace.mockReturnValue({ items: [word], catalogVersion: 1, theme: 'dark', saved: state.saved, toggleSaved: state.toggleSaved, preferences: { slow: false, includeTraditional: false, font: 'handwritten' } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  fake.create.mockReturnValue(fake);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('bookmarks a missed word with its vocabulary ID and reviews the same selected character', async () => {
  render(<DrawingGamePage search={{ kind: 'Words', collection: 'Greetings', level: 'HSK 1' }} onSearch={onSearch}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start · 1 cards' }));
  await waitFor(() => expect(fake.create).toHaveBeenCalledTimes(1));
  const target = fake.create.mock.calls[0]?.[1];
  expect(['你', '好']).toContain(target);
  fireEvent.click(screen.getByRole('button', { name: 'Pass card' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save 1 unknown card' }));
  expect(state.toggleSaved).toHaveBeenCalledWith('word-hello');
  expect(screen.getByRole('link').getAttribute('href')).toBe('/vocabulary?tab=word&word=word-hello');
  fireEvent.click(screen.getByRole('button', { name: 'Review cards' }));
  await waitFor(() => expect(fake.create).toHaveBeenCalledTimes(2));
  expect(fake.create.mock.calls[1]?.[1]).toBe(target);
});

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
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
    if (i < 4) await screen.findByText(`Card ${i + 2} of 5`);
  }
  expect(screen.getByText('0 correct · 5 to review')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Review cards' }));
  expect(await screen.findByText('Card 1 of 5')).toBeTruthy();
});

it('offers to bookmark unknown cards after a round, saving only unsaved ids', async () => {
  const { rerender } = render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.change(await screen.findByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start · 5 of 12 cards' }));
  await screen.findByText('Card 1 of 5');
  for (let i = 0; i < 5; i++) {
    fireEvent.click(await screen.findByRole('button', { name: 'Pass card' }));
    if (i < 4) await screen.findByText(`Card ${i + 2} of 5`);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Save 5 unknown cards' }));
  expect(state.toggleSaved).toHaveBeenCalledTimes(5);
  expect(new Set(state.saved).size).toBe(5);
  rerender(<DrawingGamePage search={search} onSearch={onSearch}/>);
  expect(screen.getByRole('button', { name: 'Unknown cards saved' })).toBeTruthy();
  expect(screen.getByText('Bookmarked in Saved for this session.')).toBeTruthy();
});
