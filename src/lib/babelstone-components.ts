export type BabelStoneComponent = {
  id: number; description: string | null; codePoint: number | null;
  suggestedSubstitution: string | null;
};
let definitions: Promise<Record<string, BabelStoneComponent>> | undefined;
/** Keep source identifiers opaque in trees; resolve presentation independently, on demand. */
export async function resolveBabelStoneComponent(token: string): Promise<BabelStoneComponent | null> {
  const match = /^\{(\d+)\}$/.exec(token);
  if (!match) return null;
  definitions ??= import('@/data/babelstone-components.json').then(data => data.default.components);
  return (await definitions)[match[1] ?? ''] ?? null;
}