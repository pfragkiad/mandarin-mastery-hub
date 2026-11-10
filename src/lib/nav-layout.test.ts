import { describe, expect, it } from 'vitest';
import { navCanPin, navHasMenuButton, navIsDocked, navSizeFor, readNavPinned } from './nav-layout';

describe('side menu per window size', () => {
  it('large windows can hide the menu; the hamburger appears only while it is hidden', () => {
    expect(navSizeFor(1975)).toBe('large');
    expect(navCanPin('large')).toBe(true);
    expect(navIsDocked('large', true)).toBe(true);
    expect(navHasMenuButton('large', true)).toBe(false);
    expect(navIsDocked('large', false)).toBe(false);
    expect(navHasMenuButton('large', false)).toBe(true);
  });
  it('medium windows can pin or hide the menu and keep the hamburger button', () => {
    expect(navSizeFor(1000)).toBe('medium');
    expect(navIsDocked('medium', true)).toBe(true);
    expect(navIsDocked('medium', false)).toBe(false);
    expect(navHasMenuButton('medium', true)).toBe(true);
    expect(navHasMenuButton('medium', false)).toBe(true);
    expect(navCanPin('medium')).toBe(true);
  });
  it('small windows never pin; the menu only opens from the hamburger button', () => {
    expect(navSizeFor(850)).toBe('small');
    expect(navIsDocked('small', true)).toBe(false);
    expect(navHasMenuButton('small', true)).toBe(true);
    expect(navCanPin('small')).toBe(false);
  });
  it('menus start pinned until hidden is remembered', () => {
    expect(readNavPinned({ getItem: () => null })).toBe(true);
    expect(readNavPinned({ getItem: () => 'false' })).toBe(false);
  });
});
