# Shuowen.org source snapshot

Pinned upstream: `shuowenjiezi/shuowen` at commit
`6553a350763ce4feca2c5d1cc2cad7e594dc2975`.

| File | Purpose and consumer |
| --- | --- |
| `upstream.zip` | Unmodified GitHub source archive. Contains 9,833 original `data/<id>.json` entries representing 9,815 distinct headwords, plus the upstream documentation. Future importer input; currently read only for integrity/format checks. |
| `LICENSE` | Exact copy of the archive's Apache-2.0 license, for readable attribution/distribution notices. |
| `upstream-README.md` | Exact copy of the archive's source description and attribution. |
| `upstream-FORMAT.md` | Exact copy of `doc/FORMAT.md`, documenting source fields, commentary and source-specific seal-font codes. |

The archive avoids adding thousands of individual source files to the repository
while preserving every original JSON member's bytes, IDs, ordering and fields.
Do not deduplicate repeated headwords or assign entry indexes/variant forms to
catalogue records automatically. Historical explanations and commentary are not
automatically verified modern etymology; font codes are not lexical identities or
stroke data. No bundled upstream program is executed.

Source paths, URLs and checksums are in [the manifest](../manifest.json). Download
and verify from the repository root with
`python scripts/download-etymology-sources.py --download` / `--check`. No files in
this directory are served by the application. See [the collection guide](../README.md).
