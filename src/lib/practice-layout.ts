// A4 practice-sheet pagination, adapted from the uploaded practice-layout.ts.
// Tokens are single hanzi glyphs with an optional per-glyph pinyin reading.
export type PracticeToken = { text: string; pinyin?: string };
export type PracticeBlock =
  | { kind: 'character'; token: PracticeToken; rows: 1 | 2 }
  | { kind: 'text'; tokens: PracticeToken[]; segment: number; segments: number };
export type PracticePage = { blocks: PracticeBlock[] };

export function buildPracticePages(tokens: PracticeToken[], rows: 1 | 2): PracticePage[] {
  const unique = new Map<string, PracticeToken>();
  for (const token of tokens) unique.set(JSON.stringify([token.text, token.pinyin]), token);
  const blocks: PracticeBlock[] = [...unique.values()].map((token) => ({ kind: 'character', token, rows }));
  const segments = Math.ceil(tokens.length / 8);
  for (let i = 0; i < tokens.length; i += 8)
    blocks.push({ kind: 'text', tokens: tokens.slice(i, i + 8), segment: i / 8 + 1, segments });
  const pages: PracticePage[] = [];
  let page: PracticePage = { blocks: [] };
  let height = 0;
  for (const block of blocks) {
    const size = block.kind === 'character' ? block.rows * 19 + 6 : 71;
    if (page.blocks.length && height + size > 185) {
      pages.push(page);
      page = { blocks: [] };
      height = 0;
    }
    page.blocks.push(block);
    height += size;
  }
  if (page.blocks.length) pages.push(page);
  return pages;
}
