import { readCatalog } from '@/test/catalog-fixture';
import { beforeAll, it } from 'vitest';
import fs from 'fs';
import { hydrateCatalog } from './catalog-store';
import { hydrateUsageOrder } from './usage-frequency';
import { libraryEntries } from './character-library';
import { radicalFamily } from './radical-strokes';
import { gSourceDecompositions } from './character-enrichment';
import { readEnrichment } from '@/test/enrichment-fixture';
const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
beforeAll(() => { hydrateUsageOrder(read('usage-order.json')); hydrateCatalog(readCatalog(), read('radical-identities.json'), read('radical-strokes.json')); });
const tokens = (n: any, out: string[] = []) => { out.push(n.glyph); n.children?.forEach((c: any) => tokens(c, out)); return out; };
it('audit', async () => {
  const out: string[] = [];
  for (const id of [96, 9, 145, 58, 140]) {
    const fam = radicalFamily(id)!;
    out.push(`#${id} ${fam.kangxiHeading} forms: ${fam.forms.map(f => `${f.character}(${f.key ?? ''}) U+${f.character.codePointAt(0)!.toString(16)}`).join(', ')}`);
    const forms = new Set(fam.forms.map(f => f.character));
    const cands = libraryEntries('Characters').filter(p => p.note.match(/·\s*(.+?) radical$/)?.[1] === fam.kangxiHeading);
    const counts = new Map<string, string[]>();
    for (const c of cands) {
      const trees = gSourceDecompositions(await readEnrichment(c.hanzi)).flatMap(a => a.tree ? [a.tree] : []);
      const all = trees.flatMap(t => tokens(t).slice(1));
      if (all.some(t => forms.has(t))) continue;
      for (const t of new Set(all)) { const l = counts.get(t) ?? []; l.push(c.hanzi); counts.set(t, l); }
    }
    out.push(`  unmatched candidates: ${cands.length}; top tokens: ` + [...counts].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([t, l]) => `${t} U+${t.codePointAt(0)!.toString(16)} ×${l.length} (${l.slice(0, 5).join('')})`).join(' | '));
  }
  fs.writeFileSync('/tmp/audit/out.txt', out.join('\n'));
}, 120000);
