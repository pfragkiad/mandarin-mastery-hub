# Shuowen English translation drafts

This is a separate English layer for the 9,833 individually identified records
in the [preserved Shuowen archive](../shuowen/README.md). It uses local JSON,
with no database, paid translation service or runtime API. The English is newly
AI-authored and **not scholarly reviewed**. It translates the recorded Classical
Chinese, including historical claims; it does not establish modern etymology.

| File/directory | Purpose, producer and consumer |
| --- | --- |
| [source-batches/](source-batches/README.md) | 99 deterministic source batches prepared by `scripts/shuowen-translation-batches.py --prepare`; read by translation authors and the importer. |
| [en/](en/README.md) | Authored English drafts saved through the helper's `save_batch`; consumed by `scripts/import-etymology.py`. |
| [translation.schema.json](translation.schema.json) | JSON Schema 2020-12 for both batch envelopes. |
| [.gitattributes](.gitattributes) | Pins batch JSON to LF so exact source-batch hashes survive Windows checkouts. |
| [.gitignore](.gitignore) | Excludes temporary files used for atomic batch saves. |

Each file has root `dataset_metadata`: upstream repository/revision/archive
checksum, original full Apache-2.0 notice, acquisition date, packaging version and
draft disclaimer. English batches additionally record language, AI method,
unreviewed status, creation date and SHA-256 of their exact source-batch bytes.
These fields do not claim the English was supplied or endorsed by the upstream
project. Original source files and their copyright notices remain unchanged.

Translation keys are original `shuowen:<numeric ID>` identities, never catalogue
IDs or headword-only keys. Every draft binds to SHA-256 of that entry's original
Chinese `text` encoded as UTF-8. Duplicate headwords remain separate entries.
`uncertain` flags unclear passages for a visible note; it is not a review score.

Authors translate every clause faithfully: definitions, described components,
sound relationships, quotations, variant explanations and source qualifications.
Keep exact component glyphs; do not replace a difficult passage with a modern
dictionary gloss or Howell's interpretation. Mark real ambiguities rather than
inventing resolution. Preserve Unicode with UTF-8 when saving through PowerShell;
the helper rejects probable question-mark substitutions and replacement glyphs.

From the repository root:

```sh
python scripts/shuowen-translation-batches.py --prepare
python scripts/import-etymology.py --write
python scripts/import-etymology.py --check
python scripts/import-etymology.test.py
python scripts/shuowen-translations.test.py
```

`--prepare` only extracts pinned originals; it does not translate. Authors use
the Python helper's `save_batch(batch, translations, uncertain_ids=())` to save
complete dictionaries of authored English. The importer requires every original
Shuowen ID exactly once and rejects changed source text, hashes, missing records,
invalid labels and encoding loss. Partial batches must not be published as a
complete collection. Work in this directory can be incomplete while authors
are working; the importer is the publication gate.

Runtime generation attaches a separate `entry.translation` object without
altering `entry.text`, source locators, record associations or catalogue files.
The browser checks the Chinese-text hash again. The shared Etymology renderer
shows English with “AI-generated draft, not reviewed”; the original Chinese
remains accessible in its remembered Advanced disclosure. See the
[frontend contract](../../../../public/data/etymology/README.md).
