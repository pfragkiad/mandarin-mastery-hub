import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WritingPractice } from './writing-practice';
import { StrokePractice } from './stroke-practice';

const fake = vi.hoisted(() => ({
  _options: { strokeAnimationSpeed: 0.5 },
  cancelQuiz: vi.fn(), hideCharacter: vi.fn(), showCharacter: vi.fn(),
  showOutline: vi.fn(), hideOutline: vi.fn(), quiz: vi.fn(),
  animateStroke: vi.fn(), animateCharacter: vi.fn(),
  pauseAnimation: vi.fn(), resumeAnimation: vi.fn(),
}));
vi.mock('hanzi-writer', () => ({ default: { create: (_node: unknown, _char: string, options: { onLoadCharDataSuccess: () => void }) => {
  queueMicrotask(options.onLoadCharDataSuccess);
  return fake;
} } }));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ theme: 'light', catalogVersion: 1, preferences: { slow: false } }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    strokes: ['one', 'two', 'three'], medians: [[[0, 0], [400, 0]], [[0, 0], [0, -400]], [[0, 0], [400, -400]]],
  }) }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(['我', '口'])('character/radical playback for %s', character => {
  it('pauses with the current stroke selected and resumes the same animation before continuing in order', async () => {
    render(<WritingPractice character={character}/>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
    await screen.findByRole('button', { name: 'Play stroke 3' });
    fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
    const firstComplete = fake.animateStroke.mock.calls[0]?.[1].onComplete;
    act(() => firstComplete());
    expect(fake.animateStroke.mock.calls.map(call => call[0])).toEqual([0, 1]);
    const secondComplete = fake.animateStroke.mock.calls[1]?.[1].onComplete;
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(fake.pauseAnimation).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Play stroke 2' })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(fake.resumeAnimation).toHaveBeenCalledTimes(1);
    expect(fake.animateStroke).toHaveBeenCalledTimes(2);
    expect(fake.hideCharacter).toHaveBeenCalledTimes(1);
    act(() => secondComplete());
    expect(fake.animateStroke.mock.calls.map(call => call[0])).toEqual([0, 1, 2]);
  });

  it('reset while paused discards the old run and next Play starts with stroke one', async () => {
    render(<WritingPractice character={character}/>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
    await screen.findByRole('button', { name: 'Play stroke 3' });
    fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
    const oldComplete = fake.animateStroke.mock.calls[0]?.[1].onComplete;
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset character' }));
    act(() => oldComplete());
    expect(fake.animateStroke).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
    expect(fake.animateStroke.mock.calls.map(call => call[0])).toEqual([0, 0]);
    expect(fake.resumeAnimation).not.toHaveBeenCalled();
  });
});

it('individual strokes also resume the same correct-writing animation', async () => {
  render(<StrokePractice glyph="㇐"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play stroke' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Play stroke' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  expect(fake.pauseAnimation).toHaveBeenCalledTimes(1);
  expect(fake.resumeAnimation).toHaveBeenCalledTimes(1);
  expect(fake.animateCharacter).toHaveBeenCalledTimes(1);
});