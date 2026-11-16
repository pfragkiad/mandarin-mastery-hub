# HSK Level 1 v1.6.0 compatibility and replacement

The supplied [main handoff](../importer/hsk/hsk3_level1_1.6.0.json) and [topics sidecar](../importer/hsk/hsk3_topics.json) can replace the current Level 1 material through [the dedicated importer](../scripts/import-hsk-level1.mjs). They are not directly compatible with the vocabulary API shape or the legacy XLSX phrase importer.

| Check | Result |
| --- | --- |
| Headwords and syllabus IDs | All 300 ID/headword pairs exactly match the previous records. |
| Meanings | All 300 match the existing meanings after splitting source semicolons into the API's meaning array. |
| Word pinyin | 161 display strings differ; 160 differences are spacing/case presentation. 谁 adds the alternate `shuí` alongside existing `shéi`. |
| Examples | 600 complete, unique Chinese sentences, each with pinyin and English; 252 retain an existing exact sentence and example UUID. |
| Tokenization | All 300 primary headword readings and all 600 sentence readings split uniquely using the app's shared aligner and recorded syllable inventory. |
| Topics | The 20-topic sidecar exactly matches the embedded taxonomy. All primary/secondary assignments resolve; 98 words have secondary topics. |
| POS | Updated taxonomy replaces spreadsheet classifications; secondary roles and all 61 explanatory notes are retained. |
| Recordings and identities | All 300 word UUIDs, existing syllabus provenance and 276 word recordings retained exactly. No sentence recordings supplied or fabricated. |
| Other material | All 201 records outside Level 1 remain exactly equal to the prior dataset. |
| Removed material | All 240 unofficial Level 1 phrases removed, as requested. Their orphan category rows are removed. |
| Result | 501 records: 300 Level 1 words, 200 Level 2 entries, one unclassified phrase. |

Preprocessing maps snake_case source fields to the API; creates deterministic topic/example UUIDs; preserves whole pinyin text while generating aligned character tokens; and attaches source filenames, versions, source IDs, input checksum and editorial statuses. Primary and secondary topics are available consistently in Vocabulary, Flashcards and Drawing. Vocabulary details show both conversational and written examples with independent audio controls. New vocabulary font coverage includes 性 and 码.

The handoff labels examples and translations as editorially reviewed, without native-speaker certification or individual corpus attestation. Its IDs are inherited from earlier material and are not independently certified official serial numbers. This import validates agreement with the existing repository identities and preserves their provenance; it does not claim a fresh official-syllabus or linguistic verification. Entries stay draft and character tokens stay unreviewed. Sentence pinyin comes from the supplied text, including its contextual readings and sandhi.

The [machine-readable initial replacement report](hsk-level1-import.json) records original/final counts, source checksums, topic counts and the source's full verification statement. Re-running the importer produces a current-to-current report (zero removed phrases), so the checked-in initial replacement report should remain historical evidence.

See [the source README](../importer/hsk/README.md) for commands, field mapping rules and font source requests.

## Validation

- Eight importer boundary tests pass, including repeat-import equality and rejection of identity, taxonomy and pinyin mismatches.
- TypeScript checking and the production build pass.
- The full application suite reports 858 passing tests and one unchanged failure in `src/lib/meaning-text.test.ts:39` (a standalone translation-trimming assertion). Its implementation and test are unchanged by this import.
- On this machine's Node 26, Vitest workers need `NODE_OPTIONS=--no-experimental-webstorage` to use jsdom's storage instead of Node's unconfigured native storage. This was applied only to the validation command; project configuration is unchanged.
