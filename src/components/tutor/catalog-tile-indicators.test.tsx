import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { CatalogTile } from './characters-page';
import { WorkspaceProvider } from './workspace';
import { libraryEntries, radicalVariantEntry, type LibraryEntry } from '@/lib/character-library';
import { radicalFamily } from '@/lib/radical-strokes';
import { TooltipProvider } from '@/components/ui/tooltip';

// jsdom has no ResizeObserver; the card only uses it to re-measure clipped text.
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { children?: ReactNode; to?: string; search?: Record<string, unknown> } & Record<string, unknown>) =>
    <a href={`${to ?? ''}${search ? `?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}` : ''}`} {...props}>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

afterEach(() => { cleanup(); });

/** Renders one grid card and waits until its own tile button is in the document. */
function shown(entry: LibraryEntry, kind: 'Radicals' | 'Characters') {
  render(<TooltipProvider><WorkspaceProvider><CatalogTile entry={entry} kind={kind} selected={false} onSelect={() => {}}/></WorkspaceProvider></TooltipProvider>);
  return waitFor(() => expect(screen.getByRole('button', { name: new RegExp(`^View ${entry.hanzi}`) })).toBeTruthy());
}

const radical = (index: number) => {
  const entry = libraryEntries('Radicals').find(item => item.kangxiIndex === index);
  if (!entry) throw new Error(`Missing radical ${index}`);
  return entry;
};

describe('Radical grid card badges', () => {
  // Every Kangxi family has at least one character in the catalogue, so the "In a character"
  // badge said nothing on radical cards (owner choice) while the breakdown badge stays.
  it('shows no "In a character" badge on a radical family card', async () => {
    await shown(radical(85), 'Radicals');
    expect(screen.queryByLabelText('In a character available')).toBeNull();
    expect(screen.queryByLabelText('In a phrase available')).toBeNull();
    expect(screen.getByLabelText('Decomposition available')).toBeTruthy();
  });

  it('shows no "In a character" badge on a separately saved radical variant card', async () => {
    const heading = radical(147);
    const form = radicalFamily(147)?.forms.find(item => item.character === '見');
    if (!form) throw new Error('Missing exact 見 form');
    await shown({ ...radicalVariantEntry(heading, form), radicalVariant: form.key }, 'Radicals');
    expect(screen.queryByLabelText('In a character available')).toBeNull();
  });

  // The badge itself is untouched for other kinds: a character still advertises its phrase.
  it('keeps the example badge on other kinds', async () => {
    const entry = libraryEntries('Characters').find(item => item.hanzi === '一');
    if (!entry) throw new Error('Missing character 一');
    await shown(entry, 'Characters');
    expect(screen.getByLabelText('In a phrase available')).toBeTruthy();
  });
});
