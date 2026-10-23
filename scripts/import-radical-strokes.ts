// Run with bun scripts/import-radical-strokes.ts. Exact forms only; no outline substitutions.
import { readFileSync, writeFileSync } from 'node:fs';
import { cncharStrokeNames } from '../src/lib/stroke-names';
import type { RadicalFamily, RadicalForm, RadicalStrokeRecord } from '../src/lib/radical-strokes';

const data = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
const input = JSON.parse(readFileSync('public/data/radical-families-source.json', 'utf8'));
if (input.schemaVersion !== '2.0.1' || input.radicals.length !== 214) throw new Error('Unexpected radical source version or family count');
const symbol = (name: string) => data.strokes.find((row: string[]) => row[3]?.split(' · ')[0] === name)?.[0] ?? null;
const records: Record<string, RadicalStrokeRecord> = {};
for (const [glyph, , , note] of data.radicals as string[][]) {
  const expected = Number(note?.match(/^(\d+) strokes?/)?.[1]);
  const names = await cncharStrokeNames(glyph);
  records[glyph] = { strokes: names?.length === expected ? names.map(stroke => ({ ...stroke, glyph: symbol(stroke.name) })) : [], status: names?.length === expected ? 'recorded' : names ? 'count-mismatch' : 'unrecorded', source: 'cnchar-order 3.2.6' };
}
const families: RadicalFamily[] = [];
for (const family of input.radicals) {
  const forms: RadicalForm[] = [];
  for (const [index, form] of family.forms.entries()) {
    let ambiguous = false;
    const strokes = (form.strokeSequence ?? []).map((code: string) => {
      const definition = input.strokeDefinitions[code];
      if (!definition) throw new Error(`Unknown stroke code ${code}`);
      const options = definition.names ?? [{ name: definition.name, pinyin: definition.pinyin }];
      if (options.length > 1 || options.some((option: { pinyin: string }) => /[\u3400-\u9fff]/u.test(option.pinyin))) ambiguous = true;
      const name = options.map((option: { name: string }) => option.name).join(' / ');
      return { name, pinyin: options.map((option: { pinyin: string }) => option.pinyin).join(' / '), glyph: definition.symbol ?? symbol(name) };
    });
    // Keep the existing exact-character correction of cnchar's conflated 乙/几 hook.
    const corrected = records[form.character];
    if (corrected?.status === 'recorded' && form.source.id === 'cnchar') {
      strokes.forEach((stroke: { name: string; pinyin: string; glyph: string | null }, index: number) => {
        const known = corrected.strokes[index];
        if (stroke.name === '横斜钩' && known?.name === '横折弯钩') Object.assign(stroke, known);
      });
    }
    const status = !strokes.length ? 'unrecorded' : strokes.length !== form.strokeCount ? 'count-mismatch' : form.status === 'derived' ? 'derived' : ambiguous || form.status.includes('ambiguous') ? 'ambiguous' : 'recorded';
    const record: RadicalStrokeRecord = { status, strokes: status === 'count-mismatch' ? [] : strokes, source: form.source.id === 'cnchar' ? 'cnchar-order 3.2.6' : 'cjklib · C-locale strokeorder', sourceStatus: form.status, provenance: form.source, officiallyVerified: form.officiallyVerified === true };
    const duplicate = forms.find(item => item.character === form.character && item.strokeCount === form.strokeCount && JSON.stringify(item.record.strokes) === JSON.stringify(strokes));
    if (duplicate) { duplicate.aliases = [...new Set([...duplicate.aliases, ...form.unicodeRadicalAliases])]; continue; }
    forms.push({ key: `${family.id}-${index}`, character: form.character, aliases: form.unicodeRadicalAliases, formKind: form.formKind, strokeCount: form.strokeCount, record });
  }
  const heading = data.radicals.find((row: string[]) => Number(row[3]?.match(/Radical #(\d+)/)?.[1]) === family.id);
  if (!heading) throw new Error(`Missing Kangxi family ${family.id}`);
  if (!forms.some(form => form.character === heading[0])) forms.unshift({ key: `${family.id}-kangxi`, character: heading[0], aliases: [], formKind: 'kangxi-heading', strokeCount: Number(heading[3]?.match(/^(\d+)/)?.[1]), record: records[heading[0]] });
  families.push({ id: family.id, canonical: family.canonical, kangxiHeading: heading[0], familyPinyin: family.familyPinyin, forms });
}
const grouped = new Map<string, RadicalForm[]>();
for (const family of families) for (const form of family.forms) grouped.set(form.character, [...(grouped.get(form.character) ?? []), form]);
const exactForms: Record<string, RadicalStrokeRecord> = {};
for (const [glyph, forms] of grouped) {
  const first = forms[0]; if (!first) continue;
  const same = forms.every(form => JSON.stringify(form.record.strokes) === JSON.stringify(first.record.strokes) && form.strokeCount === first.strokeCount);
  exactForms[glyph] = same ? first.record : { status: 'ambiguous', strokes: [], source: 'cjklib · conflicting exact-form records' };
  if (glyph in records) records[glyph] = exactForms[glyph];
}
writeFileSync('public/data/radical-strokes.json', JSON.stringify({ schemaVersion: 1, source: 'cnchar-order 3.2.6 · cjklib', sourceVersion: input.schemaVersion, sourceFile: '/data/radical-families-source.json', families, exactForms, records }, null, 2) + '\n');
console.log('Imported', families.length, 'families and', Object.keys(exactForms).length, 'exact forms; preserved', Object.keys(records).length, 'Kangxi cards.');