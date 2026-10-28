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

it('Play after Step draws only remaining strokes and keeps pause/resume available', async () => {
  render(<WritingPractice character="我"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Step' }));
  expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
  const drawn = fake.animateStroke.mock.calls[0]?.[1].onComplete;
  act(() => drawn());
  expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
  expect(fake.animateStroke.mock.calls.map(call => call[0])).toEqual([0, 1]);
  expect(fake.hideCharacter).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  expect(fake.resumeAnimation).toHaveBeenCalledTimes(1);
  act(() => fake.animateStroke.mock.calls[1]?.[1].onComplete());
  expect(fake.animateStroke.mock.calls.map(call => call[0])).toEqual([0, 1, 2]);
  fireEvent.click(screen.getByRole('button', { name: 'Reset character' }));
  expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
  expect(fake.animateStroke.mock.calls.map(call => call[0])).toEqual([0, 1, 2, 0]);
});

it.each(['trace', 'recall'] as const)('global Reset restarts %s with cleared scores and mode-specific hints', async mode => {
  render(<WritingPractice character="我" mode={mode}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  act(() => fake.quiz.mock.calls[0]?.[0].onCorrectStroke({ strokeNum: 0, mistakesOnStroke: 2 }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset character' }));
  expect(fake.quiz).toHaveBeenCalledTimes(2);
  expect(fake.quiz.mock.calls[1]?.[0].showHintAfterMisses).toBe(mode === 'recall' ? false : 2);
});

it.each(['trace', 'recall'] as const)('single-stroke Reset restarts %s practice', async mode => {
  render(<StrokePractice glyph="㇐" mode={mode}/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Reset stroke' }));
  expect(fake.quiz).toHaveBeenCalledTimes(2);
  expect(fake.quiz.mock.calls[1]?.[0].showHintAfterMisses).toBe(mode === 'recall' ? false : 2);
});

describe('matched practice stroke speech', () => {
  async function startPractice() {
    render(<WritingPractice character="宀"/>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Trace' }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(fake.quiz).toHaveBeenCalled());
    return fake.quiz.mock.calls[0]?.[0];
  }

  it('speaks each accepted stroke name once audio is turned on, including a corrected stroke, but not mistakes', async () => {
    const callbacks = await startPractice();
    fireEvent.click(screen.getByRole('button', { name: 'Unmute stroke names' }));
    act(() => callbacks.onMistake());
    expect(speakTts).not.toHaveBeenCalled();
    act(() => callbacks.onCorrectStroke({ strokeNum: 0, mistakesOnStroke: 0 }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 1, mistakesOnStroke: 1 }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 2, mistakesOnStroke: 0 }));
    expect(vi.mocked(speakTts).mock.calls.map(call => call[0])).toEqual(['点', '点', '横钩']);
  });

  it('keeps stroke names silent by default until the listener unmutes', async () => {
    const callbacks = await startPractice();
    expect(screen.getByRole('button', { name: 'Unmute stroke names' })).toHaveAttribute('aria-pressed', 'true');
    act(() => callbacks.onCorrectStroke({ strokeNum: 0, mistakesOnStroke: 0 }));
    expect(speakTts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unmute stroke names' }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 2, mistakesOnStroke: 0 }));
    expect(speakTts).toHaveBeenCalledExactlyOnceWith('横钩');
    fireEvent.click(screen.getByRole('button', { name: 'Mute stroke names' }));
    act(() => callbacks.onCorrectStroke({ strokeNum: 1, mistakesOnStroke: 0 }));
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

it.each([['character', <WritingPractice key="a" character="我" mode="trace"/>], ['single stroke', <StrokePractice key="b" glyph="㇐" mode="trace"/>]] as const)(
  'the %s panel keeps the outline on with no separate outline switch', async (_label, panel) => {
    render(panel);
    await waitFor(() => expect(fake.quiz).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /character outline/i })).toBeNull();
    expect(fake.hideOutline).not.toHaveBeenCalled();
  });

it('the Strokes group holds the arrow control, and turning it on draws the direction arrows', async () => {
  render(<WritingPractice character="我" mode="trace"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play stroke 3' })).toBeEnabled());
  const group = document.querySelector('.stroke-guide');
  expect(group).not.toBeNull();
  expect(screen.queryByText('Stroke tiles')).toBeNull();
  expect(group?.textContent).toContain('Strokes');
  const arrows = screen.getByRole('button', { name: 'Show stroke arrows' });
  expect(group?.contains(arrows)).toBe(true);
  expect(document.querySelector('.stroke-direction-overlay')).toBeNull();
  fireEvent.click(arrows);
  await waitFor(() => expect(document.querySelector('.stroke-direction-overlay')).not.toBeNull());
});

it('the single-stroke panel uses the same arrow button instead of a switch', async () => {
  render(<StrokePractice glyph="㇐" mode="trace"/>);
  await waitFor(() => expect(fake.quiz).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Show stroke arrows' })).toBeTruthy();
  expect(screen.queryByRole('switch')).toBeNull();
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
it('animation speed is three grouped buttons, defaults to 0.5× and applies the chosen speed', async () => {
  const { container } = render(<WritingPractice character="我"/>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Play strokes' })).toBeEnabled());
  expect(container.querySelector('input[type="range"]')).toBeNull();
  expect(screen.queryByRole('slider')).toBeNull();
  expect(screen.getAllByRole('group', { name: 'Animation speed' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: '0.25×' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: '0.5×' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: '1×' }));
  expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '0.5×' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Play strokes' }));
  expect(fake._options.strokeAnimationSpeed).toBe(1);
});
