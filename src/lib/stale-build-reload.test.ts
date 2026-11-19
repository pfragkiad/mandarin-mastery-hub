import { describe, expect, it } from 'vitest';
import { isStaleBuildError, RELOAD_WINDOW_MS, shouldReload } from './stale-build-reload';

describe('stale build recovery', () => {
  it('recognises the missing old page file error from the report', () => {
    expect(isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: https://x.lovable.app/assets/characters-CLMMC_td.js'))).toBe(true);
  });
  it('ignores ordinary runtime errors', () => {
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
  it('reloads at most once within the window so a truly missing file cannot loop', () => {
    expect(shouldReload(null, 1_000_000)).toBe(true);
    expect(shouldReload(1_000_000, 1_000_000 + RELOAD_WINDOW_MS - 1)).toBe(false);
    expect(shouldReload(1_000_000, 1_000_000 + RELOAD_WINDOW_MS + 1)).toBe(true);
  });
});
