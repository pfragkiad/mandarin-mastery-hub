/**
 * Presentation-only reading of Howell's etymology notation (public/data/etymology, Howell
 * source), so the Etymology tab can lay a note out without changing a word of it.
 *
 * Howell's own key (Etymological Dictionary of Han Chinese Characters, "Key to Symbols"):
 *   #      phonosemantic element (gives sound as well as meaning) in dual-element characters
 *   →      leads to the idea/meaning        ←  results from the idea/meaning
 *   *word* meanings the character bears in modern Japanese
 *
 * Input: one entry's recorded text. Output (howellStructure):
 *  - formation: the parts the first step names ("子# child + 女 woman"), split on top-level
 *    " + " — only when at least one part is a hanzi with its gloss, otherwise null;
 *  - steps: the first sentence's remaining top-level " → " steps (the meaning path);
 *  - notes: every later sentence, kept whole.
 * Arrows, pluses and full stops inside parentheses never split ("(cutting tool → punish)").
 * Nothing is dropped: every character of the text lands in exactly one piece (only the
 * separators " + ", " → " and inter-sentence spaces are consumed), which the tests check.
 * howellInline tokenises one piece into text / *meaning* / hanzi (+ its # mark), flagging the
 * "(← …)" reason asides. Glyph tokens are only the exact characters written; callers look
 * them up by exact written form and never infer another identity.
 */
export type HowellPart =
  | { kind: 'component'; lead: string; glyphs: string[]; phonosemantic: boolean; gloss: string }
  | { kind: 'text'; text: string };
export type HowellStructure = { formation: HowellPart[] | null; steps: string[]; notes: string[] };
export type HowellToken =
  | { kind: 'text'; text: string; reason: boolean }
  | { kind: 'meaning'; text: string; reason: boolean }
  | { kind: 'glyph'; glyph: string; phonosemantic: boolean; reason: boolean };

const HAN = String.raw`\p{Script=Han}`;
const COMPONENT = new RegExp(String.raw`^(As per\s+|Originally,?\s+)?(${HAN}(?:\/${HAN})*)(#?)(?:\s+([\s\S]+))?$`, 'u');

/** Splits at `sep` only outside parentheses. */
function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && text.startsWith(sep, i)) { out.push(text.slice(start, i)); start = i + sep.length; i += sep.length - 1; }
  }
  out.push(text.slice(start));
  return out;
}

/** Sentences end at a top-level ". " followed by a capital (optionally after * " “ or (). */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === '.' && depth === 0) {
      const rest = /^\s+(?=[*"“(]?[A-Z])/.exec(text.slice(i + 1));
      if (rest) { out.push(text.slice(start, i + 1)); start = i + 1 + rest[0].length; i += rest[0].length; }
    }
  }
  out.push(text.slice(start));
  return out.filter(part => part.length > 0);
}

function parsePart(text: string, first: boolean): HowellPart {
  const match = COMPONENT.exec(text);
  if (!match || (match[1] && !first)) return { kind: 'text', text };
  return { kind: 'component', lead: (match[1] ?? '').trim(), glyphs: (match[2] ?? '').split('/'), phonosemantic: match[3] === '#', gloss: match[4] ?? '' };
}

export function howellStructure(text: string): HowellStructure {
  const [first = '', ...notes] = splitSentences(text);
  const steps = splitTopLevel(first, ' → ').filter(step => step.length > 0);
  const head = steps[0] ?? '';
  const parts = splitTopLevel(head, ' + ');
  if (parts.length > 1) {
    const parsed = parts.map((part, i) => parsePart(part, i === 0));
    if (parsed.some(part => part.kind === 'component')) return { formation: parsed, steps: steps.slice(1), notes };
  }
  return { formation: null, steps, notes };
}

/** Tokens for one piece: *meanings*, hanzi (with a following # kept as their mark) and text;
 *  tokens inside a top-level "(← …)" aside carry reason: true. An unpaired * stays literal. */
export function howellInline(text: string): HowellToken[] {
  // Mark top-level "(← …)" ranges.
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
  if (start < text.length) ranges.push({ text: text.slice(start), reason: false });
  const tokens: HowellToken[] = [];
  const glyph = new RegExp(String.raw`(${HAN})(#?)`, 'gu');
  for (const range of ranges) {
    let last = 0;
    const pushPlain = (plain: string) => {
      let at = 0;
      for (const match of plain.matchAll(glyph)) {
        const index = match.index ?? 0;
        if (index > at) tokens.push({ kind: 'text', text: plain.slice(at, index), reason: range.reason });
        tokens.push({ kind: 'glyph', glyph: match[1] ?? '', phonosemantic: match[2] === '#', reason: range.reason });
        at = index + match[0].length;
      }
      if (at < plain.length) tokens.push({ kind: 'text', text: plain.slice(at), reason: range.reason });
    };
    for (const match of range.text.matchAll(/\*([^*\n]+)\*/g)) {
      const index = match.index ?? 0;
      if (index > last) pushPlain(range.text.slice(last, index));
      tokens.push({ kind: 'meaning', text: match[1] ?? '', reason: range.reason });
      last = index + match[0].length;
    }
    if (last < range.text.length) pushPlain(range.text.slice(last));
  }
  return tokens;
}
