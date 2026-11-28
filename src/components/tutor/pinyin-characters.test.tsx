// The Sound card's "In a character" cards carry the same reading line + speaker as the
// parent-character cards (owner choice: redundant here, but consistent with every other
// "In a…" card). Inputs: a controlled two-character catalogue and the syllable the card is
// about. The assertions name the shared row's markup (.glyph-usage-facts-row >
// .example-pinyin-row) and the speaker's own aria-label, and check that a multi-reading
// record contributes only the reading this sound card is about — never its other tone.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SyllableCharacters } from './pinyin-characters';
import type { LibraryEntry } from '@/lib/character-library';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 1, theme: 'light',
  }),
}));

// 包 records one reading; 剥 records two, so the row for bāo must show only bāo.
const entries = vi.hoisted((): LibraryEntry[] => [
  { id: 'Characters:包', hanzi: '包', pinyin: 'bāo', meaning: 'wrap; bag', note: '5 strokes', script: 'Simplified' } as LibraryEntry,
  { id: 'Characters:剥', hanzi: '剥', pinyin: 'bāo / bó', meaning: 'peel; strip', note: '10 strokes', script: 'Simplified' } as LibraryEntry,
]);
vi.mock('@/lib/character-library', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/character-library')>()),
  libraryEntries: (kind: string) => (kind === 'Characters' ? entries : []),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

const renderCard = () => render(<SyllableCharacters base="bao" tone={1} backLabel="Sound chart" onLeave={() => {}}/>);

describe('Sound card "In a character" reading lines', () => {
  it('gives every character card its reading and its own speaker', () => {
    const { container } = renderCard();
    const cards = container.querySelectorAll('.pinyin-characters .glyph-parent-card');
    expect(cards.length).toBeGreaterThan(0);
    // One shared reading row per card, above the meaning, like the parent-character cards.
    const rows = container.querySelectorAll('.pinyin-characters .glyph-usage-facts-row .example-pinyin-row');
    expect(rows.length).toBe(cards.length);
    expect(rows[0]?.querySelector('.pinyin')?.textContent).toBe('bāo');
    expect(rows[0]?.querySelector('button[aria-label="Listen to character 包"]')).not.toBeNull();
  });

  it('shows only the reading this sound card is about for a multi-reading record', () => {
    const { container } = renderCard();
    const text = [...container.querySelectorAll('.pinyin-characters .glyph-usage-facts-row')].map(row => row.textContent).join(' ');
    expect(text).toContain('bāo');
    expect(text).not.toContain('bó');
  });
});
