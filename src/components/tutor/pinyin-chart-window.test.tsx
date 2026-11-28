// The Sound chart's selected syllable always opens in the floating window (PinyinSoundSheet),
// at every width: the grid keeps its full width and the card never sits beside it.
// Inputs: a small hand-built syllable set with one syllable already selected in the URL.
// The assertions name the window's own markup (.pinyin-sound-sheet) and the absence of a
// docked card inside the chart layout, so a regression back to "beside the grid" fails here.
import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { usePinyinPlayer } from './pinyin-shared';
import { PinyinChart } from './pinyin-chart';
import type { PinyinData } from '@/lib/pinyin-guide';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

// jsdom has no matchMedia (the filter form's small-screen switch) or ResizeObserver; both are
// stubbed to stable no-ops so the chart mounts the same way the browser does at a wide width.
const media = (query: string) => ({
  matches: false, media: query, onchange: null,
  addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
});
const previousMedia = window.matchMedia;
const previousObserver = window.ResizeObserver;
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: vi.fn(media) });
  Object.defineProperty(window, 'ResizeObserver', { writable: true, configurable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
});
afterAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: previousMedia });
  Object.defineProperty(window, 'ResizeObserver', { writable: true, configurable: true, value: previousObserver });
});

const data: PinyinData = {
  syllables: [
    { base: 'ba', initial: 'b', final: 'a', tones: [1, 2, 3, 4], note: null },
    { base: 'pa', initial: 'p', final: 'a', tones: [1, 2, 3, 4], note: null },
  ],
  recordings: {
    ba1: { url: 'https://cdn/ba1.mp3', ms: 400 },
    ba2: { url: 'https://cdn/ba2.mp3', ms: 400 },
    pa1: { url: 'https://cdn/pa1.mp3', ms: 400 },
  },
  inventorySource: { name: 'test inventory', url: 'https://example.invalid', license: 'test' },
  audioSource: { name: 'test audio', url: 'https://example.invalid', license: 'test' },
};

function Harness() {
  const player = usePinyinPlayer(data, false);
  return <PinyinChart data={data} player={player} filters={{ q: '', initial: '', final: '' }}
    selected="ba" tone={1} slow={false} onSlow={() => {}} onSelect={() => {}} onTone={() => {}} onFilters={() => {}} />;
}

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

describe('Sound chart selected-syllable window', () => {
  it('opens the chosen syllable in the floating window even at a wide chart width', () => {
    render(<Harness/>);
    // The window is open and carries the card: its heading names the chosen tone.
    expect(document.querySelector('.pinyin-sound-sheet')).not.toBeNull();
    const card = document.querySelector('.pinyin-sound-sheet .pinyin-player.in-sheet');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('bā');
  });

  it('never leaves a copy of the card docked inside the chart layout', () => {
    render(<Harness/>);
    expect(document.querySelector('.pinyin-chart-layout > .pinyin-player')).toBeNull();
  });
});
