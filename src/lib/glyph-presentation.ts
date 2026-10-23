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

/** Preserve exact record IDs and library membership; separate lexical readings from names. */
export function glyphPresentation(glyph: string, kind: string, pinyin = '', meaning = '') {
  const codePoint = glyph.codePointAt(0);
  const single = Array.from(glyph).length === 1;
  const supplement = single && codePoint !== undefined && codePoint >= 0x2e80 && codePoint <= 0x2eff;
  const kangxiSymbol = single && codePoint !== undefined && codePoint >= 0x2f00 && codePoint <= 0x2fd5;
  const identity = radicalIdentity(glyph);
  const reviewed = descriptions[glyph];
  const component = supplement || kangxiSymbol || identity.kind === 'variant';
  const variant = reviewed ? reviewed.variant : component && (identity.kind === 'variant' || identity.radicals.length > 0);
  const label = kind === 'Strokes' || kind === 'Stroke' ? 'Stroke' : component ? variant ? 'Component variant' : 'Component' : kind.replace(/s$/, '');
  const componentName = component ? reviewed?.name : undefined;
  const characterPinyin = component ? '' : pinyin;
  return {
    label, component, componentName, characterPinyin,
    reading: componentName?.pinyin ?? characterPinyin,
    readingFallback: component ? 'Component name not recorded' : 'Pinyin not recorded',
    meaning: component ? reviewed?.meaning ?? (identity.radicals.length ? `Component form of ${identity.radicals.map(item => item.glyph).join(' / ')}` : 'Component form; meaning not recorded') : meaning,
    speech: component ? componentName?.text ?? null : glyph,
    codePoint: codePoint === undefined ? '' : `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
    source: supplement || kangxiSymbol ? `Unicode NamesList 17.0.0${reviewed ? ` · ${reviewed.unicodeName}` : ''}${componentName ? ` · ${componentName.source}` : ''}` : component ? 'Unicode UCD/Unihan 17.0.0 exact radical identity' : null,
  };
}