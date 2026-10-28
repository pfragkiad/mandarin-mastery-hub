import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DecompositionTree } from './decomposition-tree';
import { playCharacter } from '@/lib/catalog-store';

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
vi.mock('@/lib/catalog-store', async importOriginal => ({
  ...(await importOriginal<object>()),
  characterRecording: () => null,
  playCharacter: vi.fn(async () => null),
}));
vi.mock('./use-pronunciation-availability', async importOriginal => ({
  usePronunciationAvailability: (hasRecording: boolean, reading?: string | null) =>
    (await import('@/lib/audio')).pronunciationAvailable(hasRecording, reading, true),
}));

describe('Decomposition component audio', () => {
  it('shows a speaker beside the component pinyin and plays that component', async () => {
    render(<DecompositionTree node={{ glyph: '木', position: 'right' }}/>);
    const facts = screen.getByText(/Kangxi radical/);
    expect(facts.closest('.decomposition-facts')!.querySelector('.pinyin')).toHaveTextContent('mù');
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

  it('keeps a form with nothing recorded unpronounceable', () => {
    render(<DecompositionTree node={{ glyph: '⺀', position: '' }}/>);
    expect(screen.getByRole('button', { name: 'No audio available for ⺀' })).toBeDisabled();
  });
});
