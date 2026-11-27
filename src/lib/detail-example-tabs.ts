/** Shared URL identities for example drawers; invalid values never select content. */
export type ExampleTab = 'character' | 'word' | 'phrase' | 'idiom';
export type ExampleTabSearch = ExampleTab | 'off';
export function exampleTabSearch(value: unknown): ExampleTabSearch | undefined {
  return value === 'character' || value === 'word' || value === 'phrase' || value === 'idiom' || value === 'off' ? value : undefined;
}