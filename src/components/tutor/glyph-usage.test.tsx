import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { GlyphUsageExamples } from './glyph-usage';
import { CharacterDetails } from './characters-page';
import type { LibraryEntry } from '@/lib/character-library';
import type { Word } from '@/lib/mandarin';
import { loadCharacterHskExample } from '@/lib/character-hsk-examples';
import fallbackData from '../../../public/data/character-hsk-examples.json';

vi.mock('@/lib/character-hsk-examples', () => ({ loadCharacterHskExample: vi.fn(async () => null) }));

vi.mock('@tanstack/react-router', () => ({
  // Forward props so Button asChild classes (e.g. traditional-character) reach the anchor.
  Link: ({ children, to, params, ...props }: { children?: ReactNode; to?: string; params?: { lessonId?: string } } & Record<string, unknown>) => <a href={to?.replace('$lessonId', params?.lessonId ?? '')} {...props}>{children}</a>,
  useNavigate: () => () => {},
}));
const workspaceState = vi.hoisted(() => ({ includeTraditional: false, items: [] as Word[] }));
beforeEach(() => { vi.mocked(loadCharacterHskExample).mockClear(); workspaceState.items = []; });
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
// Radical variants match through BabelStone direct-G trees; serve 鮮's recorded ⿰魚羊.
vi.mock('@/lib/character-enrichment', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/character-enrichment')>()),
  loadRecord: async (character: string) => character === '鮮'
    ? { comparison: { alternatives: [{ expression: '⿰魚羊', qualifiers: 'GHT', directG: true, virtualG: false }] } }
    : null,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: workspaceState.items, saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: workspaceState.includeTraditional, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

const strokeForm: LibraryEntry = { id: 'Strokes:㇐', hanzi: '㇐', pinyin: '', meaning: 'Horizontal', note: 'Unicode stroke form', strokes: 1 };

describe('Absent-record notes', () => {
  it('keeps an existing vocabulary sentence and does not fetch a lesson fallback', () => {
    const sentence = '今天很晴朗。';
    workspaceState.items = [{ id: 'recorded-word', hanzi: '晴朗', sentence, sentencePinyin: 'Jīntiān hěn qínglǎng.', translation: 'It is clear today.', pinyin: 'qínglǎng', meaning: 'clear', type: '', collection: '', level: '' }];
    const lang: LibraryEntry = { id: 'Characters:朗', hanzi: '朗', pinyin: 'lǎng', meaning: 'clear', note: '' };
    const { container } = render(<GlyphUsageExamples entry={lang} kind="Characters" />);
    expect(container.querySelector('.sentence-hanzi')?.textContent).toBe(sentence);
    expect(loadCharacterHskExample).not.toHaveBeenCalled();
  });

  it('fills a missing character from its exact lesson passage with attribution and clears it on navigation', async () => {
    vi.mocked(loadCharacterHskExample).mockResolvedValueOnce(fallbackData.examples['Characters:朗']);
    const lang: LibraryEntry = { id: 'Characters:朗', hanzi: '朗', pinyin: 'lǎng', meaning: 'clear', note: '' };
    const { container, rerender } = render(<GlyphUsageExamples entry={lang} kind="Characters" />);
    expect(await screen.findByRole('link', { name: 'HSK Level 2 · Nature and the Weather' })).toHaveAttribute('href', '/lessons/topic-nature-and-the-weather');
    expect(container.querySelector('.sentence-hanzi')?.textContent).toBe(fallbackData.examples['Characters:朗'].sentence);
    expect(container.querySelector('.sentence-meaning')?.textContent).toBe(fallbackData.examples['Characters:朗'].translation);
    expect(screen.getByText(/Draft lesson example/)).toBeInTheDocument();
    rerender(<GlyphUsageExamples entry={{ ...lang, id: 'Characters:崾', hanzi: '崾' }} kind="Characters" />);
    expect(container.querySelector('.sentence-hanzi')).toBeNull();
    expect(screen.getByText('No recorded example sentence yet.')).toBeInTheDocument();
  });

  it('keeps the sentence section with an external search when a character has no example', () => {
    const he: LibraryEntry = { id: 'Characters:和', hanzi: '和', pinyin: 'hé', meaning: 'harmony; and', note: '8 strokes' };
    render(<GlyphUsageExamples entry={he} kind="Characters" />);
    expect(screen.getByRole('heading', { level: 3, name: 'IN A SENTENCE' })).toBeInTheDocument();
    expect(screen.getByText('No recorded example sentence yet.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Find more examples/ });
    expect(decodeURI(link.getAttribute('href') ?? '')).toBe('https://www.purpleculture.net/sample-sentences/?word=和');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('shows the recorded breakdown on a radical card, like characters and components', () => {
    const mai: LibraryEntry = { id: 'Radicals:麥', hanzi: '麥', pinyin: 'mài', meaning: 'wheat', note: '11 strokes · Radical #199', kangxiIndex: 199, strokes: 11,
      decomposition: { root: { glyph: '⿱', position: 'root', children: [{ glyph: '來', position: 'top' }, { glyph: '夂', position: 'bottom' }] }, source: 'test', status: 'test' } };
    render(<CharacterDetails entry={mai} kind="Radicals" />);
    expect(screen.getByRole('tab', { name: 'Decomposition', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Hanzi graphical structure' }).textContent).toContain('來');
  });

  it('omits the decomposition section for individual strokes', () => {
    render(<CharacterDetails entry={strokeForm} kind="Strokes" />);
    expect(screen.queryByRole('tab', { name: 'Decomposition' })).toBeNull();
    expect(screen.queryByText('Decomposition does not apply to an individual stroke.')).toBeNull();
  });
});

describe('Traditional parent characters', () => {
  it('draws a traditional example tile with the purple traditional style', async () => {
    workspaceState.includeTraditional = true;
    // 鮮 is a recorded Traditional character whose dictionary radical is 魚 (Kangxi #195).
    const radical: LibraryEntry = { id: 'Radicals:魚', hanzi: '魚', pinyin: 'yú', meaning: 'fish; surname', note: '11 strokes · Radical #195', kangxiIndex: 195 };
    render(<GlyphUsageExamples entry={radical} kind="Radicals" familyGlyph="魚" />);
    const tile = (await screen.findByText('鮮')).closest('.decomposition-glyph');
    expect(tile).toHaveClass('traditional-character');
    workspaceState.includeTraditional = false;
  });
});
