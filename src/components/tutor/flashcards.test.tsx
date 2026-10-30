import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashcardsPage } from './flashcards';
import { playPronunciation } from '@/lib/audio';

const bookmarks = vi.hoisted(() => ({ saved: [] as string[], toggle: vi.fn() }));
beforeEach(() => { bookmarks.saved = []; bookmarks.toggle.mockReset(); bookmarks.toggle.mockImplementation((id: string) => bookmarks.saved.push(id)); });
const numbers = ['二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千'].map((hanzi, i) => ({ id: `number-${i}`, hanzi, pinyin: `èr-${i}`, meaning: `number ${i}`, collection: 'Numbers', level: 'Level 1' }));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ items: [{ id: 'hello', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'Level 1', audio: { url: 'https://example.com/hello.mp3', source: 'Test', license: 'Test' } }, ...numbers], saved: bookmarks.saved, toggleSaved: bookmarks.toggle, preferences: { includeTraditional: false }, catalogVersion: 1 }) }));
vi.mock('@/lib/audio', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/audio')>(), playPronunciation: vi.fn() }));
vi.mock('@/lib/mandarin', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/mandarin')>(), collections: ['Greetings', 'Numbers'], speak: vi.fn() }));
vi.mock('@/lib/character-library', () => ({ referenceCatalog: [{ kind: 'Radical', entries: [['一', 'yī', 'one']] }, { kind: 'Component', entries: [['一', 'yī', 'one']] }, { kind: 'Character', entries: [['一', 'yī', 'one']] }] }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children, ...props }: { to: string; search: Record<string, string>; children: React.ReactNode }) => <a href={`${to}?${new URLSearchParams(search)}`} {...props}>{children}</a> }));

describe('Flashcard front pinyin', () => {
  it('offers audio only on the back and plays the attached recording without flipping', () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start · 1 cards' }));
    expect(screen.queryByRole('button', { name: 'Listen to 你好' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listen to 你好' }));
    expect(playPronunciation).toHaveBeenCalledWith(expect.objectContaining({ text: '你好', reading: 'nǐ hǎo', audio: expect.objectContaining({ url: 'https://example.com/hello.mp3' }) }), undefined);
    expect(screen.getByRole('button', { name: 'I knew it' })).toBeEnabled();
  });
  it('can reveal and hide pinyin on the Chinese front without restarting the deck', () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start · 1 cards' }));
    expect(screen.queryByText('nǐ hǎo', { selector: '[aria-hidden="false"] .pinyin' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Show pinyin on card front' }));
    expect(screen.getByText('nǐ hǎo', { selector: '[aria-hidden="false"] .pinyin' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Show pinyin on card front' }));
    expect(screen.queryByText('nǐ hǎo', { selector: '[aria-hidden="false"] .pinyin' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    expect(screen.getByText('nǐ hǎo', { selector: '[aria-hidden="false"] .pinyin' })).toBeInTheDocument();
  });
});

describe('Unknown-card bookmarks', () => {
  async function finish(category: string, known = false) {
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: category } });
    fireEvent.click(screen.getByRole('button', { name: 'Start · 1 cards' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: known ? 'I knew it' : 'Still learning' }));
    await waitFor(() => expect(screen.getByText('DECK COMPLETE')).toBeInTheDocument());
  }
  it('saves the unknown vocabulary record and links to that exact record', async () => {
    const view = render(<FlashcardsPage />);
    await finish('Greetings');
    fireEvent.click(screen.getByRole('button', { name: 'Save 1 unknown card' }));
    expect(bookmarks.toggle).toHaveBeenCalledExactlyOnceWith('hello');
    view.rerender(<FlashcardsPage />);
    expect(screen.getByRole('button', { name: 'Unknown cards saved' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /你好/ })).toHaveAttribute('href', '/vocabulary?word=hello');
  });
  it.each(['Radical', 'Component', 'Character'])('saves an exact %s bookmark and review destination', async kind => {
    render(<FlashcardsPage />);
    await finish(`Ref:${kind}`);
    fireEvent.click(screen.getByRole('button', { name: 'Save 1 unknown card' }));
    expect(bookmarks.toggle).toHaveBeenCalledExactlyOnceWith(`${kind}s:一`);
    expect(screen.getByRole('link', { name: /一/ })).toHaveAttribute('href', `/characters?tab=${kind}s&id=${kind}s%3A%E4%B8%80`);
  });
  it('does not toggle off an existing bookmark', async () => {
    bookmarks.saved = ['hello'];
    render(<FlashcardsPage />);
    await finish('Greetings');
    expect(screen.getByRole('button', { name: 'Unknown cards saved' })).toBeDisabled();
    expect(bookmarks.toggle).not.toHaveBeenCalled();
  });
  it('does not offer to save cards answered correctly', async () => {
    render(<FlashcardsPage />);
    await finish('Greetings', true);
    expect(screen.queryByRole('button', { name: /unknown card/i })).not.toBeInTheDocument();
    expect(bookmarks.toggle).not.toHaveBeenCalled();
  });
});

describe('Deck size', () => {
  it('deals a capped deck by default and honours the deck-size selection', () => {
    render(<FlashcardsPage />);
    expect(screen.getByRole('button', { name: 'Start · 10 of 12 cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start · 10 of 12 cards' }));
    expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
    expect(screen.getByRole('button', { name: 'Restart · 5 of 12 cards' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: 'all' } });
    expect(screen.getByRole('button', { name: 'Restart · 12 cards' })).toBeInTheDocument();
  });
  it('caps the round size to the filtered pool', () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '50' } });
    expect(screen.getByRole('button', { name: 'Start · 12 cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start · 12 cards' }));
    expect(screen.getByText('Card 1 of 12')).toBeInTheDocument();
  });
});
