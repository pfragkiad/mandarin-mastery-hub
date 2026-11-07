// Verifies the Hide button names the currently hidden card face and falls back
// to a neutral "Hide" label when nothing is hidden (reveal 'all').
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRevealToggle } from './card-reveal-toggle';
import type { Preferences } from '@/lib/learning-preferences';

const preferences: Preferences = { cardReveal: 'all' } as Preferences;
const setPreferences = vi.fn((next: Preferences) => { Object.assign(preferences, next); });

vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences, setPreferences }) }));

function renderToggle() {
  return render(<CardRevealToggle />);
}

beforeEach(() => {
  preferences.cardReveal = 'all';
  preferences.rememberCardReveals = false;
  setPreferences.mockClear();
});

describe('CardRevealToggle trigger label', () => {
  it('shows a neutral Hide label when nothing is hidden', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: /Hide/i }).textContent).toContain('Hide');
  });

  it('shows the hidden face name as a hidden state for each hide mode', () => {
    for (const [mode, label] of [['hanzi', 'Hanzi hidden'], ['meaning', 'Translation hidden'], ['pinyin', 'Pronunciation hidden']] as const) {
      preferences.cardReveal = mode;
      const { unmount } = renderToggle();
      expect(screen.getByRole('button', { name: label }).textContent).toContain(label);
      unmount();
    }
  });

});

describe('hidden-card preferences', () => {
  it('shortcut 4 selects combined pronunciation and translation hiding', () => {
    renderToggle();
    fireEvent.keyDown(window, { key: '4' });
    expect(preferences.cardReveal).toBe('pinyin-meaning');
  });
  it('remembering is available only in hidden modes and changes independently', () => {
    const { rerender } = renderToggle();
    expect(screen.queryByRole('button', { name: 'Remember revealed cards' })).toBeNull();
    preferences.cardReveal = 'pinyin-meaning';
    rerender(<CardRevealToggle/>);
    fireEvent.click(screen.getByRole('button', { name: 'Remember revealed cards' }));
    expect(preferences.rememberCardReveals).toBe(true);
    expect(preferences.cardReveal).toBe('pinyin-meaning');
  });
});
