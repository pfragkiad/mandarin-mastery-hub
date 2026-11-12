import { catalog } from './catalog-store';
import { radicalFamily } from './radical-strokes';

export type RadicalLink = { id: string; number: number; glyph: string };
export type RadicalIdentity = {
  glyph: string;
  kind: 'canonical' | 'variant' | 'symbol' | 'unmapped';
  radicals: RadicalLink[];
  equivalentGlyphs: string[];
  sourceIds: string[];
};
/** A reviewed codepoint that recorded breakdowns write for several Kangxi families (阝 for
 *  邑 and 阜). `form` is the family's recorded radical-strokes form the glyph stands for;
 *  `positions` exists only where the export proved a contradiction-free positional rule. */
export type SharedRadicalForm = {
  glyph: string;
  families: { number: number; glyph: string; form: string }[];
  positions?: Record<string, number>;
  evidence: { declaredOccurrences: Record<string, number>; positionalOccurrences: number };
  basis: string;
};
export type RadicalIdentityFile = {
  schemaVersion: 1;
  sources: Record<string, { id: string; provider: string; version: string; checksum: string; license: string; source_url: string }>;
  identities: Record<string, RadicalIdentity>;
  sharedForms?: Record<string, SharedRadicalForm>;
};

/** Exact source identities, independent of dictionary assignment or record presence. */
export function radicalIdentity(glyph: string): RadicalIdentity {
  return catalog.radicalIdentities.identities[glyph] ?? { glyph, kind: 'unmapped', radicals: [], equivalentGlyphs: [], sourceIds: [] };
}

/** The glyph a breakdown tile draws for a source token. When the token's exact Kangxi
 *  identity names one family and that family's radical file lists the token as another
 *  Unicode code of one of its forms (⺝ and ⽉ are codes of 月's form; ⻖ of 阝), the tile
 *  shows that form's character so both source trees draw the same picture. Tokens that are
 *  their own recorded form (⺼, ⺮) or have no recorded alias keep their glyph. Display only:
 *  source trees, links and identities still use the token itself. */
export function breakdownDisplayGlyph(glyph: string): string {
  const identity = radicalIdentity(glyph);
  if (identity.radicals.length !== 1) return glyph;
  const form = radicalFamily(identity.radicals[0]!.number)?.forms.find(item => item.aliases.includes(glyph));
  return form?.character ?? glyph;
}

let searchVersion = -1;
let searchIndex: Record<string, string[]> = {};
export function radicalSearchGlyphs(glyph: string): string[] {
  if (searchVersion !== catalog.version) {
    searchIndex = {};
    for (const item of Object.values(catalog.radicalIdentities.identities)) {
      const equivalents = searchIndex[item.glyph] ?? [];
      equivalents.push(...item.equivalentGlyphs);
      searchIndex[item.glyph] = equivalents;
      for (const radical of item.radicals) {
        const forms = searchIndex[radical.glyph] ?? [];
        forms.push(item.glyph);
        searchIndex[radical.glyph] = forms;
      }
    }
    for (const key of Object.keys(searchIndex)) searchIndex[key] = [...new Set(searchIndex[key])];
    searchVersion = catalog.version;
  }
  return searchIndex[glyph] ?? [];
}