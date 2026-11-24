import { useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';
import { alignPhrasePinyin } from '@/lib/phrase-pinyin-align';
import { useSyllableInventory } from './use-syllable-inventory';

/**
 * Character ↔ syllable hover pairing for a phrase headword (phrase cards' hanzi box and
 * the phrase detail heading), matching the "In a sentence" cross-highlight: hovering a
 * character draws a small ring around its pinyin syllable and vice versa; leaving either
 * side removes it.
 * Inputs: the recorded hanzi and pinyin, and `enabled` (phrases only).
 * State: the hovered pair index. The pairing itself comes from alignPhrasePinyin over the
 * lazily loaded syllable inventory and fails closed — until the inventory loads, for a
 * headword containing whitespace (unless `allowSpaces`: lesson patterns such as
 * "再 + 动词 + 一次"), or for an ambiguous spelling, `glyph`/`pinyin` render
 * the plain recorded text.
 * `groups` (optional, one key per Array.from(hanzi) index): glyphs sharing a key — the lessons'
 * identified words — ring together with all their syllables, so 对不起 lights as one word.
 */
export function usePhrasePairing(hanzi: string, pinyin: string | null | undefined, enabled: boolean, allowSpaces = false, groups?: readonly (number | null)[]) {
  const syllables = useSyllableInventory();
  const inventory = useMemo(() => (syllables ? new Set(syllables.map(s => s.base)) : null), [syllables]);
  const pairing = useMemo(
    () => (enabled && inventory && pinyin && (allowSpaces || !/\s/.test(hanzi)) ? alignPhrasePinyin(hanzi, pinyin, inventory) : null),
    [enabled, inventory, hanzi, pinyin, allowSpaces],
  );
  const [hovered, setHovered] = useState<string | null>(null);
  // Pair → hover key: its glyph's word group when one is given, else the pair itself.
  const keyOf = useMemo(() => {
    const keys = new Map<number, string>();
    pairing?.glyphPairs.forEach((pair, i) => { const g = groups?.[i]; if (pair != null) keys.set(pair, g != null ? `g${g}` : `p${pair}`); });
    return (pair: number) => keys.get(pair) ?? `p${pair}`;
  }, [pairing, groups]);

  const props = (pair: number, className: string) => {
    const key = keyOf(pair);
    return {
      className: `${className}${hovered === key ? ' sentence-pair-hover' : ''}`,
      onMouseEnter: () => setHovered(key),
      onMouseLeave: () => setHovered(current => (current === key ? null : current)),
    };
  };

  /** One headword glyph by its Array.from(hanzi) index; unpaired glyphs stay plain text. */
  const glyph = (ch: string, index: number): ReactNode => {
    const pair = pairing?.glyphPairs[index];
    return pair == null ? ch : <span key={index} {...props(pair, 'phrase-pair-glyph')}>{ch}</span>;
  };

  /** Raw pair props for one glyph index, for callers that render their own glyph
   *  element (lesson hint targets) and merge the class/handlers into it. */
  const glyphProps = (index: number): HTMLAttributes<HTMLElement> => {
    const pair = pairing?.glyphPairs[index];
    return pair == null ? {} : props(pair, 'phrase-pair-glyph');
  };

  /** The recorded pinyin with each syllable hoverable, or the plain reading without a pairing. */
  const pinyinText: ReactNode = pairing
    ? pairing.tokens.map((token, t) => <span key={t}>
        {t > 0 && ' '}
        {token.leading}
        {token.pieces.map((piece, p) => piece.pair == null ? <span key={p}>{piece.text}</span> : <span key={p} {...props(piece.pair, 'phrase-pair-syllable')}>{piece.text}</span>)}
        {token.trailing}
      </span>)
    : pinyin;

  return { paired: pairing != null, glyph, glyphProps, pinyinText };
}
