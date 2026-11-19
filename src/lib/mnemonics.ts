/**
 * Memory pictures (mnemonics) for glyphs.
 *
 * Purpose: an owner-supplied illustration that helps remember one exact written form. It is a
 * memory aid only — never etymology, decomposition, reading or meaning data.
 *
 * Identity comes only from the pointer file name: src/assets/mnemonics/<code point>.<ext>.asset.json,
 * the exact Unicode code point in lowercase hex (辶 → 8fb6). Look-alike forms (辶 U+8FB6, ⻌ U+2ECC,
 * ⻍ U+2ECD) therefore never share a picture, and nothing is matched by shape or normalisation.
 * Optional alt captions live in src/data/mnemonics.json under the same code point key, as does an
 * optional "band": the fraction of the picture's height (from the top) where the picture draws its
 * character. The app covers that band with the picture's paper colour and re-draws the glyph in
 * the learner's current font (mnemonic.tsx). Default DEFAULT_MNEMONIC_BAND; 0 turns it off.
 * The pointer files are tiny, so they load eagerly; the images themselves stay on the CDN and load
 * only when a preview or popup renders.
 */
import captions from '@/data/mnemonics.json';

export type Mnemonic = { glyph: string; codePoint: string; url: string; caption: string | null; band: number };

/** The owner's pictures draw the character within the top 46% (measured on 辶: ink ends at 43%,
 *  the illustration starts at 48%). */
export const DEFAULT_MNEMONIC_BAND = 0.46;
type CaptionEntry = { caption?: string; band?: number };
/** A recorded band must be a fraction in [0, 0.9]; anything else falls back to the default. */
export function mnemonicBand(entry: CaptionEntry | undefined): number {
  const band = entry?.band;
  return typeof band === 'number' && Number.isFinite(band) && band >= 0 && band <= 0.9 ? band : DEFAULT_MNEMONIC_BAND;
}

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
  const entry = (captions as Record<string, CaptionEntry>)[codePoint];
  byCodePoint.set(codePoint, { glyph: String.fromCodePoint(parseInt(codePoint, 16)), codePoint, url: pointer.url, caption: entry?.caption ?? null, band: mnemonicBand(entry) });
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
