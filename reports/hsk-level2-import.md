# Level 2 handoff compatibility

The owner-prepared [v1.0.2 handoff](../importer/hsk/archive/hsk3_level2_1.0.2.json) replaced only Level 2 study content in [vocabulary.json](../src/data/vocabulary.json). The [initial report](hsk-level2-import.json) records checksums, counts and the source's verification limits.

| Check | Result |
| --- | --- |
| Identities | All 200 ID/headword pairs (301–500) match existing entries; UUIDs, syllabus provenance, creation times and explicit kinds remain exact. |
| Kinds | 196 words and four syllabus phrases: 不好意思, 没意思, 为什么, 有意思. Distinct 过 and 花 records stay separate. |
| Examples | All 200 legacy example IDs retired; exactly 400 supplied examples imported, conversational then written. Seventeen supplied sentences repeat legacy text but have new handoff IDs/provenance; no legacy records or translations are carried forward. |
| Readings | All 200 headwords and 400 sentences align uniquely against the shared recorded syllable inventory; source readings, word spacing, case and punctuation remain intact. |
| Topics | Embedded topics exactly match the shared 20-topic v1.1.0 sidecar; category UUIDs remain shared with Level 1. Thirty-two entries have secondary topics. |
| Provenance | New source/checksum, POS labels, notes, original syllabus labels and verification status recorded; earlier spreadsheet POS references remain in secondary sources. |
| Recordings | The original Level 2 entries/examples have no attached audio; no recordings supplied or fabricated. The importer retains compatible entry audio and any later attachment to the exact new sentence ID/text/reading. |
| Other records | Level 1's 300 entries, all 600 Level 1 examples, the unclassified sample and category rows remain unchanged. Total recorded entries stay 501. |
| Repeat import | Exact same vocabulary and timestamps; 400 new example IDs preserved, zero legacy examples retired on subsequent runs. |
| Fonts | Added seven-character Google Fonts CDN subsets for retained Chinese syllabus POS annotations, covering both vocabulary font families without repository media binaries. |

The source claims transcription of the November 2025 syllabus; importing validates agreement with existing repository identities, not a new independent official-syllabus audit. Its examples, meanings, translations and sentence pinyin are editorial and not native-speaker certified. Entries stay draft and tokens unreviewed; structural alignment does not certify linguistic correctness.

Regenerate/audit using [the source guide](../importer/hsk/README.md). The frontend's existing example renderer and sentence-style filters consume the new records directly. Example-derived phrases continue to come from entries explicitly classified as words; the four syllabus phrases keep their own examples in their detail cards.
