# Audit and review reports

Keep standalone audit, notes, and report JSON files here unless application loading code reads them at runtime. Inputs required to regenerate datasets belong under `importer/data/`, including source reviews used by importers; see [the importer data guide](../importer/README.md). Generated runtime data stays in its existing data location.

| File | Use |
| --- | --- |
| [character-variants-42-lexical-notes.json](character-variants-42-lexical-notes.json) | Extracted lexical examples for offline review. |
| [character-variants-42-lexical-web-audit.json](character-variants-42-lexical-web-audit.json) | Evidence report for those examples; [readable summary](character-variants-42-lexical-web-audit.md). |
| [hsk-level1-import.json](hsk-level1-import.json) | Initial Level 1 replacement counts, input checksums, preserved recording/identity checks and source verification limits; [compatibility summary](hsk-level1-import.md). |
| [hsk-level2-import.json](hsk-level2-import.json) | Initial Level 2 replacement: 200 entries, 400 styled examples, 200 retired legacy example IDs, shared topic checksum and source verification limits; [compatibility summary](hsk-level2-import.md). |
| [hsk-level4-audio.json](hsk-level4-audio.json) | Level 4 exact word/reading audio coverage; [audit and upload state](hsk-level4-audio.md). |
| [hsk-level3-audio.json](hsk-level3-audio.json) | Level 3 exact word/reading audio coverage; [audit and upload state](hsk-level3-audio.md). |
| [hsk-level2-audio.json](hsk-level2-audio.json) | Exact word/reading audio coverage and pending CDN uploads; [source audit and Lovable handoff state](hsk-level2-audio.md). |
| [etymology-association-audit.json](etymology-association-audit.json) | Generated Howell/Shuowen associations, English draft coverage/uncertainty counts, unmatched/duplicate headwords, contextual review targets and BabelStone exclusions; [review guide](etymology-association-audit.md). No historical interpretation or English draft is marked verified. |

The exception is [public/data/radical_variant_etymology_audit.json](../public/data/radical_variant_etymology_audit.json): `src/components/tutor/radical-variant-etymology.tsx` fetches it lazily for variant details. It also supplies the offline contextual-identity importer and its provenance tests, so its public URL remains unchanged.

Files such as `character-variants-v1.4.0.json` contain runtime associations and notes, and the enrichment sidecars contain runtime annotations. They remain in the data directories; descriptive fields inside a loaded dataset do not make the whole dataset an offline report. Historical provenance filenames in source datasets remain recorded text rather than new fetch URLs.
