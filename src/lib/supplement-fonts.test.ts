// Guards the breakdown font fix: radical forms such as ⺝ (U+2E9D) are outside every Google
// Fonts slice, so each character style needs its "Extras" face (scripts/build-supplement-fonts.py)
// listed right after its Google family, or those parts fall back to the system font.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

/** Union of the unicode-ranges of every @font-face rule for `family` (extras ship as two files). */
function coverage(family: string): Set<number> {
  const points = new Set<number>();
  for (const face of css.matchAll(new RegExp(`@font-face \\{ font-family: '${family}';[^}]*unicode-range: ([^;]+);`, 'g'))) {
    for (const part of face[1]!.split(',')) {
      const [a, b] = part.trim().slice(2).split('-').map(h => parseInt(h, 16));
      for (let p = a!; p <= (b ?? a!); p++) points.add(p);
    }
  }
  return points;
}

describe('extras font faces', () => {
  for (const family of ['Tutor Kai Extras', 'Tutor Serif Extras', 'Tutor Sans Extras']) {
    it(`${family} draws the moon radical form ⺝ and the Kangxi moon ⽉`, () => {
      const covered = coverage(family);
      expect(covered.has(0x2e9d)).toBe(true);
      expect(covered.has(0x2f49)).toBe(true);
    });
  }
  it('each character style lists its extras face right after its Google family', () => {
    expect(css).toContain("--font-hanzi: 'Noto Sans SC', 'Tutor Sans Extras',");
    expect(css).toContain("'LXGW WenKai TC', 'Tutor Kai Extras', serif; }");
    expect(css).toContain("'Noto Serif SC', 'Tutor Serif Extras',");
  });
});
