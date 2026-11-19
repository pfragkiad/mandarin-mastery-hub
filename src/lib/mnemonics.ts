/**
 * Memory pictures (mnemonics) for glyphs.
 *
 * Purpose: an owner-supplied illustration that helps remember one exact written form. It is a
 * memory aid only — never etymology, decomposition, reading or meaning data.
 *
 * Identity comes only from the pointer file name: src/assets/mnemonics/<code point>.<ext>.asset.json,
 * the exact Unicode code point in lowercase hex (辶 → 8fb6). Look-alike forms (辶 U+8FB6, ⻌ U+2ECC,
 * ⻍ U+2ECD) therefore never share a picture, and nothing is matched by shape or normalisation.
 * Optional alt captions live in src/data/mnemonics.json under the same code point key, with three
 * optional per-picture fields: "band" — the fraction of the picture's height, from the top, where
 * the picture draws its own character; that band is covered and the glyph re-drawn in the
 * learner's current font (default DEFAULT_MNEMONIC_BAND; 0 covers nothing). "draw" — whether the
 * glyph is drawn at the top at all (default: only where a band was covered, so a picture whose top
 * is simply empty can still carry the character). "paper" — the picture's own background colour,
 * used for that cover and for the detail preview's letterbox, so neither shows a seam.
 * The pointer files are tiny, so they load eagerly; the images themselves stay on the CDN and load
 * only when a preview or popup renders.
 */
import captions from '@/data/mnemonics.json';

export type Mnemonic = { glyph: string; codePoint: string; url: string; caption: string | null; band: number; paper: string | null; drawHanzi: boolean };

/** The owner's pictures draw the character within the top 46% (measured on 辶: ink ends at 43%,
 *  the illustration starts at 48%). */
export const DEFAULT_MNEMONIC_BAND = 0.46;
type CaptionEntry = { caption?: string; band?: number; paper?: string; draw?: boolean };
/** A recorded band must be a fraction in [0, 0.9]; anything else falls back to the default. */
export function mnemonicBand(entry: CaptionEntry | undefined): number {
  const band = entry?.band;
  return typeof band === 'number' && Number.isFinite(band) && band >= 0 && band <= 0.9 ? band : DEFAULT_MNEMONIC_BAND;
}
/** The picture's own paper colour (#rgb/#rrggbb), or null for the shared default. */
export function mnemonicPaper(entry: CaptionEntry | undefined): string | null {
  const paper = entry?.paper?.trim();
  return paper && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(paper) ? paper.toLowerCase() : null;
}
/** Whether the glyph is drawn in the picture's top area: a recorded "draw" decides, otherwise it
 *  follows the band, because a picture whose own character was covered needs the replacement. */
export function mnemonicDrawsHanzi(entry: CaptionEntry | undefined, band: number): boolean {
  return typeof entry?.draw === 'boolean' ? entry.draw : band > 0;
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
  const band = mnemonicBand(entry);
  byCodePoint.set(codePoint, { glyph: String.fromCodePoint(parseInt(codePoint, 16)), codePoint, url: pointer.url, caption: entry?.caption ?? null, band, paper: mnemonicPaper(entry), drawHanzi: mnemonicDrawsHanzi(entry, band) });
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
