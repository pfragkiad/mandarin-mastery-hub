import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { words } from '@/lib/mandarin';

/**
 * The Apply button in both search boxes appears only while there is something
 * valid and new to search: never for an empty box, never for a lone Latin
 * letter on the Start page, and never again once the current draft is applied.
 * This mirrors the library filter bars, where Apply only appears for a changed
 * draft. Router, workspace and the heavy Start-page cards are mocked so the
 * test exercises the button's visibility rule alone.
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, ...props }: { to: string; search: Record<string, string>; children: React.ReactNode }) => <a href={`${to}?${new URLSearchParams(search)}`} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
}));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ items: words, saved: [], preferences: { includeTraditional: false }, catalogVersion: 1 }) }));
vi.mock('@/lib/character-library', async importOriginal => ({ ...(await importOriginal<object>()), libraryDestination: () => null }));
// Long result lists render through an IntersectionObserver sentinel that jsdom lacks.
vi.mock('./incremental-list', () => ({ IncrementalList: ({ items }: { items: React.ReactNode[] }) => <>{items}</> }));
// The Start page's hero/discovery/games cards are irrelevant to the search box.
vi.mock('./overview-hero', () => ({ DailyCharacterHero: () => null, SavedStrip: () => null }));
vi.mock('./overview-discovery', () => ({ DiscoveryTile: () => null }));
vi.mock('./overview-sound', () => ({ SoundDiscoveryTile: () => null }));
vi.mock('./overview-games', () => ({ OverviewGames: () => null }));

import { GlobalSearch } from './global-search';
import { OverviewSearch } from './overview';

afterEach(cleanup);

describe('Apply appears only for valid input', () => {
  it('keeps Apply out of the Start page box until the query is searchable', () => {
    render(<OverviewSearch items={words} includeTraditional={false} catalogVersion={1}/>);
    const input = screen.getByRole('textbox', { name: 'Search the library' });
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    // A lone Latin letter is never searched, so it must not offer Apply.
    fireEvent.change(input, { target: { value: 'c' } });
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'ca' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('offers Apply for a single hanzi and hides it once the search is applied', () => {
    render(<OverviewSearch items={words} includeTraditional={false} catalogVersion={1}/>);
    const input = screen.getByRole('textbox', { name: 'Search the library' });
    fireEvent.change(input, { target: { value: '水' } });
    const apply = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(apply);
    // Nothing new left to apply, so the button steps aside (Enter opens the first result).
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '水水' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('keeps Apply out of the Search everything window until the box has text', () => {
    render(<GlobalSearch open onOpenChange={vi.fn()}/>);
    const input = screen.getByRole('textbox', { name: 'Search everything' });
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'water' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });
});
