import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { readCatalog } from '@/test/catalog-fixture';
import { catalog, hydrateCatalog } from '@/lib/catalog-store';
import type { LibraryEntry } from '@/lib/character-library';
import { CharacterDetails } from './characters-page';

/**
 * The stroke card's "Name" fact is one recorded word (横撇弯钩), so its Hanzi behave like
 * every other word: a hover ring plus a click that opens the shared quick card, instead of
 * each character navigating straight away. With quick cards switched off the exact
 * per-character record link returns, so navigation is never lost.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) => <a {...rest}>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/characters', search: {} }),
}));
vi.mock('@/lib/character-enrichment', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/character-enrichment')>()),
  loadRecord: async () => null,
}));

const preferences = { includeTraditional: false, pinyin: true, slow: false, lessonHints: undefined as boolean | undefined };
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences,
    catalogVersion: 0, theme: 'light',
  }),
}));

beforeAll(() => hydrateCatalog(readCatalog()));
afterEach(() => { cleanup(); preferences.lessonHints = undefined; });

/** The real recorded stroke row for ㇌ (name 横撇弯钩), presented exactly as the library builds it. */
function strokeDetails(): HTMLElement {
  const row = catalog.strokes.find(item => item[0] === '㇌')!;
  const entry: LibraryEntry = { id: `Strokes:${row[0]}`, hanzi: row[0], pinyin: row[1], meaning: row[2], note: row[3] };
  return render(<CharacterDetails entry={entry} kind="Strokes"/>).container;
}

const nameRow = (container: HTMLElement) => within(container.querySelector('.catalog-facts') as HTMLElement);

describe('Stroke name quick cards', () => {
  it('presents every name character as a quick-card target inside the shared word box', () => {
    const container = strokeDetails();
    const box = container.querySelector('.word-example-glyphs') as HTMLElement;
    expect(box).not.toBeNull();
    const targets = box.querySelectorAll('.lesson-hint-char');
    expect(targets).toHaveLength(4);
    expect([...targets].map(target => target.textContent)).toEqual(['横', '撇', '弯', '钩']);
    // No character navigates on its own any more.
    expect(within(box).queryByLabelText(/Open the record for/)).toBeNull();
  });

  it('opens the shared quick card for the exact character that was clicked', () => {
    const container = strokeDetails();
    const box = container.querySelector('.word-example-glyphs') as HTMLElement;
    fireEvent.click(box.querySelectorAll('.lesson-hint-char')[2] as HTMLElement);
    const card = screen.getByRole('button', { name: 'Close' }).closest('.lesson-hint-card') as HTMLElement;
    expect(card).not.toBeNull();
    // The head names the clicked character, and every exact record for that written form
    // is offered (弯 exists as both a character and a component).
    expect(card.querySelector('.lesson-hint-glyph')?.textContent).toBe('弯');
    expect(within(card).getByText('As a character')).toBeVisible();
    expect(within(card).getByText('As a component')).toBeVisible();
  });

  it('keeps the exact per-character record link when quick cards are switched off', () => {
    preferences.lessonHints = false;
    const container = strokeDetails();
    const box = container.querySelector('.word-example-glyphs') as HTMLElement;
    expect(box.querySelectorAll('.lesson-hint-char')).toHaveLength(0);
    expect(within(box).getByLabelText('Open the record for 弯')).toBeVisible();
  });

  it('leaves the Name row out of the box when no Hanzi name is recorded', () => {
    const entry: LibraryEntry = { id: 'Strokes:㇐', hanzi: '㇐', pinyin: 'héng', meaning: 'Horizontal.', note: 'not a hanzi name · basic' };
    const container = render(<CharacterDetails entry={entry} kind="Strokes"/>).container;
    expect(nameRow(container).queryByText('Name')).toBeNull();
  });
});
