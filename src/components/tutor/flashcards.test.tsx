import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlashcardsPage } from './flashcards';
import { playPronunciation } from '@/lib/audio';

const numbers = ['二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千'].map((hanzi, i) => ({ hanzi, pinyin: `èr-${i}`, meaning: `number ${i}`, collection: 'Numbers', level: 'Level 1' }));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ items: [{ hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'Level 1', audio: { url: 'https://example.com/hello.mp3', source: 'Test', license: 'Test' } }, ...numbers], preferences: { includeTraditional: false } }) }));
vi.mock('@/lib/audio', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/audio')>(), playPronunciation: vi.fn() }));
vi.mock('@/lib/mandarin', () => ({ collections: ['Greetings', 'Numbers'], speak: vi.fn() }));
vi.mock('@/lib/character-library', () => ({ referenceCatalog: [] }));

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
