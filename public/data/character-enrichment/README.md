# Per-glyph character enrichment

This directory contains optional source annotations fetched by `src/lib/character-enrichment.ts` after a glyph is selected. The files supplement the shared catalogue; they do not replace its recorded trees or handwriting geometry.

| File | Usage |
| --- | --- |
| `<hex-codepoint>.json` | A single-glyph annotation envelope with source decomposition, checksum bindings, occurrence stroke groups, and recorded source comparisons. The filename is the glyph's lowercase hexadecimal code point. |
| `manifest.json` | Handoff sources, input hashes, consumer policy, coverage, and tree compatibility summary. |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Source versions, license information, and limits of the supplied annotations. |
| [notices/](notices/README.md) | Corresponding source text and license notices. |

`scripts/import-character-enrichment.py <supplied-enrichment.json>` splits a supplied handoff into these files and checks it against catalogue trees. The original upstream evidence generator and all of its inputs were not provided; this adapter cannot recreate that audit independently.

The browser validates each envelope and requires both the current decomposition-tree checksum and raw geometry checksum to match before applying occurrence mappings. Keep exact positions, source qualifiers, occurrence indices, unknown strokes, and provenance intact. A mapping never licenses substituting standalone component outlines or inferring missing stroke geometry. These annotations remain labelled as unreviewed source annotations.

Files here are public runtime assets. See [the public data guide](../README.md) and [catalog.md](../catalog.md) for the surrounding catalogue.
