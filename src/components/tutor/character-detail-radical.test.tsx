import { cleanup, render, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { readCatalog } from '@/test/catalog-fixture';
import { hydrateCatalog } from '@/lib/catalog-store';
import { libraryEntries, type LibraryKind } from '@/lib/character-library';
import { CharacterDetails } from './characters-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, search, ...props }: { children?: ReactNode; search?: Record<string, unknown> } & Record<string, unknown>) =>
    <a {...props} href={search ? `?${new URLSearchParams(Object.entries(search).map(([key, value]) => [key, String(value)]))}` : undefined}>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));
vi.mock('@/lib/character-enrichment', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/character-enrichment')>()),
  loadRecord: async () => null,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: true, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

beforeAll(() => hydrateCatalog(readCatalog()));
afterEach(cleanup);

/** Inspect the actual detail fact's identity and navigation, not its colour or markup. */
function radicalFact(glyph: string, kind: LibraryKind = 'Characters') {
  const entry = libraryEntries(kind).find(item => item.hanzi === glyph);
  if (!entry) throw new Error(`Missing ${kind} record ${glyph}`);
  const { container } = render(<CharacterDetails entry={entry} kind={kind}/>);
  const facts = container.querySelector('.catalog-facts');
  if (!(facts instanceof HTMLElement)) throw new Error('Missing facts');
  const row = within(facts).getByText('Radical').parentElement;
  if (!row) throw new Error('Missing radical fact');
  return row;
}

describe('Radical forms own their top-level family', () => {
  it('shows 卤 as family #197, never its imported 卜 (#25) index', () => {
    const row = radicalFact('卤');
    const link = within(row).getByRole('link');
    expect(link.textContent).toBe('鹵');
    expect(link.getAttribute('href')).toContain('id=Radicals%3A%E9%B9%B5');
    expect(within(row).queryByText('卜')).toBeNull();
  });

  it('keeps 鹵 in family #197', () => {
    expect(radicalFact('鹵').textContent).toBe('RadicalRadical #197');
  });

  it('applies the same family priority to the 卤 component record', () => {
    expect(within(radicalFact('卤', 'Components')).getByRole('link').textContent).toBe('鹵');
  });

  it('retains the recorded dictionary radical for non-radical 滷', () => {
    expect(within(radicalFact('滷')).getByRole('link').textContent).toBe('水');
  });
});