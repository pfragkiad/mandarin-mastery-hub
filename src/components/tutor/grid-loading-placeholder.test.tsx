import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { CharactersPage } from './characters-page';
import { VocabularyPage } from './vocabulary';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as catalogStore from '@/lib/catalog-store';
import type { Word } from '@/lib/mandarin';

// jsdom ships neither observer; the page's card measurement hooks only need them to exist.
class NoopObserver {
  observe() {} unobserve() {} disconnect() {}
}
globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;

// The grid skeleton is the page's own loading signal, so the page is mounted for real with the
// catalogue deliberately NOT hydrated (catalogVersion 0 = still fetching).
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
  useRouter: () => ({ history: { back: () => {} } }),
}));
vi.mock('hanzi-writer', () => ({ default: { create: vi.fn() } }));

const workspace = vi.hoisted(() => ({ version: 0, items: [] as Word[] }));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: workspace.items, saved: [], toggleSaved: () => {}, addWord: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false, libraryView: 'compact', cardReveal: 'none', font: 'Kai' },
    catalogVersion: workspace.version, theme: 'light',
  }),
  // The page's peek hook reads session reveals; with no provider in the test it gets none.
  useSessionCardReveals: () => null,
}));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => true }));

afterEach(() => { cleanup(); workspace.version = 0; workspace.items = []; });

// The root shell supplies the tooltip provider the page's hints rely on.
const page = () => <TooltipProvider><CharactersPage search={{}} onSearch={() => {}} /></TooltipProvider>;

describe('library grid loading skeleton', () => {
  it('shows one card skeleton in the grid while the catalogue is still loading', () => {
    const { container } = render(page());
    expect(container.querySelectorAll('.grid-card-placeholder')).toHaveLength(1);
    // It must never be read as a record of its own.
    expect(container.querySelector('.grid-card-placeholder')?.getAttribute('aria-hidden')).toBe('true');
    // And the results area says it is busy rather than claiming there is nothing to show.
    expect(screen.queryByText('No matching records.')).toBeNull();
    expect(container.querySelector('.catalog-results')?.getAttribute('aria-busy')).toBe('true');
  });

  it('replaces the skeleton with records once the catalogue arrives', () => {
    // Hydrate a two-row catalogue and bump the version the mocked workspace reports.
    catalogStore.hydrateCatalog({
      version: 1, source: 'test', characters: [['一', 'yī', 'one', '1 stroke'], ['二', 'èr', 'two', '2 strokes']],
      radicals: [], components: [], trees: {}, readingAudio: {}, audio: {},
    });
    workspace.version = 1;
    const { container } = render(page());
    expect(container.querySelectorAll('.grid-card-placeholder')).toHaveLength(0);
    expect(container.querySelectorAll('.catalog-card:not(.grid-card-placeholder)').length).toBeGreaterThan(0);
    expect(container.querySelector('.catalog-results')?.getAttribute('aria-busy')).toBe('false');
  });
});

describe('vocabulary grid loading skeleton', () => {
  // The word records are bundled, so the skeleton covers only the beat between first paint and
  // mount (a zero-delay timer flips it); waitFor lets that timer fire before the second assert.
  const word: Word = { id: 'w1', hanzi: '学习', pinyin: 'xué xí', meaning: 'to learn', type: 'verb', collection: 'Basics', level: 'HSK 1', sentence: '', translation: '' };

  it('shows one card skeleton on first paint, then the records', async () => {
    workspace.items = [word];
    const { container } = render(<TooltipProvider><VocabularyPage tab="word" page={1}/></TooltipProvider>);
    expect(container.querySelectorAll('.grid-card-placeholder')).toHaveLength(1);
    expect(container.querySelector('.grid-card-placeholder')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.catalog-results')?.getAttribute('aria-busy')).toBe('true');
    // The empty state must stay hidden while the skeleton stands in for the grid.
    expect(screen.queryByText('No words found.')).toBeNull();
    await waitFor(() => expect(container.querySelectorAll('.grid-card-placeholder')).toHaveLength(0));
    expect(container.querySelectorAll('.word-card:not(.grid-card-placeholder)').length).toBeGreaterThan(0);
    expect(container.querySelector('.catalog-results')?.getAttribute('aria-busy')).toBe('false');
  });
});
