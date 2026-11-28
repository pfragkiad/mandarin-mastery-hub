# Advanced sentence drafting inputs

Owner-requested draft examples for the official shared Levels 7–9 list. Each
range JSONL contains one individually authored record per official vocabulary ID:
`id`, `headword`, `style`, `hanzi`, and `english`. Pinyin is checked and added during
the shared assembly pass. These are editorial drafts, not official syllabus text
or independently reviewed corpus evidence.

The range files partition IDs 5401–11000. They are offline inputs only; the source
PDFs, word identities, runtime vocabulary, existing recordings and review files
must remain unchanged during sentence drafting. Final assembly checks complete
coverage, target readings, uniqueness, language fields and file sizes.

## Files and reproduction

| File | Purpose and producer |
| --- | --- |
| `5401-7267.jsonl` | 1,867 original sentence/translation drafts for the first range. |
| `7268-9134.jsonl` | 1,867 original sentence/translation drafts for the middle range. |
| `9135-11000.jsonl` | 1,866 original sentence/translation drafts for the final range. |
| `pinyin-0.0.1.json` | Assisted readings from `scripts/draft-hsk-level7-pinyin.py`; exact per-sentence hashes, source tuples, target spans, contextual adjustments and review flags. |
| `.gitattributes` | Pins draft/overlay bytes without Git line-ending conversion. |

Normal assembly needs only Python's standard library and these frozen inputs:

```sh
python scripts/prepare-hsk-level7.py --write
python scripts/prepare-hsk-level7.py --check
node scripts/validate-hsk-level7.mjs
```

Reproducing assisted readings additionally needs `pypinyin==0.55.0`,
`jieba==0.42.1` and the repository's Node dependencies. Install into an external
tool directory, then run:

```sh
python scripts/draft-hsk-level7-pinyin.py --tools-dir <directory> --check
```

`--write` regenerates the overlay after approved draft/rule edits; then refresh
the explicit [sentence manifest](../sentence-manifest.json) and assemble again.
Existing text-code/inventory provenance records explicitly normalize CRLF to LF
for portable checksums; draft text and official source bytes remain exact.
Offsets in each overlay `target` refer to the original Chinese string including
punctuation, using Unicode code points. They are not syllable indices.

These examples use word-grouped pinyin, contextual 一/不 tones and neutral
particles while retaining dictionary third-tone spelling. Positional alignment
is structural validation only. Source reading/POS differences and remaining
context-review flags are explicit; independent native-language review is pending.
