import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WritingPractice } from './writing-practice';
import { StrokePractice } from './stroke-practice';
import { speakTts } from '@/lib/audio';

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
vi.mock('@/lib/audio', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/audio')>(),
  speakTts: vi.fn(),
}));
vi.mock('@/lib/character-enrichment', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/character-enrichment')>(),
  loadStrokeGeometry: async () => ({ checksum: 'test', data: {
    strokes: ['one', 'two', 'three'], medians: [[[0, 0], [400, 0]], [[0, 0], [0, -400]], [[0, 0], [400, -400]]],
  } }),
}));
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

it('selecting occurrence strokes while paused does not replace or resume the animation', async () => {
  const { container, rerender } = render(<WritingPractice character="河"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  rerender(<WritingPractice character="河" component={{ glyph: '氵', path: [0], strokeIndices: [0, 1, 2], noncontiguous: false, standaloneFit: 'fits-current-geometry-guards', standaloneReuseAllowed: true }}/>);
  expect(container.querySelectorAll('.component-stroke-overlay path')).toHaveLength(3);
  expect(fake.animateStroke).toHaveBeenCalledTimes(1);
  expect(fake.resumeAnimation).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Play stroke 1' })).toHaveAttribute('aria-current', 'step');
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  expect(fake.resumeAnimation).toHaveBeenCalledTimes(1);
  expect(fake.animateStroke).toHaveBeenCalledTimes(1);
});

it('step mode keeps whole-character playback off until Reset or Practice', async () => {
  render(<WritingPractice character="我"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Step' }));
  expect(screen.getByRole('button', { name: 'Play strokes' })).toBeDisabled();
  const drawn = fake.animateStroke.mock.calls[0]?.[1].onComplete;
  act(() => drawn());
  expect(screen.getByRole('button', { name: 'Play strokes' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reset character' }));
  expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled();
});

describe('matched practice stroke speech', () => {
  async function startPractice() {
    render(<WritingPractice character="宀"/>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Trace' }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(fake.quiz).toHaveBeenCalled());
    return fake.quiz.mock.calls[0]?.[0];
  }

  it('speaks each accepted stroke name, including a corrected stroke, but not mistakes', async () => {
    const callbacks = await startPractice();
    act(() => callbacks.onMistake());
    expect(speakTts).not.toHaveBeenCalled();
    act(() => callbacks.onCorrectStroke({ strokeNum: 0, mistakesOnStroke: 0 }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 1, mistakesOnStroke: 1 }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 2, mistakesOnStroke: 0 }));
    expect(vi.mocked(speakTts).mock.calls.map(call => call[0])).toEqual(['点', '点', '横钩']);
  });

  it('uses the live Step mute control during an already-started practice attempt', async () => {
    const callbacks = await startPractice();
    fireEvent.click(screen.getByRole('button', { name: 'Mute stroke names' }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 0, mistakesOnStroke: 0 }));
    expect(speakTts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unmute stroke names' }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 2, mistakesOnStroke: 0 }));
    expect(speakTts).toHaveBeenCalledExactlyOnceWith('横钩');
  });
});

it('Recall starts without outline, component overlays or automatic hints', async () => {
  const { container } = render(<WritingPractice character="我" mode="recall" component={{ glyph: '扌', path: [0], strokeIndices: [0, 1], noncontiguous: false, standaloneFit: 'fits-current-geometry-guards', standaloneReuseAllowed: true }}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalled());
  expect(fake.hideOutline).toHaveBeenCalledWith({ duration: 0 });
  expect(fake.quiz.mock.calls[0]?.[0].showHintAfterMisses).toBe(false);
  expect(container.querySelector('.component-stroke-overlay')).toBeNull();
  expect(container.querySelector('.stroke-guide')).toBeNull();
});

it('Trace starts guided handwriting with a visible outline', async () => {
  render(<WritingPractice character="我" mode="trace"/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalled());
  expect(fake.showOutline).toHaveBeenCalledWith({ duration: 0 });
  expect(fake.quiz.mock.calls[0]?.[0].showHintAfterMisses).toBe(2);
});

it('changing mode cancels an old playback run without remounting the writer', async () => {
  const { rerender } = render(<WritingPractice character="我" mode="watch"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
  const complete = fake.animateStroke.mock.calls[0]?.[1].onComplete;
  rerender(<WritingPractice character="我" mode="recall"/>);
  act(() => complete());
  expect(fake.animateStroke).toHaveBeenCalledTimes(1);
  expect(fake.quiz).toHaveBeenCalledTimes(1);
});