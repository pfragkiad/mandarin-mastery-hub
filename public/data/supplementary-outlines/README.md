# Supplementary handwriting outlines

These public JSON files hold owner-reviewed exact-form geometry for selected forms missing from Hanzi Writer Data. The currently supplied `2ebf.json` covers the explicitly approved radical form U+2EBF.

`src/data/supplementary-outlines.json` is the small imported manifest mapping covered glyphs to these URLs. `src/lib/character-enrichment.ts` consults it when loading geometry and preserves the actual outline source and style for Practice.

Generate files and the manifest with `python scripts/import-supplementary-outlines.py` from the repository root. The script uses its explicit owner-reviewed entries, downloads the recorded AnimCJK SVGs, converts coordinates into Hanzi Writer space, and checks the stroke count against the shared radical-family source. Regeneration requires network access to the recorded upstream source.

Preserve geometry, medians, source glyph, regional style, and license metadata together. Only the listed owner-reviewed mapping may connect a source outline to a form. Never fill a missing form with a similar glyph or infer paths from IDS structure.

See [the public data guide](../README.md), [the TypeScript data guide](../../../src/data/README.md), and [catalog.md](../catalog.md) for the surrounding loading contract.
