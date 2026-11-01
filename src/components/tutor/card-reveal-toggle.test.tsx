// Verifies the Hide button names the currently hidden card face and falls back
// to a neutral "Hide" label when nothing is hidden (reveal 'all').
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardRevealToggle } from './card-reveal-toggle';
import type { Preferences } from '@/lib/learning-preferences';

const preferences: Preferences = { cardReveal: 'all' } as Preferences;
const setPreferences = vi.fn((next: Preferences) => { preferences.cardReveal = next.cardReveal; });

vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences, setPreferences }) }));

function renderToggle() {
  return render(<CardRevealToggle />);
}

beforeEach(() => {
  preferences.cardReveal = 'all';
  setPreferences.mockClear();
});

describe('CardRevealToggle trigger label', () => {
  it('shows a neutral Hide label when nothing is hidden', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: /Hide/i }).textContent).toContain('Hide');
  });

  it('shows the hidden face name for each hide mode', () => {
    for (const [mode, label] of [['hanzi', 'Hanzi'], ['meaning', 'Translation'], ['pinyin', 'Pronunciation']] as const) {
      preferences.cardReveal = mode;
      const { unmount } = renderToggle();
      expect(screen.getByRole('button').textContent).toContain(label);
      unmount();
    }
  });

});
