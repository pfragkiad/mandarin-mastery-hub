import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { readCatalog } from '@/test/catalog-fixture';
import { catalog, hydrateCatalog } from '@/lib/catalog-store';
import type { LibraryEntry } from '@/lib/character-library';
import { CharacterDetails } from './characters-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
}));
vi.mock('@/lib/character-enrichment', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/character-enrichment')>()),
  loadRecord: async () => null,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

beforeAll(() => hydrateCatalog(readCatalog()));
afterEach(cleanup);

function openSource(glyph = '地', kind: 'Characters' | 'Components' = 'Characters') {
  const row = catalog.characters.find(item => item[0] === glyph)!;
  const entry: LibraryEntry = { id: `${kind}:${glyph}`, hanzi: row[0], pinyin: row[1], meaning: row[2], note: row[3] };
  const { container } = render(<CharacterDetails entry={entry} kind={kind}/>);
  fireEvent.click(within(container.querySelector('.catalog-detail-title') as HTMLElement).getByRole('button', { name: 'Source details' }));
  return container;
}

describe('Sources for reading-specific character meanings', () => {
  it('retains Unihan and adds the recorded Taiwan MOE attribution and link in the actual detail popup', () => {
    openSource();
    expect(screen.getByText('Unicode Unihan 17.0.0 readings and meanings.')).toBeVisible();
    expect(screen.getByText(/Reading-specific meanings:.*Taiwan MOE/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dictionary source' })).toHaveAttribute('href', 'https://dict.concised.moe.edu.tw/dictView.jsp?ID=7455');
  });

  it('omits the extra source when a changed definition invalidates the split', () => {
    const row = catalog.characters.find(item => item[0] === '地')!;
    const original = row[2];
    row[2] = 'corrected definition';
    try {
      openSource();
      expect(screen.getByText('Unicode Unihan 17.0.0 readings and meanings.')).toBeVisible();
      expect(screen.queryByText(/Reading-specific meanings:/)).toBeNull();
      expect(screen.queryByRole('link', { name: 'Dictionary source' })).toBeNull();
    } finally {
      row[2] = original;
    }
  });

  it('shows dictionary/license links and retains the original historical definition', () => {
    const container = openSource('麃');
    expect(container.querySelectorAll('.reading-meaning')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'CC-CEDICT entry' }).getAttribute('href')).toContain(encodeURIComponent('麃'));
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
    expect(screen.getByText('Original Unihan definition: till, plow')).toBeVisible();
    expect(container.textContent).toContain('a kind of deer (archaic)');
  });

  it('keeps one shared regional meaning with both exact reading controls', async () => {
    const container = openSource('誰');
    expect(container.querySelectorAll('.reading-meaning')).toHaveLength(1);
    expect([...container.querySelectorAll('.reading-meaning-reading .pinyin[lang]')].map(node => node.textContent)).toEqual(['shuí', 'shéi']);
    expect(await screen.findByText(/alternative pronunciation of the shéi entry/)).toBeVisible();
  });

  it('uses the same split and source on an exact lexical Components record', () => {
    const container = openSource('都', 'Components');
    expect(container.querySelectorAll('.reading-meaning')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'CC-CEDICT entry' })).toBeVisible();
  });
});
