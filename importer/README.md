# Importer data

Store importer-only source files under `importer/data/`, grouped by dataset. Importer scripts currently remain under `scripts/`; generated application data remains under `public/data/` or `src/data/` according to its loading method. Standalone analysis reports and notes remain under `reports/`.

## Radical identities

`scripts/import-radical-identities.py` reads these pinned inputs from `importer/data/radical-identities/`:

| File | Purpose |
| --- | --- |
| [review.json](data/radical-identities/review.json) | Supplied mirror audit containing exact reviewed glyph/symbol identities and provenance. Its raw bytes determine the generated `coverage.auditSha256`. |
| [CJKRadicals.txt](data/radical-identities/CJKRadicals.txt) | Pinned Unicode 17 CJK radical identities. Its raw bytes determine a generated source checksum. |
| [NamesList-supplement.txt](data/radical-identities/NamesList-supplement.txt) | Pinned Unicode radical-supplement naming records, also checksum-bound. |
| [Unihan-kRSUnicode-supplement.txt](data/radical-identities/Unihan-kRSUnicode-supplement.txt) | Recorded residual-zero radical assignments, including its upstream Unihan checksum. |

These four pinned inputs previously lived under `scripts/data/radical-identities/` and now live together under `importer/data/radical-identities/`. Relocation preserves file bytes and provenance. Preserve encoding and line endings when handling checksum-bound sources.

Run `python scripts/import-radical-identities.py` from the repository root to generate `public/data/radical-identities.json`. The script also reads the current character/radical rows, shared catalogue metadata, and the radical-stroke sidecar. It never serves these importer-only inputs to the browser.

## Shared runtime sources

Some importer dependencies also serve the application and retain their existing locations:

- `public/data/radical-families-source.json` is read by the stroke and supplementary-outline importers, linked from radical-family details for source records and license notices, and recorded in stroke-sidecar provenance.
- `public/data/radical_variant_etymology_audit.json` is fetched lazily by variant details and read by the contextual-identity importer and provenance tests.
- Generated catalogue rows, metadata, and sidecars are read by both the app and later import steps. They remain in their runtime data directories.

Do not move shared runtime files merely because an importer also reads them. For future importer-only inputs, use `importer/data/<dataset>/` and update the importer, documentation, and source checksum references together. External source paths explicitly supplied through command-line arguments remain supported without copying those files into the repository.
