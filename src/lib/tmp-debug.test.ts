import { describe, it } from 'vitest';
import { searchAll } from './site-search';
import { words } from './mandarin';

describe('debug', () => {
  it('prints water hits', () => {
    const hits = searchAll(words, 'water');
    console.log('COUNT', hits.length);
    console.log(hits.slice(0, 25).map(h => `${h.kind}:${h.kind === 'Word' ? h.word.hanzi : h.hanzi}`).join(', '));
  });
});
