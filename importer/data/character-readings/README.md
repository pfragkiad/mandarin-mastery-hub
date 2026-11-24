# Character reading and meaning sources

This offline audit covers every Characters tuple with multiple explicitly recorded
readings. It distinguishes different meanings, overlapping regional usage, shared
meanings, and unresolved exact-reading discrepancies. Original character rows,
etymology text, audio attachments, script identities and geometry stay intact.
An explicit owner-requested pronunciation reconciliation may add a guarded runtime
`readingRevisions` overlay with the complete original tuple and dictionary evidence.

| File | Purpose | Consumer / generator |
| --- | --- | --- |
| `.gitattributes` | Keeps checksum-bound JSON and downloaded source bytes unchanged across Git checkouts. | Git; maintained with the pinned inputs. |
| `review.json` | Editorial decisions requested by the project owner: all 75 exact original tuples, explicit reading-to-meaning mappings, regional/historical notes and unresolved reasons. Existing five reviewed mappings remain intact. | Maintained by source review; read by the importer. |
| `manifest.json` | Review checksum, exact source URLs, acquisition/release dates, byte counts and SHA-256 bindings. | Recorded at source acquisition and explicit review updates; checked by the importer. |
| `cedict_1_0_ts_utf-8_mdbg.txt.gz` | Original unmodified MDBG CC-CEDICT export, release 2026-11-24. Its header contains attribution and license notices. | Downloaded from [MDBG](https://www.mdbg.net/chinese/dictionary?page=cedict); read by the importer to retain exact source-entry evidence. |
| [sources/](sources/README.md) | Exact compressed Han Dian pages and the original Unicode source PDF used for exceptional readings. | Checksum-bound offline evidence; never served or imported by the browser. |

CC-CEDICT is published by MDBG and community contributors under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), building on CEDICT
by Paul Denisowski. Newly adapted English glosses from it are distributed under
the same license, with attribution and source links on each affected card.
The mapping is an editorial adaptation, not an unchanged upstream dictionary.
Unchanged Unihan definitions and existing MOE-reviewed records retain their own
attribution. Han Dian and Unicode snapshots retain their source notices and are
evidence only; they are not added as learner-facing historical narratives.

Run from the repository root:

```text
python scripts/import-reading-meanings.py --write
python scripts/import-reading-meanings.py --check
python scripts/import-reading-meanings.test.py
```

The importer verifies all source/review checksums and exact reviewed tuples, checks
complete inventory coverage, and updates only `readingMeanings` and explicitly
reviewed `readingRevisions` metadata inside
[catalog.json](../../../public/data/catalog.json). It writes the complete
[audit JSON](../../../reports/character-reading-meanings-audit.json) and
[readable report](../../../reports/character-reading-meanings-audit.md).
Unresolved cases never receive a guessed runtime split. The browser uses the
existing catalogue loader and meaning renderer; no source archive enters its bundles.

For **伲**, the card uses dictionary-attested `nì / nǐ`: dialectal I/we/my/our,
and archaic you. Its original Unihan `ní / nǐ` tuple and audio bindings remain
unchanged on disk. The exact-tuple revision applies only at hydration and adds
the existing `cmn-syl-ni4` recording for `nì`, already attested under other glyphs.
The source popup explicitly discloses Unicode's different reading and links MOE,
Han Dian and the 2023 Unicode proposal. It does not label Unihan as a typo or
present a Mandarin syllable recording as Shanghai dialect audio. **侬/儂** is a
different character and supplies neither this record's identity nor its reading.

Related guides: [catalogue contract](../../../public/data/catalog.md),
[importer inputs](../README.md), [scripts](../../../scripts/README.md).
