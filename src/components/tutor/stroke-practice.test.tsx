import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StrokePractice, strokeSpeech } from './stroke-practice';
import { hydrateCatalog } from '@/lib/catalog-store';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 1, theme: 'light',
  }),
}));
vi.mock('@/lib/stroke-examples', () => ({ strokeExamples: {} }));

// One catalogue row as the source records it: the stroke's Chinese name comes first in the note.
hydrateCatalog({
  version: 1, source: 'test', characters: [], radicals: [], components: [],
  strokes: [['㇐', 'héng', 'Horizontal, from left to right.', '横 · basic · Unicode 18.0 Appendix F']],
  trees: {}, readingAudio: { 横: { héng: 'heng-rec' } },
  audio: { 'heng-rec': { url: 'https://example.test/heng.mp3', source: 'Test corpus', license: 'CC BY 4.0' } },
});

describe('stroke practice pronunciation', () => {
  it('speaks the stroke’s Chinese name, never the stroke glyph or an English note', () => {
    expect(strokeSpeech({ note: '横 · basic · Unicode 18.0 Appendix F', pinyin: 'héng' })).toEqual({ name: '横', reading: 'héng' });
    expect(strokeSpeech({ note: 'Basic stroke form', pinyin: '' })).toEqual({ name: null, reading: null });
    expect(strokeSpeech(undefined)).toEqual({ name: null, reading: null });
  });

  it('puts the audio control beside the pinyin, like every other practice panel', () => {
    render(<StrokePractice glyph="㇐" />);
    const button = screen.getByRole('button', { name: 'Listen to 横' });
    expect(button).toHaveClass('practice-listen');
    expect(button.closest('.practice-meaning')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Listen to ㇐' })).toBeNull();
  });
});

describe('stroke practice heading', () => {
  const visibleGlyphs = (heading: HTMLElement) =>
    Array.from(heading.querySelectorAll('span'))
      .filter(node => !node.classList.contains('sr-only'))
      .map(node => node.textContent);

  it('shows the stroke form in the heading while watching or tracing', () => {
    const { unmount } = render(<StrokePractice glyph="㇐" mode="watch" />);
    expect(visibleGlyphs(screen.getByRole('heading', { name: 'Get to know ㇐' }))).toEqual(['㇐']);
    unmount();
    render(<StrokePractice glyph="㇐" mode="trace" />);
    expect(visibleGlyphs(screen.getByRole('heading', { name: 'Get to know ㇐' }))).toEqual(['㇐']);
  });

  it('hides the stroke form from the heading in recall, but keeps the reading and meaning', () => {
    render(<StrokePractice glyph="㇐" mode="recall" />);
    expect(visibleGlyphs(screen.getByRole('heading', { name: 'Get to know ㇐' }))).toEqual([]);
    expect(screen.getByText('héng')).toBeInTheDocument();
  });
});
