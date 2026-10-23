// Run with bun scripts/import-radical-strokes.ts. No glyph substitutions or guessed orders.
import { readFileSync, writeFileSync } from 'node:fs';
import { strokeNames } from '../src/lib/stroke-names';
import { RADICAL_STROKE_SUPPLEMENTS, RADICAL_STROKE_SUPPLEMENT_SOURCE } from '../src/lib/radical-stroke-supplements';

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