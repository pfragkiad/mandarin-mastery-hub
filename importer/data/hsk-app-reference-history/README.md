# Offline HSK reference history

`removed-runtime-metadata.json` preserves the exact historical numbering metadata,
secondary source citations and affected example references removed from browser
vocabulary at the owner's request. It is an offline audit input, never loaded or
served by the application. Source handoffs, source checksums and original ZIPs
remain separate historical evidence.

Generated once by `node scripts/reconcile-hsk-app-references.mjs --write` before
cleanup. Later `--write` runs preserve it; `--check` audits current runtime word,
lesson, curriculum, manifest and neutral-audio identities without changing data.
The shared HSK importer uses `scripts/hsk-runtime-references.mjs` to keep old
numbers out of future runtime exports. The [report](../../../reports/hsk-current-app-references.json)
records whole-app counts. UUIDs, example identities, language content and all
recordings remain unchanged by this cleanup.
