// Run with bun scripts/import-radical-strokes.ts. No glyph substitutions or guessed orders.
import { readFileSync, writeFileSync } from 'node:fs';
import { strokeNames } from '../src/lib/stroke-names';
import cnchar from 'cnchar';

// cnchar-order has no standalone entries for some radicals (宀, 冖, 冫, single-stroke
// 丨丶丿亅, traditional 見車馬…). Names below are verified against the 通用规范汉字表
// standard stroke naming and confirmed by the project author — never guessed.
const SUPPLEMENTS: Record<string, string[]> = {
  '宀': ['点', '点', '横钩'],
};
const SUPPLEMENT_SOURCE = '通用规范汉字表 standard stroke naming';

const spell = (name: string) => [...name].map(char => String(cnchar.spell(char, 'low', 'tone'))).join(' ');

const data = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
const records: Record<string, unknown> = {};
for (const [glyph, , , note] of data.radicals as string[][]) {
  if (!glyph) continue;
  const expected = Number(note?.match(/^(\d+) strokes?/)?.[1]);
  const supplement = SUPPLEMENTS[glyph];
  const names = await strokeNames(glyph) ?? supplement?.map(name => ({ name, pinyin: spell(name) })) ?? null;
  const valid = names && names.length === expected;
  records[glyph] = {
    strokes: valid ? names.map(stroke => ({ ...stroke, glyph: data.strokes.find((row: string[]) => row[3]?.split(' · ')[0] === stroke.name)?.[0] ?? null })) : [],
    status: valid ? 'recorded' : names ? 'count-mismatch' : 'unrecorded',
    ...(valid && supplement ? { source: SUPPLEMENT_SOURCE } : {}),
  };
}
writeFileSync('public/data/radical-strokes.json', JSON.stringify({ schemaVersion: 1, source: 'cnchar-order 3.2.6', records }, null, 2) + '\n');
console.log('Derived', Object.keys(records).length, 'exact radical records.');