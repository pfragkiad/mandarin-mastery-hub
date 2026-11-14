import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DrawingGamePage } from './drawing-game';
import { DrawingSessionProvider } from './drawing-session';
import type { LibraryEntry } from '@/lib/character-library';
import type { Word } from '@/lib/mandarin';

vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children, ...props }: { to: string; search: Record<string, string>; children: React.ReactNode }) => <a href={`${to}?${new URLSearchParams(search)}`} {...props} onClick={event => { event.preventDefault(); (props as { onClick?: () => void }).onClick?.(); }}>{children}</a>, useNavigate: () => vi.fn() }));

const fake = vi.hoisted(() => ({ create: vi.fn(), cancelQuiz: vi.fn(), showCharacter: vi.fn(), showOutline: vi.fn(), hideOutline: vi.fn(), quiz: vi.fn(), animateCharacter: vi.fn() }));
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
/** While a round runs the setup is folded into the play bar's settings chip. */
const openSettings = () => fireEvent.click(screen.getByTitle('Change settings for the next round'));
const onSearch = vi.fn();
it.each([false, true])('restores the same card after Practice (already passed: %s)', async passed => {
  const view = render(<DrawingSessionProvider><DrawingGamePage search={search} onSearch={onSearch}/></DrawingSessionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  if (passed) fireEvent.click(screen.getByRole('button', { name: 'Pass card' }));
  fireEvent.click(screen.getByRole('link', { name: 'Practice' }));
  view.rerender(<DrawingSessionProvider><div>Practice page</div></DrawingSessionProvider>);
  view.rerender(<DrawingSessionProvider><DrawingGamePage search={search} onSearch={onSearch}/></DrawingSessionProvider>);
  await screen.findByText('Card passed — here is the solution.');
  expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
  expect(fake.quiz).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(screen.getByText('Card 2 of 10')).toBeInTheDocument();
  expect(screen.getByText('0 correct · 1 to review')).toBeInTheDocument();
});
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
  fireEvent.click(screen.getByRole('button', { name: 'Start · 1 card' }));
  await waitFor(() => expect(fake.create).toHaveBeenCalledTimes(1));
  const target = fake.create.mock.calls[0]?.[1];
  expect(['你', '好']).toContain(target);
  fireEvent.click(screen.getByRole('button', { name: 'Pass card' }));
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  fireEvent.click(screen.getByRole('button', { name: /^Save / }));
  expect(state.toggleSaved).toHaveBeenCalledWith('word-hello');
  expect(screen.getByRole('link').getAttribute('href')).toBe('/vocabulary?tab=word&word=word-hello');
  fireEvent.click(screen.getByRole('button', { name: 'Review these (1)' }));
  await waitFor(() => expect(fake.create).toHaveBeenCalledTimes(2));
  expect(fake.create.mock.calls[1]?.[1]).toBe(target);
});

it('shows the filtered total and deals the selected deck size', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start · 10 cards' })).toBeTruthy());
  fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  expect(screen.getByRole('button', { name: 'Start · 5 cards' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Start · 5 cards' }));
  expect(await screen.findByText('Card 1 of 5')).toBeTruthy();
});

it('deals every filtered card when the deck size is All cards', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Deck size' })).toBeTruthy());
  fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: 'all' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start · 12 cards' }));
  expect(await screen.findByText('Card 1 of 12')).toBeTruthy();
});

it('the guide returns to hidden on every new card and round', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Start · 10 cards' }));
  await screen.findByText('Card 1 of 10');
  fireEvent.click(screen.getByRole('button', { name: 'Show guide' }));
  expect(screen.getByRole('button', { name: 'Hide guide' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pass card' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  await screen.findByText('Card 2 of 10');
  expect(screen.getByRole('button', { name: 'Show guide' })).toBeTruthy();
});

it('a review round replays every missed card', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.change(await screen.findByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start · 5 cards' }));
  await screen.findByText('Card 1 of 5');
  for (let i = 0; i < 5; i++) {
    fireEvent.click(await screen.findByRole('button', { name: 'Pass card' }));
    // The last card's move-on button leads to the results, not another card.
    fireEvent.click(screen.getByRole('button', { name: i < 4 ? 'Next card' : 'See results' }));
    if (i < 4) await screen.findByText(`Card ${i + 2} of 5`);
  }
  expect(screen.getByText(/5 of 5 played · 5 passed/)).toBeTruthy();
  expect(screen.getAllByText('Passed')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Review these (5)' }));
  expect(await screen.findByText('Card 1 of 5')).toBeTruthy();
});

it('offers a bookmark on every card to review, saving its exact id', async () => {
  const { rerender } = render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.change(await screen.findByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start · 5 cards' }));
  await screen.findByText('Card 1 of 5');
  for (let i = 0; i < 5; i++) {
    fireEvent.click(await screen.findByRole('button', { name: 'Pass card' }));
    fireEvent.click(screen.getByRole('button', { name: i < 4 ? 'Next card' : 'See results' }));
    if (i < 4) await screen.findByText(`Card ${i + 2} of 5`);
  }
  screen.getAllByRole('button', { name: /^Save / }).forEach(button => fireEvent.click(button));
  expect(state.toggleSaved).toHaveBeenCalledTimes(5);
  expect(new Set(state.saved).size).toBe(5);
  rerender(<DrawingGamePage search={search} onSearch={onSearch}/>);
  expect(screen.getAllByRole('button', { name: /^Unsave / })).toHaveLength(5);
});

it('keeps the active round while filters auto-apply and clears explicitly', async () => {
  const view = render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
  await screen.findByText('Card 1 of 10');
  openSettings();
  fireEvent.change(screen.getByRole('combobox', { name: 'Drawing category' }), { target: { value: 'Words' } });
  await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith({ kind: 'Words' }));
  view.rerender(<DrawingGamePage search={{ kind: 'Words', collection: 'Greetings' }} onSearch={onSearch}/>);
  expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
  expect(fake.create).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith({ kind: 'Words' }));
  expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
});

it('changing deck size does not discard drawing progress', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
  await waitFor(() => expect(fake.create).toHaveBeenCalledTimes(1));
  openSettings();
  fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
  expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
  expect(fake.create).toHaveBeenCalledTimes(1);
});

it('counts a completed card and fills the progress the moment it is drawn, before Next card', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  expect(screen.getByText('0 correct · 0 to review')).toBeInTheDocument();
  act(() => fake.quiz.mock.calls[0]?.[0].onComplete({ totalMistakes: 0 }));
  expect(screen.getByText('1 correct · 0 to review')).toBeInTheDocument();
  expect(screen.getByLabelText('Round progress')).toHaveAttribute('value', '1');
  expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Show guide/ })).toBeDisabled();
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(screen.getByText('Card 2 of 10')).toBeInTheDocument();
  expect(screen.getByText('1 correct · 0 to review')).toBeInTheDocument();
});

it('asks before ending once the first card is answered, and keeps that card in the results', async () => {
  render(<DrawingGamePage search={search} onSearch={onSearch}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  act(() => fake.quiz.mock.calls[0]?.[0].onComplete({ totalMistakes: 0 }));
  fireEvent.click(screen.getByRole('button', { name: 'End' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yes, end' }));
  expect(screen.getByText('1 / 1')).toBeInTheDocument();
});
