import { describe, expect, it } from 'vitest';
import { navCanPin, navHasMenuButton, navIsDocked, navSizeFor, readNavPinned } from './nav-layout';

describe('side menu per window size', () => {
  it('large windows always show the menu, even if hidden was chosen on a medium window', () => {
    expect(navSizeFor(1975)).toBe('large');
    expect(navIsDocked('large', false)).toBe(true);
    expect(navHasMenuButton('large')).toBe(false);
    expect(navCanPin('large')).toBe(false);
  });
  it('medium windows can pin or hide the menu and keep the hamburger button', () => {
    expect(navSizeFor(1000)).toBe('medium');
    expect(navIsDocked('medium', true)).toBe(true);
    expect(navIsDocked('medium', false)).toBe(false);
    expect(navHasMenuButton('medium')).toBe(true);
    expect(navCanPin('medium')).toBe(true);
  });
  it('small windows never pin; the menu only opens from the hamburger button', () => {
    expect(navSizeFor(850)).toBe('small');
    expect(navIsDocked('small', true)).toBe(false);
    expect(navHasMenuButton('small')).toBe(true);
    expect(navCanPin('small')).toBe(false);
  });
  it('medium windows start pinned until hidden is remembered', () => {
    expect(readNavPinned({ getItem: () => null })).toBe(true);
    expect(readNavPinned({ getItem: () => 'false' })).toBe(false);
  });
});
