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

## Per-picture records

[src/data/mnemonics.json](../../data/mnemonics.json) is keyed by the same code point and holds
optional fields for one picture:

| field | meaning |
| --- | --- |
| `caption` | alt text, e.g. `{ "8fb6": { "caption": "Walk along a path" } }` |
| `band` | the fraction of the height, from the top, where the picture draws its own character and must be covered (default 0.46; `0` covers nothing) |
| `draw` | whether the glyph is drawn at the top at all (default: only where a band was covered) — `true` lets a picture whose top is simply empty still carry the character |
| `paper` | the picture's own background colour, used for the covered band and the preview's letterbox (recorded automatically by the import script) |

## The character at the top

The app never edits the uploaded image. It covers the picture's own character band with the
picture's `paper` colour and re-draws the exact glyph in the learner's current Character style
font, so the drawn character always follows the Character style preference (辶: its own drawing
covered; 心: its empty top simply receives the character).

The detail card's small preview shows only the picture's **bottom half** — the illustration —
because the top half holds the character the card already prints large beside it. The popup keeps
the full picture, character included.

## Importing

Drop the images in `importer/data/mnemonics/` (named by the glyph or its code point) and run
`python3 scripts/import-mnemonics.py`; it resizes, uploads, writes the pointer and records each
picture's paper colour. See [importer/data/mnemonics/README.md](../../../importer/data/mnemonics/README.md).

## Consumers

[src/lib/mnemonics.ts](../../lib/mnemonics.ts) reads these pointers (eager glob) and
[src/components/tutor/mnemonic.tsx](../../components/tutor/mnemonic.tsx) renders the icon,
preview and popup.
