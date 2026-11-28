# Radical-identity source inputs

This directory contains the pinned evidence consumed by `scripts/import-radical-identities.py`. None of these source files is fetched by the application.

| File | Meaning |
| --- | --- |
| [.gitattributes](.gitattributes) | Keeps all checksum-bound source bytes unchanged across Git checkouts, including the original LF line endings used by existing source identities. |
| [review.json](review.json) | Supplied mirror audit of exact glyph/symbol relations. Its bytes determine the generated sidecar's `coverage.auditSha256`. |
| [CJKRadicals.txt](CJKRadicals.txt) | Unicode 17 CJK radical numbers and exact ordinary/symbol identities. |
| [NamesList-supplement.txt](NamesList-supplement.txt) | Pinned radical-supplement naming records. Only explicit recorded relations are accepted. |
| [EquivalentUnifiedIdeograph.txt](EquivalentUnifiedIdeograph.txt) | Original Unicode 17 property file, downloaded from Unicode with its notices intact. Only the five pairs selected by the [component metadata review](../components/radical-family-metadata-review.json) are imported, validated against each symbol's exact NamesList family. No other cross-references become equivalences. |
| [Unihan-kRSUnicode-supplement.txt](Unihan-kRSUnicode-supplement.txt) | Supplied residual-zero radical assignments and their upstream checksum. |

From the repository root, run `python scripts/import-radical-identities.py` to write `public/data/radical-identities.json`. The importer also reads current character/radical rows, shared catalogue metadata, and the radical-stroke sidecar to validate contextual shared forms.

Keep source bytes and line endings intact. File hashes become source identities in generated data, so an editorial or formatting change is not equivalent to a path move. Never replace exact mappings with shape, normalization, or dictionary-text guesses. Source corrections require review and regeneration of the output and affected tests.

See [the parent guide](../README.md), [the importer overview](../../README.md), and [catalog.md](../../../public/data/catalog.md) for directory ownership and runtime loading.

Run `python scripts/import-radical-identities.py --check` to verify the current
output without writing. The selected component review and its original proposal
are checksum-bound; shared source rows, IDS and geometry remain unchanged.
