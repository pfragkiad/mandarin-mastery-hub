import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { readCatalog } from '@/test/catalog-fixture';
import { catalog, hydrateCatalog } from '@/lib/catalog-store';
import { hydrateCharacterVariants, type CharacterVariantFile } from '@/lib/character-variants';
import type { LibraryEntry } from '@/lib/character-library';
import { CharacterDetails } from './characters-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
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

// The spelling notes come from the lazily loaded v1.4.0 association notes, so the test
// hydrates them the way loadCatalog() does in the browser.
beforeAll(() => {
  hydrateCatalog(readCatalog());
  hydrateCharacterVariants(JSON.parse(readFileSync('public/data/character-variants-v1.4.0.json', 'utf8')) as CharacterVariantFile);
});
afterEach(cleanup);

// The recorded 卤 ↔ 鹵 note: its explanation and spelling table belong in the drawer, its
// evidence scope and source link belong behind the (i) beside the "Spelling notes" arrow.
const EVIDENCE = /^All examples in this note were individually reviewed against cited pinned OpenCC phrase records/;
const SOURCE_URL = 'https://github.com/BYVoid/OpenCC/blob/ver.1.4.2/data/dictionary/STPhrases.txt#L10150';

function renderDetails(glyph: string, kind: 'Characters' | 'Components' = 'Characters') {
  const row = catalog.characters.find(item => item[0] === glyph)!;
  const entry: LibraryEntry = { id: `${kind}:${glyph}`, hanzi: row[0], pinyin: row[1], meaning: row[2], note: row[3] };
  return render(<CharacterDetails entry={entry} kind={kind}/>).container;
}

/** The note row for one exact simplified ↔ traditional pair, matched on its own head line. */
function noteFor(container: HTMLElement, traditional: string) {
  const note = [...container.querySelectorAll('.association-note')]
    .find(item => (item.querySelector('.association-note-head')?.textContent ?? '').includes(traditional));
  if (!(note instanceof HTMLElement)) throw new Error(`Missing spelling note for ${traditional}`);
  return note;
}

describe('Spelling notes drawer keeps its content and hides its evidence behind (i)', () => {
  it('offers the note evidence behind an (i) beside the Spelling notes arrow', () => {
    const container = renderDetails('卤');
    const note = noteFor(container, '鹵');
    const summary = within(note.querySelector('.association-note-summary') as HTMLElement);
    summary.getByRole('button', { name: 'Spelling notes' });
    summary.getByRole('button', { name: 'About this spelling note' });
  });

  it('shows the recorded explanation and spelling table in the drawer, without the evidence paragraph', () => {
    const container = renderDetails('卤');
    const note = noteFor(container, '鹵');
    fireEvent.click(within(note).getByRole('button', { name: 'Spelling notes' }));
    const drawer = note.querySelector('.association-note-details');
    if (!(drawer instanceof HTMLElement)) throw new Error('Drawer did not open');
    expect(drawer.textContent).toContain('salt/halogen vs braising');
    expect(drawer.textContent).toContain('卤素');
    expect(drawer.textContent).toContain('鹵素');
    expect(drawer.textContent).not.toMatch(EVIDENCE);
    expect(drawer.querySelector('.association-note-footnote')).toBeNull();
  });

  it('reveals the recorded evidence scope and its exact source link from the (i)', () => {
    const container = renderDetails('卤');
    const note = noteFor(container, '鹵');
    fireEvent.click(within(note).getByRole('button', { name: 'About this spelling note' }));
    expect(screen.getByText(EVIDENCE)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute('href', SOURCE_URL);
  });
});
