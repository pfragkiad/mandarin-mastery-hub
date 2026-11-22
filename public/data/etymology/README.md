# Etymology frontend handoff

This is a complementary, file-based dataset. It adds source explanations and
association evidence without changing `catalog.json`, any section rows, record
IDs, readings, meanings, radical identities, IDS trees or handwriting geometry.
There is no hosted database. The browser reads these files only through
`src/lib/etymology.ts` (rendered by `src/components/tutor/etymology-section.tsx`
on glyph detail cards); this guide is its integration contract.

## Files, consumers and generators

| File or directory | Purpose and consumer |
| --- | --- |
| [index.json](index.json) | Lazily fetched availability/routing index for exact library record IDs and family-qualified radical forms; includes shard integrity hashes, input fingerprints and full source notices. |
| [glyphs/](glyphs/README.md) | On-demand JSON shards containing original source explanations, separate English Shuowen drafts, exact target associations, related-form suggestions and textual BabelStone occurrence references. |
| [etymology.schema.json](etymology.schema.json) | JSON Schema 2020-12 for index, shard and audit envelopes. Each generated file's `$schema` selects its actual definition. |
| [AGENTS.md](AGENTS.md) | Scoped instructions for agents modifying or integrating this dataset. |
| [HOWELL_PRESENTATION.md](HOWELL_PRESENTATION.md) | Frontend rendering contract covering narrative/composition cases, nested notation, exact-character links and source-preservation checks; no dataset rebuild required. |
| [.gitattributes](.gitattributes) | Keeps generated JSON at LF so index shard hashes survive checkout. |

Generated from the [preserved source collection](../../../importer/data/etymology/README.md)
by `scripts/import-etymology.py`, using `scripts/export-etymology-context.mjs` to
read the app's actual library/radical-form adapters and shared IDS parser.

```sh
python scripts/download-etymology-sources.py --check
python scripts/import-etymology.py --write
python scripts/import-etymology.py --check
python scripts/import-etymology.test.py
python scripts/shuowen-translations.test.py
```

Run from the repository root. Node uses the existing project's `jiti` dependency;
Python generation/tests require only the standard library. `--check` regenerates
in memory and compares outputs, without rewriting them. The source downloader
is a separate, explicit network step; association generation makes no network
requests. Old unexpected shards require explicit review rather than automatic
deletion. The [audit JSON](../../../reports/etymology-association-audit.json) and
[review guide](../../../reports/etymology-association-audit.md) describe coverage
and unresolved associations.

## Browser lookup

Use one shared, browser-safe etymology adapter for Glyphs and Practice. Fetch the
index only when etymology is requested, then fetch just the selected shard. Do not
import these JSON files into page bundles or add them to `loadCatalog()`.

1. Resolve the exact selected `LibraryEntry` using current application adapters.
2. For an ordinary record, use `index.records[entry.id]`. For a radical form, use
   `index.radicalForms[familyId + '/' + formKey]` **before** the ordinary lookup.
   A form's `id` can equal its heading's ID, so the family/form lookup must win.
3. Check the target's exact `glyph`, identity and status against the current
   selected record/form. Missing or mismatching identities fail closed.
4. Fetch `/data/etymology/` plus the recorded relative `file`. Verify its original
   response-byte SHA-256 and length against `index.shards[file]`, then validate the
   envelope/version and select `shard.characters[target.glyph]` exactly.
5. Find the matching association in `character.associations`, or in
   `character.radicalForms` by **family ID + form key + exact glyph**. Render only
   the entries allowed by its status, resolving its entry IDs in that glyph's
   `entries` array. The index is a routing hint; the shard retains the full target.

All files have root `dataset_metadata`. Its `version` identifies our packaging,
`schemaVersion` identifies the JSON contract, and entry `sourceRecord.revision`
identifies upstream content. `import_date` is the original acquisition date,
not a regeneration timestamp. There is intentionally no `verified` etymology flag.

## Association status and display rules

| Status | Meaning and permitted interpretation |
| --- | --- |
| `exact-headword` | The selected **Characters** record has exactly the source's written headword. Display separately attributed source explanations, labeled as unreviewed interpretations/historical dictionary text. This does not establish scholarly correctness. |
| `context-review-required` | Exact spelling exists for a Component, radical heading or radical form. Its role has not been established. Do not present the standalone headword's explanation as that component/radical's origin. |
| `blocked-contextual-identity` | An existing reviewed contextual identity contradicts automatic lexical inheritance. `entryIds` is empty; `candidateEntryIds` is review evidence only. Never display these candidates as this variant's definition or origin. |
| `no-exact-headword` | No imported entry has this exact headword. This does not mean the glyph has no history or meaning. |

Every target has `historicalRoleVerified: false`. `relatedFormSuggestions` come
only from the active, recorded written-form association file and retain its notes;
they never copy an explanation onto another character. They remain suggestions
requiring review even for apparently ordinary simplified/traditional pairs.

Examples to retain as integration checks:

- `Characters:古`: both source entries exist; agreement/disagreement remains
  unreviewed. Do not merge their explanations into an unattributed narrative.
- `Characters:发`: no exact entry; 發 and 髮 can appear as separately identified
  related-form suggestions. Neither explanation becomes an entry for 发.
- Family `96`, form `96-1`, glyph 王: the jade identity blocks the standalone 王
  headword notes. `Characters:王` keeps its own exact-headword association.
- Shuowen's 舌 entries `shuowen:941` and `shuowen:1437` remain separate.

