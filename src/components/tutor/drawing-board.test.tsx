import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DrawingBoard } from './drawing-board';

const fake = vi.hoisted(() => ({ create: vi.fn(), cancelQuiz: vi.fn(), showCharacter: vi.fn(), showOutline: vi.fn(), hideOutline: vi.fn(), quiz: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children }: { to: string; search: Record<string, unknown>; children: React.ReactNode }) => <a href={`${to}?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}`}>{children}</a> }));
vi.mock('hanzi-writer', () => ({ default: { create: fake.create } }));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ theme: 'dark', preferences: { slow: false } }) }));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => false }));
vi.mock('@/lib/character-enrichment', () => ({ loadStrokeGeometry: async () => ({ data: { strokes: ['one'], medians: [[[0, 0], [400, 0]]] } }) }));
const entry = { id: 'Characters:一', hanzi: '一', pinyin: 'yī', meaning: 'one', note: '' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  fake.create.mockReturnValue(fake);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('starts a quiz with hidden character and outline and disables all automatic hints', async () => {
  render(<DrawingBoard entry={entry} allowErrors onFinish={vi.fn()}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  expect(fake.create.mock.calls[0]?.[2]).toMatchObject({ showCharacter: false, showOutline: false });
  expect(fake.quiz.mock.calls[0]?.[0]).toMatchObject({ showHintAfterMisses: false, markStrokeCorrectAfterMisses: false });
  expect(fake.showCharacter).not.toHaveBeenCalled();
});
it('quizzes only the selected word character, not the whole word', async () => {
  const word = { id: 'hello', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'HSK 1', type: '', sentence: '', translation: '' };
  render(<DrawingBoard entry={{ ...entry, id: word.id, hanzi: '好', word, characterIndex: 1 }} allowErrors onFinish={vi.fn()}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  expect(fake.create.mock.calls[0]?.[1]).toBe('好');
});
it('allow-errors retries do not reveal the guide or end the card', async () => {
  const finish = vi.fn();
  render(<DrawingBoard entry={entry} allowErrors onFinish={finish}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  act(() => fake.quiz.mock.calls[0]?.[0].onMistake());
  expect(fake.cancelQuiz).not.toHaveBeenCalled();
  expect(fake.showCharacter).not.toHaveBeenCalled();
  expect(finish).not.toHaveBeenCalled();
  act(() => fake.quiz.mock.calls[0]?.[0].onComplete());
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(finish).toHaveBeenCalledWith('correct');
});
it('strict mode ends on its first mistake and cannot later become correct', async () => {
  const finish = vi.fn();
  render(<DrawingBoard entry={entry} allowErrors={false} onFinish={finish}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  act(() => fake.quiz.mock.calls[0]?.[0].onMistake());
  expect(fake.cancelQuiz).toHaveBeenCalledTimes(1);
  act(() => fake.quiz.mock.calls[0]?.[0].onComplete());
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(finish).toHaveBeenCalledWith('missed');
});
it('Pass card shows the solution first, then advances as passed, never correct', async () => {
  const finish = vi.fn();
  render(<DrawingBoard entry={entry} allowErrors onFinish={finish}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Pass card' }));
  expect(fake.cancelQuiz).toHaveBeenCalledTimes(1);
  expect(fake.showCharacter).toHaveBeenCalledWith({ duration: 0 });
  expect(finish).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(finish).toHaveBeenCalledWith('passed');
});
it('the guide starts hidden but can be toggled while drawing', async () => {
  render(<DrawingBoard entry={entry} allowErrors onFinish={vi.fn()}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  expect(fake.create.mock.calls[0]?.[2]).toMatchObject({ showOutline: false });
  expect(fake.showOutline).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Show guide' }));
  expect(fake.showOutline).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Hide guide' }));
  expect(fake.hideOutline).toHaveBeenCalledTimes(1);
});
it('changing Allow errors during a card preserves drawing progress', async () => {
  const { rerender } = render(<DrawingBoard entry={entry} allowErrors={false} onFinish={vi.fn()}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  rerender(<DrawingBoard entry={entry} allowErrors onFinish={vi.fn()}/>);
  act(() => fake.quiz.mock.calls[0]?.[0].onMistake());
  expect(fake.create).toHaveBeenCalledTimes(1);
  expect(fake.cancelQuiz).not.toHaveBeenCalled();
});
it('a card completed after showing the guide goes to review, not correct', async () => {
  const finish = vi.fn();
  render(<DrawingBoard entry={entry} allowErrors onFinish={finish}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Show guide' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hide guide' }));
  act(() => fake.quiz.mock.calls[0]?.[0].onComplete());
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(finish).toHaveBeenCalledWith('guided');
});
it('a word card always offers Practice for that word focused on the drawn character', async () => {
  const word = { id: 'hello', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'HSK 1', type: '', sentence: '', translation: '' };
  render(<DrawingBoard entry={{ ...entry, id: word.id, hanzi: '好', word, characterIndex: 1 }} allowErrors onFinish={vi.fn()}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('link', { name: 'Practice' }).getAttribute('href')).toBe('/strokes?character=%E4%BD%A0%E5%A5%BD&focus=1');
  fireEvent.click(screen.getByRole('button', { name: 'Pass card' }));
  expect(screen.getByRole('link', { name: 'Practice' }).getAttribute('href')).toBe('/strokes?character=%E4%BD%A0%E5%A5%BD&focus=1');
});
