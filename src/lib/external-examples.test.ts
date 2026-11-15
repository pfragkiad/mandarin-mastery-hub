import { describe, expect, it } from 'vitest';
import { externalExampleSources, purpleCultureExamplesUrl } from './external-examples';

describe('external example searches', () => {
  it('searches Purple Culture sample sentences for 和', () => {
    expect(decodeURI(purpleCultureExamplesUrl('和'))).toBe('https://www.purpleculture.net/sample-sentences/?word=和');
  });
  it('offers no search for a blank form', () => {
    expect(externalExampleSources('  ')).toEqual([]);
  });
});
