# Audit and review reports

Keep standalone audit, notes, and report JSON files here unless application loading code reads them at runtime. Inputs required to regenerate datasets belong under `importer/data/`, including source reviews used by importers; see [the importer data guide](../importer/README.md). Generated runtime data stays in its existing data location.

| File | Use |
| --- | --- |
| [character-variants-42-lexical-notes.json](character-variants-42-lexical-notes.json) | Extracted lexical examples for offline review. |
| [character-variants-42-lexical-web-audit.json](character-variants-42-lexical-web-audit.json) | Evidence report for those examples; [readable summary](character-variants-42-lexical-web-audit.md). |

The exception is [public/data/radical_variant_etymology_audit.json](../public/data/radical_variant_etymology_audit.json): `src/components/tutor/radical-variant-etymology.tsx` fetches it lazily for variant details. It also supplies the offline contextual-identity importer and its provenance tests, so its public URL remains unchanged.

Files such as `character-variants-v1.4.0.json` contain runtime associations and notes, and the enrichment sidecars contain runtime annotations. They remain in the data directories; descriptive fields inside a loaded dataset do not make the whole dataset an offline report. Historical provenance filenames in source datasets remain recorded text rather than new fetch URLs.
