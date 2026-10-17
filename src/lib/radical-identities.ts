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

export function radicalSearchGlyphs(glyph: string): string[] {
  const identity = radicalIdentity(glyph);
  if (identity.kind !== 'canonical') return identity.equivalentGlyphs;
  return Object.values(catalog.radicalIdentities.identities)
    .filter(item => item.radicals.some(radical => radical.glyph === glyph))
    .map(item => item.glyph);
}