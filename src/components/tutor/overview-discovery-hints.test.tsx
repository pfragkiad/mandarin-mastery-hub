import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { words } from '@/lib/mandarin';

// Exercise Start's real WordCard and shared hint popup with library hints off;
// router navigation is observed so a glyph click cannot accidentally open Details.
const navigate = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search: _search, ...props }: { children: ReactNode; to: string; search?: unknown }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/', search: {}, state: {} }),
}));
vi.mock('./workspace', () => ({ useWorkspace: () => ({
  items: words.filter(word => word.hanzi === '你好'), saved: [], toggleSaved: vi.fn(),
  preferences: { libraryView: 'grid', pinyin: true, meaning: true, gridHints: false, lessonHints: false },
  catalogVersion: 0,
}) }));

import { DiscoveryTile } from './overview-discovery';

afterEach(() => { cleanup(); navigate.mockClear(); });

describe('Start grid character hints', () => {
  it('opens and closes a glyph quick card without navigating, even with library hints off', () => {
    render(<DiscoveryTile category="word"/>);
    fireEvent.click(screen.getByRole('button', { name: '你: quick card' }));
    expect(screen.getByRole('dialog', { name: 'Quick card for 你' })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Quick card for 你' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Quick card for 你' })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});