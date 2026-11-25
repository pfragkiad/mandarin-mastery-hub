/**
 * External example-phrase searches offered from the detail card's action row.
 *
 * These are plain search links to third-party sites — nothing is fetched, imported or
 * stored, so no external sentence ever becomes a recorded example in the catalogue.
 * The exact written form (hanzi) is the only query; readings or meanings are never
 * sent, so the site's results stay a search for that written word/character.
 */
export interface ExternalExampleSource { name: string; url: string }

/** Purple Culture's sample-sentence search for one exact written form. */
export const purpleCultureExamplesUrl = (hanzi: string): string =>
  `https://www.purpleculture.net/sample-sentences/?word=${encodeURIComponent(hanzi.trim())}`;

/** Sites to search for more examples, in display order. Empty for a blank form. */
export function externalExampleSources(hanzi: string): ExternalExampleSource[] {
  if (!hanzi.trim()) return [];
  return [{ name: 'Purple Culture', url: purpleCultureExamplesUrl(hanzi) }];
}
