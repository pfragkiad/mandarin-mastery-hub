/**
 * Line layout for a phrase headword inside its bordered hanzi box (Compact and Comfortable).
 *
 * Rules (agreed with the user):
 * - At most 12 glyph slots per line; punctuation counts as a slot (it is full-width).
 * - Use the fewest lines that respect that limit: up to 12 → 1 line, 13–24 → 2, 25–36 → 3;
 *   longer phrases keep adding lines, so the card simply grows taller.
 * - Where to break, in priority order: right after punctuation, then at the edge of a
 *   matched vocabulary word, then anywhere else — never inside a matched word unless
 *   nothing else works. Lines stay roughly even.
 * - Punctuation never starts a line (closing marks such as ， 。 ？ stay with the glyph
 *   before them) and opening marks such as “ 《 （ never end a line.
 *
 * The box font size is set in CSS from the longest line (`--tile-per-line`), so this only
 * decides which glyphs go on which line; the phrase text itself is never changed.
 */

export const PHRASE_LINE_MAX = 12;

const CLOSING = new Set(Array.from('，。、！？；：）」』”’》〉】…—·,.!?;:)]}%'));
const OPENING = new Set(Array.from('（「『“‘《〈【([{'));

const isClosing = (glyph: string | undefined) => glyph != null && CLOSING.has(glyph);
const isOpening = (glyph: string | undefined) => glyph != null && OPENING.has(glyph);

/** Break costs: lower is better. Imbalance adds a smaller per-glyph cost on top. */
const COST = { punctuation: 0, wordEdge: 4, other: 8, insideWord: 12 } as const;
const IMBALANCE = 0.5;

/**
 * @param text      the phrase headword as recorded (whitespace is ignored for layout)
 * @param wordSpans glyph-index ranges [start, end) of matched vocabulary words, in order
 * @returns the lines to render, joined back they equal `text` without whitespace
 */
export function phraseTileLines(text: string, wordSpans: Array<[number, number]> = []): string[] {
  const glyphs = Array.from(text.replace(/\s/g, ''));
  const n = glyphs.length;
  if (n <= PHRASE_LINE_MAX) return n ? [glyphs.join('')] : [];

  // Classify every possible break position b (a line ends after glyph b-1).
  const wordEdge = new Set<number>();
  const insideWord = new Set<number>();
  for (const [start, end] of wordSpans) {
    if (end - start < 1) continue;
    wordEdge.add(start); wordEdge.add(end);
    for (let b = start + 1; b < end; b++) insideWord.add(b);
  }
  const breakCost = (b: number): number | null => {
    if (isClosing(glyphs[b]) || isOpening(glyphs[b - 1])) return null; // punctuation rule
    if (isClosing(glyphs[b - 1])) return COST.punctuation;
    if (insideWord.has(b)) return COST.insideWord;
    if (wordEdge.has(b)) return COST.wordEdge;
    return COST.other;
  };

  // Fewest lines first; add a line only if the punctuation rules make that count impossible.
  for (let lines = Math.ceil(n / PHRASE_LINE_MAX); lines <= n; lines++) {
    const ideal = n / lines;
    // best[k][p]: lowest cost covering glyphs [0, p) with k lines; prev stores the break.
    const best: number[][] = Array.from({ length: lines + 1 }, () => new Array<number>(n + 1).fill(Infinity));
    const prev: number[][] = Array.from({ length: lines + 1 }, () => new Array<number>(n + 1).fill(-1));
    best[0]![0] = 0;
    for (let k = 1; k <= lines; k++) {
      for (let p = 1; p <= n; p++) {
        const endCost = p === n ? 0 : breakCost(p);
        if (endCost == null) continue;
        for (let s = Math.max(0, p - PHRASE_LINE_MAX); s < p; s++) {
          const before = best[k - 1]![s]!;
          if (before === Infinity) continue;
          const cost = before + endCost + IMBALANCE * Math.abs(p - s - ideal);
          if (cost < best[k]![p]!) { best[k]![p] = cost; prev[k]![p] = s; }
        }
      }
    }
    if (best[lines]![n] === Infinity) continue;
    const result: string[] = [];
    for (let k = lines, p = n; k > 0; k--) {
      const s = prev[k]![p]!;
      result.unshift(glyphs.slice(s, p).join(''));
      p = s;
    }
    return result;
  }
  return [glyphs.join('')];
}

/** Converts matched phrase parts (in order, covering the text) into glyph-index spans of matched words. */
export function matchedWordSpans(parts: Array<{ text: string; matched: boolean }>): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let index = 0;
  for (const part of parts) {
    const length = Array.from(part.text.replace(/\s/g, '')).length;
    if (part.matched) spans.push([index, index + length]);
    index += length;
  }
  return spans;
}
