import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DecompositionTree } from './decomposition-tree';
import { SourceGlyphs } from './character-enrichment';
import { playCharacter } from '@/lib/catalog-store';
import { pronunciationAvailable } from '@/lib/audio';

vi.mock('@tanstack/react-router', () => ({
  // The real Link forwards the button's classes onto its anchor, so the box styling stays observable in tests.
  Link: ({ children, className }: { children?: ReactNode; className?: string }) => <a className={className}>{children}</a>,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));
vi.mock('@/lib/catalog-store', async importOriginal => ({
  ...(await importOriginal<object>()),
  characterRecording: () => null,
  playCharacter: vi.fn(async () => null),
}));
vi.mock('./use-pronunciation-availability', () => ({
  usePronunciationAvailability: (hasRecording: boolean, reading?: string | null) =>
    pronunciationAvailable(hasRecording, reading, true),
}));

describe('Decomposition component audio', () => {
  it('shows a speaker beside the component pinyin and plays that component', async () => {
    render(<DecompositionTree node={{ glyph: '木', position: 'right' }}/>);
    const button = screen.getByRole('button', { name: 'Listen to 木' });
    fireEvent.click(button);
    expect(playCharacter).toHaveBeenCalledWith('木', false, 'mù');
  });

  it('speaks the main radical form for a variant with no recorded name', async () => {
    render(<DecompositionTree node={{ glyph: '⻗', position: '' }}/>);
    expect(screen.getByText('yǔ')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Listen to 雨' });
    fireEvent.click(button);
    expect(playCharacter).toHaveBeenCalledWith('雨', false, 'yǔ');
  });

  it('keeps an unknown or missing part unpronounceable', () => {
    render(<DecompositionTree node={{ glyph: '?', position: '' }}/>);
    expect(screen.getByRole('button', { name: 'No audio available for ?' })).toBeDisabled();
  });
});

describe('breakdown character boxes', () => {
  it('keeps one character inside each bordered box, with its label outside', () => {
    const { container } = render(<DecompositionTree node={{ glyph: '木', position: 'right' }}/>);
    expect(container.querySelector('a.decomposition-glyph')?.textContent).toBe('木');
  });

  it('boxes a part that has no library card instead of leaving it bare', () => {
    const { container } = render(<DecompositionTree node={{ glyph: '?', position: '' }}/>);
    expect(container.querySelector('strong.decomposition-glyph.decomposition-glyph-static')?.textContent).toBe('?');
  });
});

describe('hanzi quoted inside a source note', () => {
  it('boxes every character in a raw expression and leaves the notation plain', () => {
    const { container } = render(<SourceGlyphs text="⿵冂⿱一丨"/>);
    expect([...container.querySelectorAll('.source-glyph-box')].map(node => node.textContent)).toEqual(['冂', '一', '丨']);
    expect(container.textContent).toBe('⿵冂⿱一丨');
  });
});
