import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { GlyphUsageExamples } from './glyph-usage';
import { CharacterDetails } from './characters-page';
import type { LibraryEntry } from '@/lib/character-library';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));
const workspaceState = vi.hoisted(() => ({ includeTraditional: false }));
// Controlled catalogue: 鮮 is a Traditional character whose dictionary radical is 魚
// and whose recorded breakdown contains the exact 魚 form (the family is multi-form).
const catalogState = vi.hoisted(() => ({
  xian: {
    id: 'Characters:鮮', hanzi: '鮮', pinyin: 'xiān', meaning: 'fresh, new, delicious; rare, few',
    note: '17 strokes · 魚 radical', script: 'Traditional',
    decomposition: { root: { glyph: '⿰', position: 'root', children: [{ glyph: '魚', position: 'left' }, { glyph: '羊', position: 'right' }] }, source: 'test', status: 'test' },
  } as LibraryEntry,
}));
vi.mock('@/lib/character-library', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/character-library')>()),
  libraryEntries: (kind: string) => (kind === 'Characters' ? [catalogState.xian] : []),
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: workspaceState.includeTraditional, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

const strokeForm: LibraryEntry = { id: 'Strokes:㇐', hanzi: '㇐', pinyin: '', meaning: 'Horizontal', note: 'Unicode stroke form', strokes: 1 };

describe('Absent-record notes', () => {
  it('keeps the sentence label and shows the explanation in the shared note block', () => {
    render(<GlyphUsageExamples entry={strokeForm} kind="Strokes" />);
    expect(screen.getByRole('heading', { level: 3, name: 'IN A SENTENCE' })).toHaveClass('eyebrow');
    const note = screen.getByText('No recorded stroke-to-character usage examples available.');
    expect(note.closest('.record-gap')).not.toBeNull();
  });

  it('omits the decomposition section for individual strokes', () => {
    render(<CharacterDetails entry={strokeForm} kind="Strokes" />);
    expect(screen.queryByText('DECOMPOSITION')).toBeNull();
    expect(screen.queryByText('Decomposition does not apply to an individual stroke.')).toBeNull();
  });
});

describe('Traditional parent characters', () => {
  it('draws a traditional example tile with the purple traditional style', () => {
    workspaceState.includeTraditional = true;
    // 鮮 is a recorded Traditional character whose dictionary radical is 魚 (Kangxi #195).
    const radical: LibraryEntry = { id: 'Radicals:魚', hanzi: '魚', pinyin: 'yú', meaning: 'fish; surname', note: '11 strokes · Radical #195', kangxiIndex: 195 };
    render(<GlyphUsageExamples entry={radical} kind="Radicals" familyGlyph="魚" />);
    const tile = screen.getByRole('link', { name: 'Open character 鮮' }).closest('.decomposition-glyph');
    expect(tile).toHaveClass('traditional-character');
    workspaceState.includeTraditional = false;
  });
});
