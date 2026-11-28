import { cleanup, render, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { readCatalog } from '@/test/catalog-fixture';
import { hydrateCatalog } from '@/lib/catalog-store';
import { libraryEntries, type LibraryKind } from '@/lib/character-library';
import { CharacterDetails } from './characters-page';
import type { RadicalIdentityFile } from '@/lib/radical-identities';

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
  return { row, container };
}

describe('Radical forms own their top-level family', () => {
  it('shows 卤 as family #197, never its imported 卜 (#25) index', () => {
    const { row } = radicalFact('卤');
    expect(row.textContent).toBe('RadicalRadical #197');
    expect(within(row).queryByText('卜')).toBeNull();
  });

  it('keeps 鹵 in family #197', () => {
    expect(radicalFact('鹵').row.textContent).toBe('RadicalRadical #197');
  });

  it('applies the same family priority to the 卤 component record', () => {
    expect(radicalFact('卤', 'Components').row.textContent).toBe('RadicalRadical #197');
  });

  it('retains the recorded dictionary radical for non-radical 滷', () => {
    expect(within(radicalFact('滷').row).getByRole('link').textContent).toBe('水');
  });

  it.each(['卤', '鹵'])('includes the owning Kangxi identity section for %s', glyph => {
    const { container } = radicalFact(glyph);
    expect(within(container).getByRole('heading', { name: /KANGXI IDENTITY/ })).toBeTruthy();
    const link = within(container).getByRole('link', { name: /^Kangxi radical 197 ·/ });
    expect(link.textContent).toBe('鹵');
    expect(link.getAttribute('href')).toContain('id=Radicals%3A%E9%B9%B5');
  });

  it.each(['Characters', 'Components'] as const)('covers every recorded radical in %s through the same detail code', kind => {
    // Expected families come directly from the recorded identity file, independently of
    // the display helper under test. All 214 families must be represented in each library.
    const recorded = JSON.parse(readFileSync('public/data/radical-identities.json', 'utf8')) as RadicalIdentityFile;
    const families = new Set<number>();
    for (const entry of libraryEntries(kind)) {
      const expected = recorded.identities[entry.hanzi]?.radicals;
      if (!expected?.length) continue;
      const { row, container } = radicalFact(entry.hanzi, kind);
      expect(row.textContent, `${kind}:${entry.hanzi}`).toBe(`Radical${expected.map(radical => `Radical #${radical.number}`).join('')}`);
      expect(within(container).getByRole('heading', { name: /KANGXI IDENTITY/ })).toBeTruthy();
      for (const radical of expected) {
        families.add(radical.number);
        expect(within(container).getByRole('link', { name: new RegExp(`^Kangxi radical ${radical.number} ·`) }).textContent).toBe(radical.glyph);
      }
      cleanup();
    }
    expect(families.size).toBe(214);
  }, 30000);
});