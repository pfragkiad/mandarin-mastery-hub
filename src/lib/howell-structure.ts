/**
 * Presentation-only reading of Howell's etymology notation (public/data/etymology, Howell
 * source), following public/data/etymology/HOWELL_PRESENTATION.md, so the Etymology tab can
 * lay a note out without changing, dropping or reordering a single character of it.
 *
 * Howell's own key (Etymological Dictionary of Han Chinese Characters, "Key to Symbols"):
 *   #      phonosemantic element (gives sound as well as meaning) in dual-element characters
 *   →      leads to the idea/meaning        ←  results from the idea/meaning
 *   *word* meanings the character bears in modern Japanese
 *
 * Input: one entry's recorded text. Output (howellPresentation): ordered blocks whose pieces
 * partition the text exactly — every separator (" + ", " → "), the space between sentences
 * and every mark is kept as a piece, so joining them (howellSourceText) rebuilds the text
 * byte for byte, which the tests check for every recorded entry. Block roles:
 *  - context:     a bounded preface before an explicit combination ("The relevant bronzeware
 *                 inscription form is") or the origin account a meaning path starts from;
 *  - composition: the elements joined by top-level " + ", in recorded order; an element may be
 *                 a hanzi with its gloss or a described one ("a spoon/ladle", "an element# …");
 *  - progression: the top-level " → " steps of that sentence;
 *  - prose:       any other sentence (first or later), kept whole.
 * Recognition is local and conservative: pluses/arrows inside parentheses or quotes never
 * split, a preface is accepted only when it ends in a known bounded phrase, and a sentence
 * whose parentheses or quotes do not pair stays prose. Unknown notation therefore falls back
 * to faithful prose rather than a guessed structure. Syntax recognition never means review.
 *
 * howellInline tokenises one piece into text / *meaning* / hanzi / # marker / arrow tokens,
 * flagging the "(← …)" reason asides. Glyph tokens are only the exact characters written;
 * a # after a hanzi stays on that hanzi, a # after a description ("element#") stays with the
 * description and never moves to a nearby hanzi. Callers look glyphs up by exact form only.
 */
export type HowellPiece = { sep: string; text: string };
export type HowellBlock =
  | { kind: 'gap'; text: string }
  | { kind: 'context'; text: string }
  | { kind: 'prose'; text: string; later: boolean }
  | { kind: 'composition'; parts: HowellPiece[] }
  | { kind: 'progression'; steps: HowellPiece[] };
export type HowellPresentation = { blocks: HowellBlock[]; parseStatus: 'recognized' | 'partial' | 'prose' };
export type HowellToken =
  | { kind: 'text'; text: string; reason: boolean }
  | { kind: 'meaning'; text: string; reason: boolean }
  | { kind: 'glyph'; glyph: string; phonosemantic: boolean; reason: boolean }
  /** A # written after a description rather than a hanzi. */
  | { kind: 'marker'; reason: boolean }
  | { kind: 'arrow'; text: '←' | '→'; reason: boolean };

const HAN = String.raw`\p{Script=Han}`;
const HAN_START = new RegExp(String.raw`^${HAN}`, 'u');
/** Bounded phrases that end a preface to an explicit combination (guide: "form is",
 *  "combines", "composed of" — only where their extent is clear). */
const PREFACE_END = /(?:\bform(?: of this character| of \p{Script=Han})? (?:is|shows)|\bcombines|\bcomposed of|\bconsisting of|\bcombination of)\s+$/u;
/** Openings that make the head itself the first element ("As per 居# …", "an element# …"). */
const ELEMENT_START = new RegExp(String.raw`^(?:${HAN}|As per |Originally,? |an? |the |(?:An?|The) (?:abbreviated|variant|simplified|modified|truncated)\b|Abbreviated\b)`, 'u');
const ABBREVIATIONS = /(?:\betc|\be\.g|\bi\.e|\bcf|\bvs|\bapprox|\blit|\bNo)$/;

/** Visits top-level positions (outside parentheses and double quotes). */
function topLevel(text: string, visit: (i: number) => number | void) {
  let depth = 0, quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') quote = !quote;
    else if (ch === '“') quote = true;
    else if (ch === '”') quote = false;
    else if (!quote && ch === '(') depth++;
    else if (!quote && ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && !quote) { const skip = visit(i); if (skip) i += skip; }
  }
}

/** True when parentheses nest properly and straight quotes pair, so splitting is safe. */
function balanced(text: string): boolean {
  let depth = 0;
  for (const ch of text) { if (ch === '(') depth++; else if (ch === ')' && --depth < 0) return false; }
  return depth === 0 && (text.split('"').length - 1) % 2 === 0;
}

/** Splits at top-level `sep`, keeping each separator as the next piece's `sep`. */
function splitPieces(text: string, sep: string): HowellPiece[] {
  const out: HowellPiece[] = [];
  let start = 0, pending = '';
  topLevel(text, i => {
    if (!text.startsWith(sep, i)) return;
    out.push({ sep: pending, text: text.slice(start, i) });
    pending = sep; start = i + sep.length;
    return sep.length - 1;
  });
  out.push({ sep: pending, text: text.slice(start) });
  return out;
}

/** Sentences end at a top-level ". " followed by a capital (optionally after * " “ or (),
 *  never after a known abbreviation; the whitespace between them is returned as a gap. */
