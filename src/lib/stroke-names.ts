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

// cnchar-order conflates two distinct hook strokes under one entry named 横斜钩 (shape ⺄):
// the true 横斜钩 (飞, 气, 风…) and the 横折弯钩 (乙, 九, 几…). Standard stroke naming
// (通用规范汉字表) records the characters below with 横折弯钩, so we correct them here.
const HENG_ZHE_WAN_GOU = new Set([
  '乙', '九', '乞', '亿', '丸', '几', '凡', '卂', '讯', '迅', '执', '芄', '纨',
  '究', '仇', '轨', '艺', '忆', '屹', '疙', '叽', '饥', '肌', '机', '矶',
  '朵', '垛', '跺', '躲', '剁', '壳', '亮', '亳', '虼', '汔', '矻',
]);
const HENG_XIE_GOU = '横斜钩';
const HENG_ZHE_WAN_GOU_NAME = '横折弯钩';

const cache = new Map<string, StrokeName[] | null>();

/** The recorded stroke names for one character, in writing order, or null when the table has no entry. */
export async function strokeNames(character: string): Promise<StrokeName[] | null> {
  const hit = cache.get(character);
  if (hit !== undefined) return hit;
  const cnchar = await loadCnchar();
  const raw = cnchar.stroke(character, 'order', 'name');
  const row = Array.isArray(raw) && Array.isArray(raw[0]) ? (raw[0] as string[]) : null;
  // Some entries record accepted alternates (斜钩|卧钩); show the primary name.
  let names = row?.length ? row.map(name => {
    let primary = name.split('|')[0] ?? name;
    if (primary === HENG_XIE_GOU && HENG_ZHE_WAN_GOU.has(character)) primary = HENG_ZHE_WAN_GOU_NAME;
    return { name: primary, pinyin: spellName(cnchar, primary) };
  }) : null;
  // Radicals cnchar-order lacks standalone fall back to the verified supplement table.
  names ??= RADICAL_STROKE_SUPPLEMENTS[character]?.map(name => ({ name, pinyin: spellName(cnchar, name) })) ?? null;
  cache.set(character, names);
  return names;
}

/** Split a multi-syllable pinyin name into two balanced lines for the stroke chips. */
export function splitPinyinLines(pinyin: string): string[] {
  const words = pinyin.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words;
  const k = Math.ceil(words.length / 2);
  return [words.slice(0, k).join(" "), words.slice(k).join(" ")];
}
