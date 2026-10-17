import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { GlyphUsageExamples } from './glyph-usage';
import { CharacterDetails } from './characters-page';
import type { LibraryEntry } from '@/lib/character-library';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
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

  it('shows the stroke decomposition message in the same shared note block', () => {
    render(<CharacterDetails entry={strokeForm} kind="Strokes" />);
    const note = screen.getByText('Decomposition does not apply to an individual stroke.');
    const block = note.closest('.record-gap');
    expect(block).not.toBeNull();
    expect(block!.querySelector('svg')).toBeNull();
  });
});
