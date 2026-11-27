import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { GlyphUsageExamples } from './glyph-usage';
import { CharacterDetails } from './characters-page';
import type { LibraryEntry } from '@/lib/character-library';
import type { Word } from '@/lib/mandarin';
import type { Entry } from '@/lib/data-contract';
import { loadCharacterHskExample } from '@/lib/character-hsk-examples';
import fallbackData from '../../../public/data/character-hsk-examples.json';
import { loadCharacterTatoebaExample, type CharacterTatoebaExample } from '@/lib/character-tatoeba-examples';

const tatoebaData = JSON.parse(readFileSync('public/data/character-tatoeba-examples.json', 'utf8')) as { examples: Record<string, CharacterTatoebaExample> };
vi.mock('@/lib/character-tatoeba-examples', async () => ({
  ...await vi.importActual<typeof import('@/lib/character-tatoeba-examples')>('@/lib/character-tatoeba-examples'),
  loadCharacterTatoebaExample: vi.fn(async () => null),
  loadCharacterSentenceAvailability: vi.fn(async () => false),
}));

vi.mock('@/lib/character-hsk-examples', () => ({ loadCharacterHskExample: vi.fn(async () => null) }));

vi.mock('@tanstack/react-router', () => ({
  // Forward props so Button asChild classes (e.g. traditional-character) reach the anchor,
  // and fold `search` into the href the way the real router does, so link assertions can
  // check the destination's filters (e.g. the phrase section's "Search in phrases").
  Link: ({ children, to, params, search, ...props }: { children?: ReactNode; to?: string; params?: { lessonId?: string }; search?: Record<string, unknown> } & Record<string, unknown>) => <a href={`${to?.replace('$lessonId', params?.lessonId ?? '')}${search ? `?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}` : ''}`} {...props}>{children}</a>,
  useNavigate: () => () => {},
}));
const workspaceState = vi.hoisted(() => ({ includeTraditional: false, cardExamplesLinks: false, items: [] as Word[] }));
beforeEach(() => {
  vi.mocked(loadCharacterHskExample).mockReset().mockResolvedValue(null);
  vi.mocked(loadCharacterTatoebaExample).mockReset().mockResolvedValue(null);
  workspaceState.items = [];
  workspaceState.cardExamplesLinks = false;
});
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
    preferences: { includeTraditional: workspaceState.includeTraditional, cardExamplesLinks: workspaceState.cardExamplesLinks, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

const strokeForm: LibraryEntry = { id: 'Strokes:㇐', hanzi: '㇐', pinyin: '', meaning: 'Horizontal', note: 'Unicode stroke form', strokes: 1 };

describe('Absent-record notes', () => {
  it('shows only the checked short excerpt with public attribution to the full original', async () => {
    const example = Object.values(tatoebaData.examples).find(row => row.editorial.excerpt)!;
    vi.mocked(loadCharacterTatoebaExample).mockResolvedValueOnce(example);
    const entry: LibraryEntry = { id: `Characters:${example.character}`, hanzi: example.character, pinyin: '', meaning: '', note: '' };
    const { container } = render(<GlyphUsageExamples entry={entry} kind="Characters"/>);
    const hint = await screen.findByRole('button', { name: 'Sentence source' });
    expect(hint).toHaveAttribute('data-variant', 'info');
    expect(container.querySelector('.sentence-hanzi')?.textContent).toBe(example.sentence);
    expect(example.sentence.length).toBeLessThanOrEqual(40);
    expect(screen.queryByText(example.source.chinese.text)).toBeNull();
    fireEvent.click(hint);
    expect(await screen.findByRole('link', { name: `Tatoeba · Chinese #${example.source.chinese.id}` })).toHaveAttribute('href', example.source.chinese.url);
    expect(screen.getByText(example.source.chinese.text)).toBeInTheDocument();
    expect(screen.getByText(/Excerpt from the linked longer sentence/)).toBeInTheDocument();
    expect(screen.queryByText(/Review round/)).toBeNull();
  });

  it.each(['Needs_Fix', 'Minor_Review', 'long'] as const)('never renders a stale %s candidate as a learning example', async state => {
    const base = Object.values(tatoebaData.examples)[0]!;
    const example = { ...base, sentence: state === 'long' ? base.character.repeat(21) : base.sentence,
      review: { ...base.review, status: state === 'long' ? 'Pass' as const : state } };
    vi.mocked(loadCharacterTatoebaExample).mockResolvedValueOnce(example);
    const entry: LibraryEntry = { id: `Characters:${example.character}`, hanzi: example.character, pinyin: '', meaning: '', note: '' };
    const { container } = render(<GlyphUsageExamples entry={entry} kind="Characters"/>);
    await act(async () => { await Promise.resolve(); });
    await screen.findByText('No recorded example phrase yet.');
    expect(container.querySelector('.sentence-hanzi')).toBeNull();
    expect(screen.queryByRole('button', { name: /Sentence source/ })).toBeNull();
  });

  it('hides the process note on Pass cases and uses the plain info marker', async () => {
    const example = Object.values(tatoebaData.examples).find(row => row.review.status === 'Pass' && row.review.notes)!;
    vi.mocked(loadCharacterTatoebaExample).mockResolvedValueOnce(example);
    const entry: LibraryEntry = { id: `Characters:${example.character}`, hanzi: example.character, pinyin: '', meaning: '', note: '' };
    render(<GlyphUsageExamples entry={entry} kind="Characters"/>);
    const hint = await screen.findByRole('button', { name: 'Sentence source' });
    expect(hint).toHaveAttribute('data-variant', 'info');
    fireEvent.click(hint);
    expect(await screen.findByRole('link', { name: `Tatoeba · Chinese #${example.source.chinese.id}` })).toBeInTheDocument();
    expect(screen.queryByText(`Note: ${example.review.notes}`)).toBeNull();
  });

  it('keeps an existing sentence first and gives an additional Tatoeba sentence a separate hint', async () => {
    const example = Object.values(tatoebaData.examples)[0]!;
    const sentence = `${example.character} is the existing recorded example`;
    workspaceState.items = [{ id: 'existing', hanzi: example.character, sentence, translation: 'Existing translation', pinyin: '', meaning: '', type: '', collection: '', level: '' }];
    vi.mocked(loadCharacterTatoebaExample).mockResolvedValueOnce(example);
    const entry: LibraryEntry = { id: `Characters:${example.character}`, hanzi: example.character, pinyin: '', meaning: '', note: '' };
    const { container } = render(<GlyphUsageExamples entry={entry} kind="Characters"/>);
    await screen.findByText(example.translation);
    expect(container.querySelectorAll('.sentence-hanzi')).toHaveLength(2);
    expect(container.querySelector('.sentence-hanzi')?.textContent).toBe(sentence);
    expect(container.querySelectorAll('.source-info-trigger')).toHaveLength(1);
    expect(loadCharacterHskExample).not.toHaveBeenCalled();
  });

  it('keeps an existing vocabulary sentence and does not fetch a lesson fallback', () => {
    const sentence = '今天很晴朗。';
    workspaceState.items = [{ id: 'recorded-word', hanzi: '晴朗', sentence, sentencePinyin: 'Jīntiān hěn qínglǎng.', translation: 'It is clear today.', pinyin: 'qínglǎng', meaning: 'clear', type: '', collection: '', level: '' }];
    const lang: LibraryEntry = { id: 'Characters:朗', hanzi: '朗', pinyin: 'lǎng', meaning: 'clear', note: '' };
    const { container } = render(<GlyphUsageExamples entry={lang} kind="Characters" />);
    expect(container.querySelector('.sentence-hanzi')?.textContent).toBe(sentence);
    expect(loadCharacterHskExample).not.toHaveBeenCalled();
  });

  it('shows the record\'s HSK index and primary subtopic in the phrase card header', () => {
    // Only recorded values: hskLevel/hskId come from the entry, the subtopic from its
    // studyMetadata — the card header must echo exactly those, never an inferred label.
    workspaceState.items = [{
      id: 'recorded-word', hanzi: '中文', pinyin: 'Zhōngwén', meaning: 'Chinese', type: '', collection: '', level: '',
      sentence: '我在大学学习中文。', sentencePinyin: 'wǒ zài dàxué xuéxí Zhōngwén.', translation: 'I study Chinese at university.',
      hskId: 18,
      // Only the fields the header reads; the rest of the record shape is irrelevant here.
      entry: { entryKind: 'word', hskLevel: 1, hsk_index: 18, examples: [], studyMetadata: { primarySubtopicId: 'arts-entertainment' } } as unknown as Entry,
    }];
    const zhong: LibraryEntry = { id: 'Characters:中', hanzi: '中', pinyin: 'zhōng', meaning: 'middle', note: '4 strokes' };
    const { container } = render(<GlyphUsageExamples entry={zhong} kind="Characters" />);
    const meta = container.querySelector('.example-card-meta');
    expect(meta?.querySelector('.hsk-level-pill')?.textContent).toBe('HSK L1/#18');
    // The middle dot rides with the topic label; the visible space before it is the row's flex gap.
    expect(meta?.querySelector('.example-card-topic')?.textContent).toBe('· Arts & Entertainment');
    // The header sits inside the same bordered card as its sentence, above it.
    expect(meta?.parentElement?.className).toContain('glyph-usage-example');
    expect(meta?.nextElementSibling?.querySelector('.sentence-hanzi')?.textContent).toBe('我在大学学习中文。');
  });

  it('omits the phrase card header when neither HSK nor subtopic is recorded', () => {
    workspaceState.items = [{ id: 'plain-word', hanzi: '中文', pinyin: 'Zhōngwén', meaning: 'Chinese', type: '', collection: '', level: '', sentence: '', translation: '' }];
    const zhong: LibraryEntry = { id: 'Characters:中', hanzi: '中', pinyin: 'zhōng', meaning: 'middle', note: '4 strokes' };
    const { container } = render(<GlyphUsageExamples entry={zhong} kind="Characters" />);
    expect(container.querySelector('.sentence-hanzi')?.textContent).toBe('中文');
    expect(container.querySelector('.example-card-meta')).toBeNull();
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
    expect(screen.getByText('No recorded example phrase yet.')).toBeInTheDocument();
  });

  it('keeps the phrase section with its internal search when a character has no example', () => {
    const he: LibraryEntry = { id: 'Characters:和', hanzi: '和', pinyin: 'hé', meaning: 'harmony; and', note: '8 strokes' };
    render(<GlyphUsageExamples entry={he} kind="Characters" />);
    expect(screen.getByRole('heading', { level: 3, name: 'IN A PHRASE' })).toBeInTheDocument();
    expect(screen.getByText('No recorded example phrase yet.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Search in phrases/ });
    expect(decodeURI(link.getAttribute('href') ?? '')).toBe('/vocabulary?tab=phrase&q=和');
    // The external search is no longer in the section head: it lives in the card's action row.
    expect(screen.queryByRole('link', { name: /Search on the internet/ })).toBeNull();
  });

  it('hides "Search on the internet" in the detail action row when external links are off, and shows it when enabled', () => {
    const he: LibraryEntry = { id: 'Characters:和', hanzi: '和', pinyin: 'hé', meaning: 'harmony; and', note: '8 strokes' };
    const first = render(<CharacterDetails entry={he} kind="Characters" />);
    expect(screen.queryByRole('link', { name: /Search on the internet/ })).toBeNull();
    first.unmount();
    workspaceState.cardExamplesLinks = true;
    const { container } = render(<CharacterDetails entry={he} kind="Characters" />);
    const link = screen.getByRole('link', { name: /Search on the internet/ });
    expect(decodeURI(link.getAttribute('href') ?? '')).toBe('https://www.purpleculture.net/sample-sentences/?word=和');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    // It sits in the bottom action row, beside Trace/Recall/Bookmark, not above the examples.
    expect(link.closest('.word-detail-actions')).not.toBeNull();
    expect(container.querySelector('.sentence-section .find-examples-link.external-examples-link')).toBeNull();
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

  it('gives the parent card its shared detail arrow to that exact character record', async () => {
    workspaceState.includeTraditional = true;
    const radical: LibraryEntry = { id: 'Radicals:魚', hanzi: '魚', pinyin: 'yú', meaning: 'fish; surname', note: '11 strokes · Radical #195', kangxiIndex: 195 };
    render(<GlyphUsageExamples entry={radical} kind="Radicals" familyGlyph="魚" />);
    const card = (await screen.findByText('鮮')).closest('.glyph-parent-card');
    // The arrow is the shared no-background detail link, and it names the exact record it opens.
    const arrow = card?.querySelector('.example-card-meta > a.detail-arrow-link');
    expect(arrow).not.toBeNull();
    expect(arrow).toHaveAttribute('title', "Click to open 鮮's character details");
    // The router's own encoding keeps the record-id colon as %3A, so compare the exact href.
    expect(decodeURI(arrow?.getAttribute('href') ?? '')).toBe('/characters?tab=Characters&id=Characters%3A鮮');
    workspaceState.includeTraditional = false;
  });
});
