# Authored English drafts

`001.json`–`099.json` correspond to the
[source batches](../source-batches/README.md). Translation authors save complete
ID-to-English dictionaries through `save_batch` in
`scripts/shuowen-translation-batches.py`; `scripts/import-etymology.py` validates
and attaches them to separate runtime `translation` fields.
Saving uses a temporary `.json.tmp` followed by atomic replacement; temporary
files are not dataset inputs and must not be committed.

These are AI-authored drafts with separately recorded partial editorial corrections, with per-entry exact Chinese-text
hashes and uncertainty flags. Metadata records AI method, unreviewed status,
creation date, exact source-batch hash and the original full license notice.
They are not upstream English translations. Missing batches mean the collection
is still in progress; the importer rejects incomplete publication. See the
[translation guide](../README.md) and [schema](../translation.schema.json).

Root metadata now binds each batch to the supplied review ID and ZIP hash. The
[preserved review](../review/README.md) supplies explicit alternative readings for
runtime presentation; source batches and original Chinese remain unchanged.
