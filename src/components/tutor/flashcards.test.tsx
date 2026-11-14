import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashcardsPage } from './flashcards';
import { playPronunciation } from '@/lib/audio';
import { FlashcardSessionProvider } from './flashcard-session';
import { detailTrail } from '@/lib/detail-trail';

const bookmarks = vi.hoisted(() => ({ saved: [] as string[], toggle: vi.fn() }));
beforeEach(() => { bookmarks.saved = []; bookmarks.toggle.mockReset(); bookmarks.toggle.mockImplementation((id: string) => bookmarks.saved.push(id)); });
const numbers = ['二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千'].map((hanzi, i) => ({ id: `number-${i}`, hanzi, pinyin: `èr-${i}`, meaning: `number ${i}`, collection: 'Numbers', level: 'Level 1' }));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ items: [{ id: 'hello', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'Level 1', audio: { url: 'https://example.com/hello.mp3', source: 'Test', license: 'Test' } }, ...numbers], saved: bookmarks.saved, toggleSaved: bookmarks.toggle, preferences: { includeTraditional: false }, catalogVersion: 1 }) }));
vi.mock('@/lib/audio', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/audio')>(), playPronunciation: vi.fn() }));
vi.mock('@/lib/mandarin', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/mandarin')>(), collections: ['Greetings', 'Numbers'], speak: vi.fn() }));
vi.mock('@/lib/character-library', () => ({ referenceCatalog: [{ kind: 'Radical', entries: [['一', 'yī', 'one']] }, { kind: 'Component', entries: [['一', 'yī', 'one']] }, { kind: 'Character', entries: [['一', 'yī', 'one']] }] }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children, ...props }: { to: string; search: Record<string, string>; children: React.ReactNode }) => <a href={`${to}?${new URLSearchParams(search)}`} {...props}>{children}</a>, useNavigate: () => vi.fn() }));

/** While a round runs the setup is folded into the play bar's settings chip. */
const openSettings = () => fireEvent.click(screen.getByRole('button', { name: /Chinese → English|English → Chinese/ }));

