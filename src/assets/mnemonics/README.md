# Memory pictures (mnemonics)

Owner-supplied illustrations shown as memory aids on glyph cards (a picture icon beside the
pinyin opens it) and beside the hanzi in the detail card. They are memory aids only, never
etymology or lexical data.

## Naming

- One pointer per glyph: `<code point>.<ext>.asset.json`, the exact Unicode code point in
  lowercase hex, e.g. `8fb6.webp.asset.json` for 辶 (U+8FB6).
- Code points, not hanzi, because look-alike forms differ only in their code point
  (辶 U+8FB6, ⻌ U+2ECC, ⻍ U+2ECD; 月 U+6708, ⺝ U+2E9D), and hanzi file names are easily
  normalised or mangled by tools.
- The images live on the Lovable CDN; only the pointer JSON is committed. Upload with
  `lovable-assets create --file <image> --filename <code point>.webp > src/assets/mnemonics/<code point>.webp.asset.json`.
- Prefer a square image resized to 1024 px, saved as WebP.

## Captions

Optional alt text lives in [src/data/mnemonics.json](../../data/mnemonics.json), keyed by the same
code point (`{ "8fb6": { "caption": "Walk along a path" } }`).

## The character at the top

Every picture draws its character in the top band on the same paper colour (#FDF1DD). The app
covers that band with the paper colour and re-draws the exact glyph in the learner's current
Character style font, so the picture always matches the rest of the app. The band defaults to the
top 46% of the height; a picture laid out differently can record its own fraction
(`{ "8fb6": { "band": 0.46 } }`, `0` turns the overlay off) in src/data/mnemonics.json. The
uploaded image itself is never edited.

## Consumers

[src/lib/mnemonics.ts](../../lib/mnemonics.ts) reads these pointers (eager glob) and
[src/components/tutor/mnemonic.tsx](../../components/tutor/mnemonic.tsx) renders the icon,
preview and popup.
