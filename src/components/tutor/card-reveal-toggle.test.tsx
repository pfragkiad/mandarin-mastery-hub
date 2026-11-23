// Verifies the grids' Hanzi · Pinyin · EN buttons (shared FaceToggles) write the grids' own
// cardReveal preference, that the last shown face cannot be switched off, that the phone
// Study sheet and chip use the same rules, that keyboard shortcuts flip or jump the same
// values, and that the grid container gets the class the stylesheet keys its hiding rules on.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRevealToggle, cardRevealClass } from './card-reveal-toggle';
import type { Preferences } from '@/lib/learning-preferences';

const preferences: Preferences = { cardReveal: 'all' } as Preferences;
const setPreferences = vi.fn((next: Preferences) => { Object.assign(preferences, next); });

vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences, setPreferences }) }));

beforeEach(() => {
  preferences.cardReveal = 'all';
  preferences.rememberCardReveals = false;
  delete preferences.lessonFaces;
  setPreferences.mockClear();
});

const face = (name: 'Hanzi' | 'Pinyin' | 'EN') => screen.getByRole('button', { name: new RegExp(`^(汉|pīn)?\\s*${name}$`) });

describe('grid Hanzi · Pinyin · EN buttons', () => {
  it('turning EN off hides the translation; turning pinyin off too leaves hanzi only', () => {
    const { rerender } = render(<CardRevealToggle/>);
    fireEvent.click(face('EN'));
    expect(preferences.cardReveal).toBe('meaning');
    rerender(<CardRevealToggle/>);
    fireEvent.click(face('Pinyin'));
    expect(preferences.cardReveal).toBe('pinyin-meaning');
  });

  it('hanzi and translation off is pinyin only', () => {
    preferences.cardReveal = 'meaning';
    render(<CardRevealToggle/>);
    fireEvent.click(face('Hanzi'));
    expect(preferences.cardReveal).toBe('hanzi-meaning');
  });

  it('the last shown face cannot be switched off', () => {
    preferences.cardReveal = 'hanzi-pinyin';
    render(<CardRevealToggle/>);
    fireEvent.click(face('EN'));
    expect(setPreferences).not.toHaveBeenCalled();
    expect(face('EN').getAttribute('aria-disabled')).toBe('true');
  });

  it('never touches the lessons\' own saved choice', () => {
    render(<CardRevealToggle/>);
    fireEvent.click(face('Hanzi'));
    expect(preferences.lessonFaces).toBeUndefined();
  });

  it('remembering is available only in hidden modes and changes independently', () => {
    const { rerender } = render(<CardRevealToggle/>);
    expect(screen.queryByRole('button', { name: 'Remember revealed cards' })).toBeNull();
    preferences.cardReveal = 'pinyin-meaning';
    rerender(<CardRevealToggle/>);
    fireEvent.click(screen.getByRole('button', { name: 'Remember revealed cards' }));
    expect(preferences.rememberCardReveals).toBe(true);
    expect(preferences.cardReveal).toBe('pinyin-meaning');
  });
});

describe('phone Study sheet', () => {
  it('uses the same buttons and offers remembered reveals once something is hidden', () => {
    const { rerender } = render(<CardRevealToggle study/>);
    fireEvent.click(screen.getByRole('button', { name: 'Study' }));
    fireEvent.click(face('Pinyin'));
    expect(preferences.cardReveal).toBe('pinyin');
    rerender(<CardRevealToggle study/>);
    fireEvent.click(screen.getByRole('switch', { name: 'Remember revealed cards' }));
    expect(preferences.rememberCardReveals).toBe(true);
  });

  it('the chip names the state and its X shows all again', () => {
    preferences.cardReveal = 'hanzi-meaning';
    render(<CardRevealToggle study/>);
    fireEvent.click(screen.getByRole('button', { name: 'Pinyin only — show all' }));
    expect(preferences.cardReveal).toBe('all');
  });
});

describe('keyboard shortcuts', () => {
  it('1 / 2 / 3 flip translation / hanzi / pinyin', () => {
    render(<CardRevealToggle/>);
    fireEvent.keyDown(window, { key: '1' });
    expect(preferences.cardReveal).toBe('meaning');
    fireEvent.keyDown(window, { key: '3' });
    expect(preferences.cardReveal).toBe('pinyin-meaning');
    fireEvent.keyDown(window, { key: '1' });
    expect(preferences.cardReveal).toBe('pinyin');
  });

  it('4 / 5 / 6 jump to hanzi only / translation only / pinyin only, 0 shows all', () => {
    render(<CardRevealToggle/>);
    fireEvent.keyDown(window, { key: '4' });
    expect(preferences.cardReveal).toBe('pinyin-meaning');
    fireEvent.keyDown(window, { key: '5' });
    expect(preferences.cardReveal).toBe('hanzi-pinyin');
    fireEvent.keyDown(window, { key: '6' });
    expect(preferences.cardReveal).toBe('hanzi-meaning');
    fireEvent.keyDown(window, { key: '0' });
    expect(preferences.cardReveal).toBe('all');
  });
});

describe('cardRevealClass', () => {
  it('gives every hidden mode its own grid class and shows everything in Show all', () => {
    expect(cardRevealClass('all')).toBe('');
    expect(cardRevealClass('pinyin-meaning')).toBe('reveal-hide-pinyin-meaning');
    expect(cardRevealClass('hanzi-meaning')).toBe('reveal-hide-hanzi-meaning');
  });
});
