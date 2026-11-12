// Guards the phone font fix: the Words/Phrases font subsets must cover every character the
// vocabulary shows, and the handwritten/print stacks must use them before the sliced web fonts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const vocabulary = readFileSync('src/data/vocabulary.json', 'utf8');

function coverage(family: string): Set<number> {
  const face = css.match(new RegExp(`@font-face \\{ font-family: '${family}';[^}]*unicode-range: ([^;]+);`));
  if (!face?.[1]) throw new Error(`${family} @font-face missing`);
  const points = new Set<number>();
  for (const part of face[1].split(',')) {
    const [a, b] = part.trim().slice(2).split('-').map(h => parseInt(h, 16));
    for (let p = a!; p <= (b ?? a!); p++) points.add(p);
  }
  return points;
}

const hanzi = [...new Set(Array.from(vocabulary).filter(c => /\p{Script=Han}/u.test(c)))];

describe('vocabulary font subsets', () => {
  for (const family of ['Tutor Vocabulary Kai', 'Tutor Vocabulary Serif']) {
    it(`${family} covers every Words/Phrases character (rerun scripts/build-vocabulary-fonts.py if not)`, () => {
      const covered = coverage(family);
      expect(hanzi.filter(c => !covered.has(c.codePointAt(0)!))).toEqual([]);
    });
  }
  it('handwritten and print styles try the subsets before the sliced web fonts', () => {
    expect(css).toContain(":root[data-hanzi-font='handwritten'] { --font-hanzi: 'KaiTi', 'STKaiti', 'Tutor Vocabulary Kai', 'LXGW WenKai TC', 'Tutor Kai Extras', serif; }");
    expect(css).toContain(":root[data-hanzi-font='print'] { --font-hanzi: 'Tutor Vocabulary Serif', 'Noto Serif SC',");
  });
});
