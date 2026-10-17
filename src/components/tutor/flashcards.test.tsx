import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlashcardsPage } from './flashcards';

vi.mock('./workspace', () => ({ useWorkspace: () => ({ items: [{ hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'Level 1' }], preferences: { includeTraditional: false } }) }));
vi.mock('@/lib/mandarin', () => ({ collections: ['Greetings'], speak: vi.fn() }));
vi.mock('@/lib/character-library', () => ({ referenceCatalog: [] }));

describe('Flashcard front pinyin', () => {
  it('can reveal and hide pinyin on the Chinese front without restarting the deck', () => {
    render(<FlashcardsPage />);
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