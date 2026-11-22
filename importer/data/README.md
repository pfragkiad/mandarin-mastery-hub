# Importer-only source inputs

Keep source files required only for offline data generation here, grouped by dataset. These files are outside the app's public asset directory and are not imported by frontend modules. A public Git repository can still expose their contents.

| Directory | Usage |
| --- | --- |
| [radical-identities/](radical-identities/README.md) | Supplied exact-identity review and pinned Unicode records consumed by `scripts/import-radical-identities.py`. |
| [etymology/](etymology/README.md) | Pinned Howell and Shuowen sources, licenses and schema-versioned checksum manifest; acquired/audited by `scripts/download-etymology-sources.py`. Not loaded by the app. |
| [lessons/conversational-mandarin/](lessons/conversational-mandarin/README.md) | The 16 user-provided audio transcripts and the 880-row extraction audit index behind the Conversational Mandarin lessons. Editorial/source material only; never learner data or app input. |
| [hsk-audio/](hsk-audio/README.md) | Pinned Shtooka metadata and exact Level 2 audio-cmn recording manifest; its recordings are attached as Lovable CDN URLs (the temporary MP3 handoff has been removed). |

Preserve raw source bytes, encoding, line endings, version information, and provenance: several output identities include SHA-256 hashes of these files. Importer scripts currently live under `scripts/`; this directory contains their inputs.

Generated application datasets belong in [public/data/](../../public/data/README.md) or [src/data/](../../src/data/README.md). Standalone analysis outputs belong in [reports/](../../reports/README.md). Some source files are also used by the running app and retain their public URLs; see [the importer overview](../README.md) for those exceptions and [catalog.md](../../public/data/catalog.md) for the catalogue contract.