function splitSentences(text: string): { sentence: string; gap: string }[] {
  const out: { sentence: string; gap: string }[] = [];
  let start = 0;
  topLevel(text, i => {
    if (text[i] !== '.' || ABBREVIATIONS.test(text.slice(start, i))) return;
    const rest = /^\s+(?=[*"“(]?[A-Z])/.exec(text.slice(i + 1));
    if (!rest) return;
    out.push({ sentence: text.slice(start, i + 1), gap: rest[0] });
    start = i + 1 + rest[0].length;
    return rest[0].length;
  });
  out.push({ sentence: text.slice(start), gap: '' });
  return out;
}

/** A head with top-level " + ": an optional bounded preface, then the composition. */
function composition(head: string): { preface: string; parts: HowellPiece[] } | null {
  const firstPlus = splitPieces(head, ' + ');
  if (firstPlus.length < 2) return null;
  const first = firstPlus[0]?.text ?? '';
  // Find the latest bounded preface phrase inside the first element's text.
  let cut = -1;
  for (const match of first.matchAll(/\s+/g)) {
    const end = (match.index ?? 0) + match[0].length;
    if (PREFACE_END.test(first.slice(0, end))) cut = end;
  }
  if (cut < 0) return ELEMENT_START.test(first) ? { preface: '', parts: firstPlus } : null;
  if (cut >= first.length) return null;
  const rest = first.slice(cut);
  if (!ELEMENT_START.test(rest) && !HAN_START.test(rest)) return null;
  return { preface: first.slice(0, cut), parts: [{ sep: '', text: rest }, ...firstPlus.slice(1)] };
}

export function howellPresentation(text: string): HowellPresentation {
  const blocks: HowellBlock[] = [];
  let recognized = false, fellBack = false;
  splitSentences(text).forEach(({ sentence, gap }, index) => {
    const later = index > 0;
    if (!balanced(sentence)) { fellBack = true; blocks.push({ kind: 'prose', text: sentence, later }); }
    else {
      const steps = splitPieces(sentence, ' → ');
      const head = steps[0]?.text ?? '';
      const built = composition(head);
      if (built) {
        recognized = true;
        if (built.preface) blocks.push({ kind: 'context', text: built.preface });
        blocks.push({ kind: 'composition', parts: built.parts });
        if (steps.length > 1) blocks.push({ kind: 'progression', steps: steps.slice(1) });
      } else if (steps.length > 1) {
        recognized = true;
        blocks.push({ kind: 'context', text: head });
        blocks.push({ kind: 'progression', steps: steps.slice(1) });
      } else blocks.push({ kind: 'prose', text: sentence, later });
    }
    if (gap) blocks.push({ kind: 'gap', text: gap });
  });
  return { blocks, parseStatus: !recognized ? 'prose' : fellBack ? 'partial' : 'recognized' };
}

/** Rebuilds the exact recorded text from a presentation (used by the preservation tests). */
export function howellSourceText(presentation: HowellPresentation): string {
  return presentation.blocks.map(block => {
    if (block.kind === 'composition') return block.parts.map(p => p.sep + p.text).join('');
    if (block.kind === 'progression') return block.steps.map(p => p.sep + p.text).join('');
    return block.text;
  }).join('');
}

/** Tokens for one piece: *meanings*, hanzi (with a following # kept as their mark), described
 *  # markers, arrows and text; tokens inside a top-level "(← …)" aside carry reason: true.
 *  An unpaired * stays literal text. */
export function howellInline(text: string): HowellToken[] {
  const ranges: { text: string; reason: boolean }[] = [];
  let depth = 0, start = 0, reasonStart = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') {
      if (depth === 0 && text.startsWith('(←', i)) { if (i > start) ranges.push({ text: text.slice(start, i), reason: false }); reasonStart = i; start = i; }
      depth++;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && reasonStart >= 0) { ranges.push({ text: text.slice(reasonStart, i + 1), reason: true }); reasonStart = -1; start = i + 1; }
    }
  }
  if (start < text.length) ranges.push({ text: text.slice(start), reason: reasonStart >= 0 });
  const tokens: HowellToken[] = [];
  const mark = new RegExp(String.raw`(${HAN})(#?)|#|[←→]`, 'gu');
  for (const range of ranges) {
    const reason = range.reason;
    const pushPlain = (plain: string) => {
      let at = 0;
      for (const match of plain.matchAll(mark)) {
        const index = match.index ?? 0;
        if (index > at) tokens.push({ kind: 'text', text: plain.slice(at, index), reason });
        if (match[1]) tokens.push({ kind: 'glyph', glyph: match[1], phonosemantic: match[2] === '#', reason });
        else if (match[0] === '#') tokens.push({ kind: 'marker', reason });
        else tokens.push({ kind: 'arrow', text: match[0] as '←' | '→', reason });
        at = index + match[0].length;
      }
      if (at < plain.length) tokens.push({ kind: 'text', text: plain.slice(at), reason });
    };
    let last = 0;
    for (const match of range.text.matchAll(/\*([^*\n]+)\*/g)) {
      const index = match.index ?? 0;
      if (index > last) pushPlain(range.text.slice(last, index));
      tokens.push({ kind: 'meaning', text: match[1] ?? '', reason });
      last = index + match[0].length;
    }
    if (last < range.text.length) pushPlain(range.text.slice(last));
  }
  return tokens;
}

/** Rebuilds a piece's exact text from its tokens (used by the preservation tests). */
export function howellTokenText(tokens: HowellToken[]): string {
  return tokens.map(token => token.kind === 'meaning' ? `*${token.text}*`
    : token.kind === 'glyph' ? token.glyph + (token.phonosemantic ? '#' : '')
    : token.kind === 'marker' ? '#' : token.text).join('');
}
