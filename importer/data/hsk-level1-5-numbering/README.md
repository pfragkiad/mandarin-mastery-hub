# Official-ID migration inputs for Levels 1–5

`legacy-bindings.json` freezes the pre-migration runtime UUID, official ID,
recorded reading, source identity and exact audio attachment for all 3,600
Level 1–5 entries. It is an offline migration input, never application data.
The existing versioned handoffs and audio manifests retain their original bytes.
The later [supplemental audio package](../missing-audio/README.md) does not
rewrite this frozen ledger: its validator explicitly permits only the 8 source-exact
and 131 listening-reviewed new attachments while requiring every pre-existing audio
object to remain identical (139 additions across Levels 1–5).

The migration uses the [current official PDF extraction](../hsk-level7/README.md)
and the [validated mapping](../../../reports/hsk-level1-5-official-id-crosscheck-validation.md).
New versioned handoffs preserve `legacy_syllabus_id`, correct the reviewed POS
issues and retain official citation pinyin separately from recorded pronunciation
where they differ. Current vocabulary keeps UUIDs and compatible audio.

Canonical lesson packages retain their original version-bound numbers and bytes.
The shared lesson/reference adapter resolves those exact recorded identities
against current vocabulary using the explicit legacy mapping; lesson, placement,
question and progress IDs remain unchanged. Importer validation uses a read-only
legacy-number view, never a numeric rewrite of the source archives.

## Reproduce

Run from the repository root:

```sh
python scripts/review-hsk-level1-5-ids.py --check
python scripts/reconcile-hsk-level1-5-numbering.py --write
python scripts/reconcile-hsk-level1-5-numbering.py --check
```

Then run `node scripts/import-hsk-levelN.mjs --write` for each level 1-5.
The current sources and audio manifests are recorded in the
[machine audit](../../../reports/hsk-level1-5-official-numbering-migration.json).
The [runtime audit](../../../reports/hsk-level1-5-official-numbering-import.json)
records preservation and byte counts.
