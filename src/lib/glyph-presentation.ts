import { radicalIdentity } from './radical-identities';

// Exact Unicode 17.0 NamesList entries; never classify from appearance or missing pinyin.
// https://www.unicode.org/Public/17.0.0/ucd/NamesList.txt
const descriptions: Record<string, { unicodeName: string; meaning: string; variant: boolean; name?: { text: string; pinyin: string; source: string } }> = {
  '⺀': { unicodeName: 'CJK RADICAL REPEAT', meaning: 'Two-dot component; Unicode radical repeat', variant: false },
  '⺈': { unicodeName: 'CJK RADICAL KNIFE ONE', meaning: 'Top-position knife component (刀 family)', variant: true, name: { text: '斜刀头', pinyin: 'xiédāotóu', source: 'User-reviewed component name' } },
  '⺊': { unicodeName: 'CJK RADICAL DIVINATION', meaning: 'Top-position component of 卜', variant: true },
  '⺌': { unicodeName: 'CJK RADICAL SMALL ONE', meaning: 'Top-position component of 小', variant: true },
  '⺍': { unicodeName: 'CJK RADICAL SMALL TWO', meaning: 'Top-position component of 小', variant: true },
  '⺗': { unicodeName: 'CJK RADICAL HEART TWO', meaning: 'Bottom-position heart component (心 family)', variant: true },
  '⺮': { unicodeName: 'CJK RADICAL BAMBOO', meaning: 'Bamboo component (竹 family)', variant: true, name: { text: '竹头', pinyin: 'zhútóu', source: 'User-reviewed component name' } },
};

// Identity-variant glyphs that are also recorded ordinary characters — each carries a
// lexical reading in the imported characters dataset (Make Me a Hanzi). In the Characters
// tab they present as the characters they are; in the Components tab (and Practice) the
// same record presents as a component variant of its radical family.
const DUAL_CHARACTERS = new Set(['么', '卤', '巳', '户', '西', '见', '贝', '车', '长', '门', '青', '韦', '页', '风', '飞', '马', '鱼', '鸟', '麦', '黄', '黾', '齐', '齿', '龙', '龟']);

/** A form that only ever exists as a component: Unicode radical-block symbols and
 * radical forms without a recorded lexical reading. The Components tab already holds
 * every one of these records, so the Characters tab never repeats them. */
export function pureComponentForm(glyph: string): boolean {
  const codePoint = glyph.codePointAt(0);
  if (Array.from(glyph).length !== 1 || codePoint === undefined) return false;
  if (codePoint >= 0x2e80 && codePoint <= 0x2eff) return true; // CJK Radicals Supplement
  if (codePoint >= 0x2f00 && codePoint <= 0x2fd5) return true; // Kangxi Radicals
  return radicalIdentity(glyph).kind === 'variant' && !DUAL_CHARACTERS.has(glyph);
}

/** Preserve exact record IDs and library membership; separate lexical readings from names. */
export function glyphPresentation(glyph: string, kind: string, pinyin = '', meaning = '') {
  const codePoint = glyph.codePointAt(0);
  const single = Array.from(glyph).length === 1;
  const supplement = single && codePoint !== undefined && codePoint >= 0x2e80 && codePoint <= 0x2eff;
  const kangxiSymbol = single && codePoint !== undefined && codePoint >= 0x2f00 && codePoint <= 0x2fd5;
  const identity = radicalIdentity(glyph);
  const reviewed = descriptions[glyph];
  const dualGlyph = !supplement && !kangxiSymbol && identity.kind === 'variant' && DUAL_CHARACTERS.has(glyph);
  const pureForm = supplement || kangxiSymbol || (identity.kind === 'variant' && !dualGlyph);
  // Pure forms keep component presentation everywhere; dual forms only take the component
  // role where the record is browsed as a component.
  const component = pureForm || (dualGlyph && (kind === 'Components' || kind === 'Component'));
  const variant = reviewed ? reviewed.variant : component && (identity.kind === 'variant' || identity.radicals.length > 0);
  const label = kind === 'Strokes' || kind === 'Stroke' ? 'Stroke' : component ? (variant ? 'Component variant' : 'Component') : kind.replace(/s$/, '');
  const componentName = pureForm ? reviewed?.name : undefined;
  const characterPinyin = pureForm ? '' : pinyin;
  return {
    label, component, componentName, characterPinyin,
    reading: componentName?.pinyin ?? characterPinyin,
    readingFallback: component ? 'Component name not recorded' : 'Pinyin not recorded',
    meaning: pureForm ? reviewed?.meaning ?? (identity.radicals.length ? `Component form of ${identity.radicals.map(item => item.glyph).join(' / ')}` : 'Component form; meaning not recorded') : meaning,
    speech: pureForm ? componentName?.text ?? null : glyph,
    codePoint: codePoint === undefined ? '' : `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
    source: pureForm ? `Unicode NamesList 17.0.0${reviewed ? ` · ${reviewed.unicodeName}` : ''}${componentName ? ` · ${componentName.source}` : ''}` : null,
  };
}
