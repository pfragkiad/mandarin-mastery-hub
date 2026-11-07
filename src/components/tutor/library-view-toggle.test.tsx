import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultPreferences, type Preferences } from '@/lib/learning-preferences';
import { LibraryViewToggle } from './library-view-toggle';

let preferences: Preferences;
const setPreferences = vi.fn((next: Preferences) => { preferences = next; });
vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences, setPreferences }) }));
beforeEach(() => { preferences = { ...defaultPreferences }; setPreferences.mockClear(); });
afterEach(cleanup);

it('switches to list without changing the active hidden face or page size', () => {
  preferences = { ...preferences, cardReveal: 'hanzi', libraryPerPage: 20 };
  const view = render(<LibraryViewToggle/>);
  fireEvent.click(screen.getByRole('button', { name: 'List view' }));
  expect(preferences.libraryView).toBe('list');
  expect(preferences.cardReveal).toBe('hanzi');
  expect(preferences.libraryPerPage).toBe(20);
  view.rerender(<LibraryViewToggle/>);
  fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
  expect(preferences.libraryView).toBe('grid');
});