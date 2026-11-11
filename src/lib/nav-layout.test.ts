import { describe, expect, it } from 'vitest';
import { navModeFor, navSizeFor, phoneTabFor, readNavExpanded } from './nav-layout';

describe('side menu per window size', () => {
  it('windows wider than 850px never use the drawer: full menu or slim icon strip', () => {
    expect(navSizeFor(851)).toBe('wide');
    expect(navSizeFor(1000)).toBe('wide');
    expect(navSizeFor(2486)).toBe('wide');
    expect(navModeFor('wide', true)).toBe('full');
    expect(navModeFor('wide', false)).toBe('rail');
  });
  it('phones (850px and below) always use the drawer, whatever was saved', () => {
    expect(navSizeFor(850)).toBe('phone');
    expect(navModeFor('phone', true)).toBe('drawer');
    expect(navModeFor('phone', false)).toBe('drawer');
  });
  it('the menu starts full until the icon strip is remembered', () => {
    expect(readNavExpanded({ getItem: () => null })).toBe(true);
    expect(readNavExpanded({ getItem: () => 'false' })).toBe(false);
  });
});

describe('phone tab bar', () => {
  it('lights Glyphs, Vocabulary, Games (both games) and Pinyin for their pages', () => {
    expect(phoneTabFor('/characters')).toBe('glyphs');
    expect(phoneTabFor('/vocabulary')).toBe('vocabulary');
    expect(phoneTabFor('/flashcards')).toBe('games');
    expect(phoneTabFor('/drawing')).toBe('games');
    expect(phoneTabFor('/pinyin')).toBe('pinyin');
  });
  it('the three Pinyin quizzes light Games, so Games covers all five games', () => {
    expect(phoneTabFor('/pinyin', 'tones')).toBe('games');
    expect(phoneTabFor('/pinyin', 'alikes')).toBe('games');
    expect(phoneTabFor('/pinyin', 'type')).toBe('games');
    expect(phoneTabFor('/pinyin', null)).toBe('pinyin');
  });
  it('Start has its own tab, Settings sits under More, Practice claims no tab', () => {
    expect(phoneTabFor('/')).toBe('start');
    expect(phoneTabFor('/settings')).toBe('more');
    expect(phoneTabFor('/strokes')).toBeNull();
  });
});
