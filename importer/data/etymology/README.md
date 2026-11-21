# Etymology source material

This is the initial file-based etymology source collection. It uses no database
service or subscription. These are importer inputs, outside `public/` and frontend
imports; the application does not currently fetch or display them.

| File or directory | Purpose and consumer |
| --- | --- |
| [manifest.json](manifest.json) | Root `dataset_metadata` with collection version, acquisition date, source URLs, disclaimer and complete source-specific copyright/license notices; source revisions, scope limits and checksum inventory follow under `sources`. Generated and audited by the downloader. |
| [manifest.schema.json](manifest.schema.json) | JSON Schema 2020-12 for the actual manifest, requiring dataset metadata, complete-notice fields and the unreviewed-source status. Authoring/validation only. |
| [howell/](howell/README.md) | English author interpretations, original PDF, extracted text and both MIT notices. |
| [shuowen/](shuowen/README.md) | Original upstream archive containing individually identified Chinese JSON records, Apache-2.0 notice and source-format documentation. |
| [.gitattributes](.gitattributes) | Prevents Git line-ending conversion of checksum-bound source files. |

## Acquire and verify

From the repository root:

```sh
python scripts/download-etymology-sources.py --download
python scripts/download-etymology-sources.py --check
python scripts/download-etymology-sources.py --refresh-metadata
```

The downloader pins both repositories to recorded commits, checks Howell's known
Git blob identities, preserves original bytes and records SHA-256 checksums. It
reads Shuowen JSON members inside the archive without extracting or executing
anything. `--check` performs an offline integrity and source-format audit. Repeating
`--download` checks a completed collection without fetching it again. Source
updates require an intentional revision/manifest change; changed files are never
silently overwritten. No third-party Python packages are required.

`--refresh-metadata` first checks all original files and regenerates only manifest
metadata from those verified files. It preserves the original retrieval timestamp,
the acquisition-derived `import_date`, every source revision and checksum. It
does not redownload or edit any original material. `--check` also rejects missing,
changed or incomplete embedded notices.

## Dataset metadata and notices

The manifest's root `dataset_metadata` is self-contained. `version: "1.0.0"`
identifies our source-collection packaging; root `schemaVersion` identifies the
JSON structure, and each source's `revision` identifies its upstream commit.
The actual `import_date` is derived from `retrievedAt`, not from the day metadata
is regenerated or an illustrative date in a proposed schema.

The collection records `license: "source-specific"`: Howell and Shuowen retain
their respective MIT and Apache-2.0 terms. `license_notices` embeds both complete
Howell MIT notices and Shuowen's full Apache-2.0 license. Each notice retains its
exact source text, copyright statement, original paths/URL and license-file
checksum. Shuowen's copyright statement comes from its verified upstream README;
the MIT copyright statements come from the individual license files. A short
`"MIT"` label or educational disclaimer does not replace the original notices.

The initial snapshot has **6,376 Howell entries** and **9,833 Shuowen records with
9,815 distinct headwords**. Preserve the separate Shuowen IDs even where headwords
repeat. These are source inventory counts, not verified claims or coverage of our
catalogue. The separate [association handoff](../../../public/data/etymology/README.md)
now records exact matches and context-review targets without modifying these inputs.

## Integration boundary

Keep the source collection unchanged. `python scripts/import-etymology.py --write`
generates separate, schema-versioned JSON under `public/data/etymology/`, plus an
association audit under `reports/`. Its `--check` mode verifies regeneration.
The runtime schema describes the actual index and shard files; frontend loading
still needs one lazy, browser-safe adapter following the handoff guide.

Character exports carry root `dataset_metadata` for their included sources,
with the corresponding complete notices. Do not label a mixed
source export as MIT or omit the Apache notice. Keep embedded notices with
redistributed JSON so their availability does not depend on a separate web link.

Each generated entry retains its source ID, revision, file checksum, original
entry locator, exact written form, content kind, recorded text/language and review
status. Multiple interpretations and duplicate source records stay independent.
Links to existing catalogue IDs use exact recorded identities; unknown matches
remain unlinked. Source interpretations are distinct from reviewed modern
etymology, graphical IDS trees, lexical meanings, Mandarin audio and stroke
geometry. Do not propagate explanations through guessed simplified/traditional,
Japanese shinjitai, radical-family or shape equivalences.

Use plain text for explanations; preserve source notation such as Howell's `#`
cross-references until it has an explicit parser and reviewed bindings. Preserve
all original Shuowen fields, including commentary and source-specific seal-font
codes, without rendering font codes as ordinary character identities. Historical
images and fonts, if acquired later, require their own provenance and licenses.

## Other researched resources

- [Xiaoxue Tang](https://xiaoxue.iis.sinica.edu.tw/): its
  [official CC0 notice](https://xiaoxue.iis.sinica.edu.tw/License/License) covers
  query-result glyph images and associated glyph attributes. No image collection,
  font or phonological data has been downloaded here; image acquisition and exact
  historical-form identities need a separate import design.
- [Schuessler reconstructions](https://zenodo.org/records/14567004): candidate for
  historical phonology. The claimed CC-BY-4.0 full ABC etymology dataset was not
  established during research; no records have been imported.
- [yigezi](https://github.com/Ivan666jjj/yigezi): useful source directory and
  reference implementation. Its third-party data has separate terms, and its
  current notices flag the main Old Chinese source as lacking explicit open
  authorization. Its embedded dataset and fonts have not been copied. The
  independently licensed Shuowen source is acquired directly instead.

See [the parent guide](../README.md), [the importer overview](../../README.md),
[scripts](../../../scripts/README.md) and the
[catalogue contract](../../../public/data/catalog.md). Original material is
reusable under its recorded license but has not undergone scholarly review here.
