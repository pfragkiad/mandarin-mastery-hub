/** Per-character stroke names from cnchar-order's recorded stroke-order table.
 * Names are looked up by exact character, never inferred from stroke geometry.
 * Loaded lazily so the dictionary stays out of the page bundle. */
export type StrokeName = { name: string; pinyin: string };

type Cnchar = {
  use: (plugin: unknown) => void;
  hasPlugin: (name: string) => boolean;
  stroke: (word: string, ...args: string[]) => unknown;
  spell: (word: string, ...args: string[]) => unknown;
};

let cncharPromise: Promise<Cnchar> | null = null;
function loadCnchar(): Promise<Cnchar> {
  cncharPromise ??= Promise.all([import('cnchar'), import('cnchar-order')]).then(([cncharModule, orderModule]) => {
    const cnchar = (cncharModule.default ?? cncharModule) as unknown as Cnchar;
    const order = (orderModule.default ?? orderModule) as unknown;
    if (!cnchar.hasPlugin('order')) cnchar.use(order);
    return cnchar;
  });
  return cncharPromise;
}

/** Tone-marked pinyin with one syllable per character: 横折钩 → "héng zhé gōu". */
function spellName(cnchar: Cnchar, name: string): string {
  return [...name].map(char => String(cnchar.spell(char, 'low', 'tone'))).join(' ');
}

const cache = new Map<string, StrokeName[] | null>();

/** The recorded stroke names for one character, in writing order, or null when the table has no entry. */
export async function strokeNames(character: string): Promise<StrokeName[] | null> {
  const hit = cache.get(character);
  if (hit !== undefined) return hit;
  const cnchar = await loadCnchar();
  const raw = cnchar.stroke(character, 'order', 'name');
  const row = Array.isArray(raw) && Array.isArray(raw[0]) ? (raw[0] as string[]) : null;
  // Some entries record accepted alternates (斜钩|卧钩); show the primary name.
  const names = row?.length ? row.map(name => ({ name: name.split('|')[0] ?? name, pinyin: spellName(cnchar, name.split('|')[0] ?? name) })) : null;
  cache.set(character, names);
  return names;
}
