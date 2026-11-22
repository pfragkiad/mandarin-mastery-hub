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
| [review/](review/README.md) | Preserved partial editorial handoff, manifest and schema. The review importer updates English/flags; the etymology generator attaches explicit alternative Chinese readings without changing original sources. |

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

For external review, run `python scripts/export-shuowen-review.py` from the
repository root to create the single UTF-8 handoff at `reports/shuowen-english-review.txt`.
This generated review export stays local and uncommitted; regeneration uses the
preserved importer inputs instead.
It keeps each exact key, Chinese headword/explanation and English draft on one
line, with visible separators and a blank line between entries. Existing
uncertainties and original source notices remain included. This is a review
export; edits to it are not automatically treated as approved source changes.

The supplied [2026-11-22 partial review](review/README.md) applies 1,938 English
edits and clears 16 uncertainty flags (899 remained at that stage). AI authorship and the legacy
`unreviewed-ai-draft` status remain recorded; `editorialReview` adds the narrower
partial-review scope for the 1,943 changed entries. The 28 alternative source
readings are separate from original Chinese, including seven changed headwords;
never copy these readings into catalogue identities or silently replace source
text. Use the review importer, not new freehand edits, to preserve the recorded
working-copy binding. Nothing in this handoff marks the whole corpus verified.

The subsequent [uncertainty-only follow-up](review/uncertain-followup.json) supplies
884 still-uncertain entries and six additional English corrections. All their
flags stay uncertain. Fifteen previously uncertain IDs are absent from the
extract initially stayed uncertain, leaving 899 at that stage. Follow-up provenance
is bound separately to its ZIP and the primary review; it is not a new complete
9,833-entry review or an instruction to clear omitted flags.

The subsequently supplied [full v2 working copy](review/full-v2.json) includes
all 9,833 entries and explicitly resolves those 15 omitted cases, with 11 further
English edits. It agrees exactly with the subset's 884 still-uncertain entries.
That stage left **884 uncertain drafts**. Original Chinese and associations
remain unchanged, and all review stages remain separately preserved.

The subsequent [v3 case review](review/external-v3.json) reports 222 individually
checked cases, 166 English revisions and 109 cleared flags. **775 remain uncertain**,
including 662 not checked in that pass. Checked cases retain supplied reasons
and citations without turning the full corpus into verified translations. No
review pinyin, graphical derivation or Chinese source correction is applied to
catalogue identities or pronunciation.
