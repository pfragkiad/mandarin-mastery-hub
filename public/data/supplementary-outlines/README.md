# Supplementary handwriting outlines

These public JSON files hold owner-reviewed exact-form geometry for selected forms missing from Hanzi Writer Data. `2ebf.json` covers the explicitly approved radical form U+2EBF (Taiwan-style 艹 linked by review). `2e86.json` (⺆), `725c.json` (牜), `2eb6.json` (⺶), `2ecf.json` (⻏) and `2ed7.json` (⻗) are AnimCJK Mainland outlines recorded under the same exact code point, found by scanning all radical-family forms Hanzi Writer Data lacks; their stroke counts match the radical file. ⺁ ⺧ ⺪ ⺴ ⺷ ⻊ 𧢲 have no exact outline in either source and stay unrecorded.

`src/data/supplementary-outlines.json` is the small imported manifest mapping covered glyphs to these URLs. `src/lib/character-enrichment.ts` consults it when loading geometry and preserves the actual outline source and style for Practice.

Generate files and the manifest with `python scripts/import-supplementary-outlines.py` from the repository root. The script uses its explicit owner-reviewed entries, downloads the recorded AnimCJK SVGs, converts coordinates into Hanzi Writer space, and checks the stroke count against the shared radical-family source. Regeneration requires network access to the recorded upstream source.

Preserve geometry, medians, source glyph, regional style, and license metadata together. Only the listed owner-reviewed mapping may connect a source outline to a form. Never fill a missing form with a similar glyph or infer paths from IDS structure.

See [the public data guide](../README.md), [the TypeScript data guide](../../../src/data/README.md), and [catalog.md](../catalog.md) for the surrounding loading contract.
