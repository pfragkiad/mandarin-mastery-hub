import { catalog } from './catalog-store';

export type RadicalLink = { id: string; number: number; glyph: string };
export type RadicalIdentity = {
  glyph: string;
  kind: 'canonical' | 'variant' | 'symbol' | 'unmapped';
  radicals: RadicalLink[];
  equivalentGlyphs: string[];
  sourceIds: string[];
};
export type RadicalIdentityFile = {
  schemaVersion: 1;
  sources: Record<string, { id: string; provider: string; version: string; checksum: string; license: string; source_url: string }>;
  identities: Record<string, RadicalIdentity>;
};

/** Exact source identities, independent of dictionary assignment or record presence. */
export function radicalIdentity(glyph: string): RadicalIdentity {
  return catalog.radicalIdentities.identities[glyph] ?? { glyph, kind: 'unmapped', radicals: [], equivalentGlyphs: [], sourceIds: [] };
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