## Source entries and comparison

Entries contain `id`, `sourceId`, exact `headword`, `contentKind`, `language`,
recorded `text`, `reviewStatus`, `sourceUrl` and a checksum-bound `sourceRecord`.
Howell IDs are locally derived `howell:<lowercase codepoint>` identities; the
locator includes original entry ordinal and line range. Shuowen IDs preserve its
actual numeric IDs as `shuowen:<id>`; locators retain archive member and original
member SHA-256. Neither source's entry IDs replace catalogue IDs.

Howell text is English author interpretation (`author-interpretation`, `en`).
Shuowen `text` is the original historical Chinese explanation
(`historical-dictionary`, `lzh`). A separate `translation` holds a newly authored
English AI draft, with `language: "en"`, `method: "ai-generated"`,
`reviewStatus: "unreviewed-ai-draft"`, `sourceTextSha256` and `uncertain`.
The text hash binds English to that exact original entry; the browser drops a
stale translation while retaining the original. Show “AI-generated draft, not
reviewed” beside English and any uncertainty note. Keep the unchanged Chinese
behind its remembered Advanced disclosure. These drafts translate the historical
source; they are not verified modern etymology. See the
[translation guide](../../../importer/data/etymology/translations/README.md).
Root metadata's `translation_layer` records method, status and coverage; original
acquisition dates remain distinct from English batch creation dates. Other
original fields/commentary stay in the archived sources. Japanese readings,
shinjitai, Shuowen indexes/components and seal-font codes are not imported as
Mandarin pronunciation, catalogue identity, graphical decomposition or geometry.

The handoff packaging version is `1.1.0`; the independent translation layer is
`1.0.0`, and the JSON envelope `schemaVersion` remains `1`. The source collection's
own version/revision is preserved separately. Regeneration requires complete
English coverage of the 9,833 original Shuowen IDs, including source-only forms.
Translation fields remain additive/optional in schema version 1 for older
payloads; the `1.1.0` generator and coverage tests require the complete new layer.

Render source text as text, preserving notation, punctuation and cross-reference
markers such as Howell's `#`. Do not execute markup, feed historical wording into
Mandarin speech or overwrite lexical translations. Owner-approved exception for
links: a hanzi written in Howell's text may link to the library record with exactly
that written form (Characters, then Components, then a Radicals card of the same
glyph; never a look-alike, canonical or related form), showing that record's own
reading and audio. Such a link is navigation only, not an identity claim about the
historical element Howell describes. Howell's notation (`+` parts, `→`/`←`, `#`,
`*…*` modern Japanese meanings, per its Key to Symbols) may drive layout only;
every character of the recorded text must remain displayed. Future structured historical claims need explicit source locators
and a separate review process, rather than editing the original text.

`comparison.coverage` reports `both`, `howell-only`, `shuowen-only` or `none`.
Shared headwords have `interpretationStatus: unreviewed`; others are `not-compared`.
These are operational coverage checks, not computed historical agreement scores.
English drafts do not constitute a two-source comparison. No text-similarity
judgment or scholarly agreement review has been performed.

## BabelStone graphical evidence

`babelstone` is either null or a textual structural reference with source sidecar,
canonical-envelope checksum, current and recorded tree checksums, status and
direct-G alternatives. Only direct-G alternatives from the existing shared parser
are eligible. Stale bindings export no alternatives; unsupported expressions
retain raw notation and qualifiers with no inferred occurrences.

Each parsed occurrence retains the exact token and its array `path` within that
alternative. The two 木 occurrences in 林 are distinct at `[0]` and `[1]`.
`headwordEntryIds` links only exact source headwords of the token; it does not
establish that a component carries that historical meaning in the owner.
Every occurrence is `graphical-membership-only`, with
`historicalRoleVerified: false`. 人 is not substituted for 亻 in 休.

Numbered tokens, e.g. `{48}`, remain `babelstone-numbered` and have no lexical
headword references. Use `resolveBabelStoneComponent()` and the existing
source-table/font presentation when displaying them; suggested substitutions and
PUA glyphs never become catalogue or etymology identities.

Before using graphical references, require the current owner tree's checksum to
match the exported binding and retain the exact source expression/qualifiers/path.
These exports contain **no stroke mapping or geometry validation**. Reusing ink,
outlines, stroke names or group playback still requires the original independent
enrichment/geometry validation pipeline; etymology never grants such bindings.

## Licensing and reproducibility

Every distributable JSON shard/index contains both original Howell MIT notices,
Shuowen's full Apache-2.0 license/copyright notice and the recorded structural
provenance notice. Licenses remain source-specific. Preserve these when sharing
JSON; do not reduce the notices to an MIT label or claim a font license.

The original upstream file checksums preserve original bytes. Repository input
fingerprints and the embedded repository-authored structural notice normalize
CRLF to LF, so Windows and Linux produce identical metadata. Downloaded upstream
MIT/Apache notices retain their original source bytes inside the JSON strings.
The importer tests simulate both notice checkouts without modifying source files.
Structural envelope fingerprints use compact
`JSON.stringify(envelope)` UTF-8 without a trailing newline. These are distinct
from raw geometry hashes and are explicitly named `sidecarCanonicalSha256`.
The original source manifest itself is LF-pinned. The index pins every generated
shard's exact bytes; publish the index and all matching shards together.

Future integrations should preserve the existing reviewed radical-variant notes,
source-info presentation, URL selections and shared decomposition renderer. This
dataset supplements those features and does not replace their existing evidence.
