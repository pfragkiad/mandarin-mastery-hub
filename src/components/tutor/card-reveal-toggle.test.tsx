// Verifies the Hide button names the current card-visibility state (the hidden face
// in single modes, the one shown face in the combined "Show only" modes), that every
// menu choice and keyboard shortcut writes the same preference value, and that the
// grid container gets the class the stylesheet keys its hiding rules on.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRevealToggle, cardRevealClass } from './card-reveal-toggle';
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

  it('names the single shown face in the combined modes', () => {
    for (const [mode, label] of [['pinyin-meaning', 'Hanzi only'], ['hanzi-pinyin', 'Translation only']] as const) {
      preferences.cardReveal = mode;
      const { unmount } = renderToggle();
      expect(screen.getByRole('button', { name: label }).textContent).toContain(label);
      unmount();
    }
  });

});

describe('hidden-card preferences', () => {
  it('Study preserves combined hiding and offers independent remembered reveals', () => {
    const { rerender } = render(<CardRevealToggle study/>);
    fireEvent.click(screen.getByRole('button', { name: 'Study' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show only Hanzi' }));
    expect(preferences.cardReveal).toBe('pinyin-meaning');
    rerender(<CardRevealToggle study/>);
    fireEvent.click(screen.getByRole('switch', { name: 'Remember revealed cards' }));
    expect(preferences.rememberCardReveals).toBe(true);
    expect(preferences.cardReveal).toBe('pinyin-meaning');
  });
  it('Study offers translation-only hiding (hanzi and pronunciation away)', () => {
    render(<CardRevealToggle study/>);
    fireEvent.click(screen.getByRole('button', { name: 'Study' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show only translation' }));
    expect(preferences.cardReveal).toBe('hanzi-pinyin');
  });
  it('shortcut 4 selects combined pronunciation and translation hiding', () => {
    renderToggle();
    fireEvent.keyDown(window, { key: '4' });
    expect(preferences.cardReveal).toBe('pinyin-meaning');
  });
  it('shortcut 5 selects translation-only hiding', () => {
    renderToggle();
    fireEvent.keyDown(window, { key: '5' });
    expect(preferences.cardReveal).toBe('hanzi-pinyin');
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

describe('cardRevealClass', () => {
  it('gives every hidden mode its own grid class and shows everything in Show all', () => {
    expect(cardRevealClass('all')).toBe('');
    expect(cardRevealClass('pinyin-meaning')).toBe('reveal-hide-pinyin-meaning');
    expect(cardRevealClass('hanzi-pinyin')).toBe('reveal-hide-hanzi-pinyin');
  });
});
