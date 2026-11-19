/**
 * Memory pictures (mnemonics) for glyphs.
 *
 * Purpose: an owner-supplied illustration that helps remember one exact written form. It is a
 * memory aid only — never etymology, decomposition, reading or meaning data.
 *
 * Identity comes only from the pointer file name: src/assets/mnemonics/<code point>.<ext>.asset.json,
 * the exact Unicode code point in lowercase hex (辶 → 8fb6). Look-alike forms (辶 U+8FB6, ⻌ U+2ECC,
 * ⻍ U+2ECD) therefore never share a picture, and nothing is matched by shape or normalisation.
 * Optional alt captions live in src/data/mnemonics.json under the same code point key.
 * The pointer files are tiny, so they load eagerly; the images themselves stay on the CDN and load
 * only when a preview or popup renders.
 */
import captions from '@/data/mnemonics.json';

export type Mnemonic = { glyph: string; codePoint: string; url: string; caption: string | null };

type AssetPointer = { url: string };
const pointers = import.meta.glob<AssetPointer>('/src/assets/mnemonics/*.asset.json', { eager: true, import: 'default' });

/** "8fb6.webp.asset.json" → "8fb6"; anything else (README, odd names) is ignored, never guessed. */
export function codePointFromFileName(fileName: string): string | null {
  const match = /^([0-9a-f]{4,6})\.(?:webp|png|jpe?g|avif)\.asset\.json$/.exec(fileName);
  return match?.[1] ?? null;
}

/** Exact code point key of a single glyph, or null for empty/multi-character text. */
export function glyphCodePoint(glyph: string): string | null {
  const chars = [...glyph];
  return chars.length === 1 ? chars[0]!.codePointAt(0)!.toString(16) : null;
}

const byCodePoint = new Map<string, Mnemonic>();
for (const [path, pointer] of Object.entries(pointers)) {
  const codePoint = codePointFromFileName(path.split('/').pop() ?? '');
  // One picture per glyph for now: the first file (sorted path order) wins.
  if (!codePoint || byCodePoint.has(codePoint) || !pointer?.url) continue;
  const caption = (captions as Record<string, { caption?: string }>)[codePoint]?.caption ?? null;
  byCodePoint.set(codePoint, { glyph: String.fromCodePoint(parseInt(codePoint, 16)), codePoint, url: pointer.url, caption });
}

/** The memory picture recorded for this exact glyph, if any. */
export function mnemonicFor(glyph: string): Mnemonic | null {
  const codePoint = glyphCodePoint(glyph);
  return codePoint ? byCodePoint.get(codePoint) ?? null : null;
}

/** A grid card's single picture: the first of its displayed forms (tile order) that has one. */
export function cardMnemonic(forms: readonly string[]): Mnemonic | null {
  for (const form of forms) { const found = mnemonicFor(form); if (found) return found; }
  return null;
}
