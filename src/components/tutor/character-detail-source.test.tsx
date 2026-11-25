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

  it('discloses the original 伲 readings and Unicode disagreement beside its dictionary-attested split', () => {
    const container = openSource('伲');
    expect([...container.querySelectorAll('.reading-meaning-reading .pinyin[lang]')].map(node => node.textContent)).toEqual(['nì', 'nǐ']);
    expect(within(container).getByRole('button', { name: 'Listen to 伲 nì' })).toBeEnabled();
    expect(within(container).getByRole('button', { name: 'Listen to 伲 nǐ' })).toBeEnabled();
    expect(container.textContent).toContain('you (archaic variant of 你)');
    expect(screen.getByText(/original Unihan ní \/ nǐ remains preserved/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Taiwan MOE variant dictionary' })).toHaveAttribute('href', 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=1121');
    expect(screen.getByRole('link', { name: 'Unicode reading proposal (2023)' })).toBeVisible();
  });

  it('groups 剖 pōu/pǒu under one meaning and discloses the imported pǒ discrepancy with MOE/CNS links', () => {
    const container = openSource('剖');
    expect(container.querySelectorAll('.reading-meaning')).toHaveLength(1);
    expect([...container.querySelectorAll('.reading-meaning-reading .pinyin[lang]')].map(node => node.textContent)).toEqual(['pōu', 'pǒu']);
    expect(within(container).getByRole('button', { name: 'Listen to 剖 pǒu' })).toHaveAttribute('title', 'Listen to pǒu · Recording');
    expect(container.querySelector('.reading-meaning')?.textContent).toContain('to split; to cut open; to dissect; to analyze');
    expect(screen.getByText(/original imported pōu \/ pǒ remains preserved/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Taiwan MOE revised dictionary' })).toHaveAttribute('href', 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=695');
    expect(screen.getByRole('link', { name: 'Taiwan CNS11643' })).toHaveAttribute('href', 'https://www.cns11643.gov.tw/wordView.jsp?ID=87112');
    expect(screen.getByText(/jiě pōu, not jiě pāo/)).toBeVisible();
  });

  it('keeps both 崾 readings with their own recordings and source-qualified meanings', () => {
    const container = openSource('崾');
    expect(container.querySelectorAll('.reading-meaning')).toHaveLength(2);
    expect([...container.querySelectorAll('.reading-meaning-reading .pinyin[lang]')].map(node => node.textContent)).toEqual(['yào', 'yǎo']);
    expect(within(container).getByRole('button', { name: 'Listen to 崾 yào' })).toHaveAttribute('title', 'Listen to yào · Recording');
    expect(within(container).getByRole('button', { name: 'Listen to 崾 yǎo' })).toHaveAttribute('title', 'Listen to yǎo · Recording');
    expect(container.textContent).toContain('mountain saddle; pass');
    expect(screen.getByRole('link', { name: 'MCA Geographical Names Institute' })).toHaveAttribute('href', 'https://www.cgn-mca.ac.cn/n766/c30087/content.html');
    expect(screen.getByRole('link', { name: 'Taiwan MOE variant dictionary' })).toHaveAttribute('href', 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=83607');
    expect(screen.getByText(/meanings overlap by source and region/)).toBeVisible();
    expect(screen.getByText('Original Unihan definition: place name in Shanxi province')).toBeVisible();
  });
});