describe('Flashcard front pinyin', () => {
  it('offers audio only on the back and plays the attached recording without flipping', async () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Start · 1 card' }));
    expect(screen.queryByRole('button', { name: 'Listen to 你好' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listen to 你好' }));
    expect(playPronunciation).toHaveBeenCalledWith(expect.objectContaining({ text: '你好', reading: 'nǐ hǎo', audio: expect.objectContaining({ url: 'https://example.com/hello.mp3' }) }), undefined);
    expect(screen.getByRole('button', { name: 'I knew it' })).toBeEnabled();
  });
  it('can reveal and hide pinyin on the Chinese front without restarting the deck', async () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Start · 1 card' }));
    expect(screen.queryByText('nǐ hǎo', { selector: '[aria-hidden="false"] .pinyin' })).not.toBeInTheDocument();
    openSettings();
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
    fireEvent.click(await screen.findByRole('button', { name: 'Start · 1 card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: known ? 'I knew it' : 'Still learning' }));
    await waitFor(() => expect(screen.getByText('Session complete')).toBeInTheDocument());
  }
  it('saves the unknown vocabulary record and links to that exact record', async () => {
    const view = render(<FlashcardsPage />);
    await finish('Greetings');
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark 你好' }));
    expect(bookmarks.toggle).toHaveBeenCalledExactlyOnceWith('hello');
    view.rerender(<FlashcardsPage />);
    expect(screen.getByRole('button', { name: 'Remove bookmark 你好' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /你好/ })).toHaveAttribute('href', '/vocabulary?word=hello&tab=word');
  });
  it.each(['Radical', 'Component', 'Character'])('saves an exact %s bookmark and review destination', async kind => {
    render(<FlashcardsPage />);
    await finish(`Ref:${kind}`);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark 一' }));
    expect(bookmarks.toggle).toHaveBeenCalledExactlyOnceWith(`${kind}s:一`);
    expect(screen.getByRole('link', { name: /一/ })).toHaveAttribute('href', `/characters?tab=${kind}s&id=${kind}s%3A%E4%B8%80`);
  });
  it('shows an existing bookmark as saved without toggling it', async () => {
    bookmarks.saved = ['hello'];
    render(<FlashcardsPage />);
    await finish('Greetings');
    expect(screen.getByRole('button', { name: 'Remove bookmark 你好' })).toHaveAttribute('aria-pressed', 'true');
    expect(bookmarks.toggle).not.toHaveBeenCalled();
  });
  it('does not offer to save cards answered correctly', async () => {
    render(<FlashcardsPage />);
    await finish('Greetings', true);
    expect(screen.queryByRole('button', { name: /^Bookmark / })).not.toBeInTheDocument();
    expect(bookmarks.toggle).not.toHaveBeenCalled();
  });
});

describe('Saved deck', () => {
  it('deals only the category\'s bookmarked cards when Saved is selected', async () => {
    bookmarks.saved = ['hello'];
    render(<FlashcardsPage />);
    // All vocabulary holds 12 mocked words; only 你好 is bookmarked.
    fireEvent.click(screen.getByRole('button', { name: /^Show only saved cards/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start · 1 card' }));
    expect(screen.getByRole('button', { name: /Saved · All vocabulary · Chinese → English · 1 card/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    expect(screen.getByText('hello', { selector: '[aria-hidden="false"] .flash-word' })).toBeInTheDocument();
  });
});

describe('Card details and Back', () => {
  it('offers Details only on the answer side and Back resumes the same turned-over card', async () => {
    // The provider stays mounted (as at the app root) while the page leaves and returns.
    const page = (shown: boolean) => <FlashcardSessionProvider>{shown && <FlashcardsPage />}</FlashcardSessionProvider>;
    const view = render(page(true));
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Start · 1 card' }));
    expect(screen.queryByRole('link', { name: 'Open details for 你好' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    const details = screen.getByRole('link', { name: 'Open details for 你好' });
    expect(details).toHaveAttribute('href', '/vocabulary?word=hello&tab=word');
    fireEvent.click(details);
    expect(detailTrail.get()).toEqual([{ label: 'Flashcards', href: window.location.href }]);
    // Leaving for the details page and coming Back remounts the game.
    view.rerender(page(false));
    view.rerender(page(true));
    expect(screen.getByText('Card 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I knew it' })).toBeEnabled();
    expect(detailTrail.get()).toEqual([]);
  });
});

describe('Deck size', () => {
  it('preserves the active card when filters are applied or cleared', async () => {
    render(<FlashcardsPage/>);
    fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
    const current = screen.getByText('Card 1 of 10');
    openSettings();
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    await screen.findByRole('button', { name: 'Restart · 1 card' });
    expect(current).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await screen.findByRole('button', { name: 'Restart · 10 cards' });
    expect(current).toBeInTheDocument();
  });
  it('deals a capped deck by default and honours the deck-size selection', () => {
    render(<FlashcardsPage />);
    expect(screen.getByRole('button', { name: 'Start · 10 cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
    expect(screen.getByText('Card 1 of 10')).toBeInTheDocument();
    openSettings();
    fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
    expect(screen.getByRole('button', { name: 'Restart · 5 cards' })).toBeInTheDocument();
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

 it('applies filter changes immediately and clears immediately with X', async () => {
   render(<FlashcardsPage/>);
   fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
   expect(await screen.findByRole('button', { name: 'Start · 1 card' })).toBeInTheDocument();
   expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
   expect(await screen.findByRole('button', { name: 'Start · 10 cards' })).toBeInTheDocument();
  });

describe('Play bar and results', () => {
  it('hides the setup while playing and shows it again from the settings chip', () => {
    render(<FlashcardsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
    expect(screen.queryByRole('combobox', { name: 'Category' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All vocabulary · Chinese → English · 10 cards/ })).toBeInTheDocument();
    openSettings();
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
  });
  it('End before any answer goes straight back to the setup', () => {
    render(<FlashcardsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    expect(screen.getByRole('button', { name: 'Start · 10 cards' })).toBeInTheDocument();
  });
  it('End after an answer asks first, then shows results for the cards answered so far', async () => {
    render(<FlashcardsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start · 10 cards' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Still learning' }));
    await screen.findByText('Card 2 of 10');
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    expect(screen.getByText('End now?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    expect(screen.getByText('Card 2 of 10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, end' }));
    expect(screen.getByText('Session ended')).toBeInTheDocument();
    expect(screen.getByText(/1 of 10 reviewed · 1 still learning/)).toBeInTheDocument();
  });
  it('an unticked card is left out of the review round', async () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Greetings' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Start · 1 card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Still learning' }));
    expect(await screen.findByRole('button', { name: 'Review still learning (1)' })).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep 你好 for the next round' }));
    expect(screen.getByRole('button', { name: 'Review still learning (0)' })).toBeDisabled();
  });
});

describe('Last card and finish', () => {
  it('labels the last card, counts its miss at once and the results agree', async () => {
    render(<FlashcardsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Deck size' }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start · 5 cards' }));
    for (let card = 1; card <= 5; card++) {
      await screen.findByText(`Card ${card} of 5`);
      expect(screen.queryByText('Last card') !== null).toBe(card === 5);
      fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
      // Miss cards 2 and 5 (the last one).
      fireEvent.click(screen.getByRole('button', { name: card === 2 || card === 5 ? 'Still learning' : 'I knew it' }));
    }
    // The last miss counts before the results appear, and the answer buttons lock during the pause.
    expect(screen.getByText('2 still learning')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I knew it' })).toBeDisabled();
    expect(screen.queryByText('Session complete')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Session complete')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Review still learning (2)' })).toBeInTheDocument();
  });
});
