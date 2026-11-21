# Howell source snapshot

Pinned upstream: `conscientiousCode/Etymological-Dictionary-of-Han-Chinese-Characters-Database`
at commit `377b75896d5fbe454c6dd3d643311c16f0395469`.

| File | Purpose and consumer |
| --- | --- |
| `howell_etymology_text_database.txt` | Original labelled UTF-8 database, 6,376 entries. Future importer input; currently inspected only by the source audit. |
| `howell_etymology.txt` | Original PDF-to-text extraction for checking parsing issues. |
| `EtymologicalDictionaryOfHanChineseCharacters-HowellAndMorimoto.pdf` | Original dictionary PDF for source comparison and editorial review. |
| `LICENSE - Etymological Dictionary of Han Chinese Characters.txt` | MIT permission notice naming Lawrence J. Howell. Retain with reused content. |
| `LICENSE - Etymological Dictionary Parser and Output.txt` | MIT notice naming Daniel B. Herman for parser/output. Retain with reused output. |
| `upstream-LICENSE` | Original top-level pointer to the two full notices. |
| `upstream-README.md` | Unmodified upstream description of permission, provenance and format. |

All files above retain their original bytes. Original paths, download URLs and
checksums are in [the manifest](../manifest.json). Download/audit with
`python scripts/download-etymology-sources.py --download` / `--check` from the
repository root. Nothing here is loaded by the application.

The source records Japanese on/kun readings and shinjitai. Those fields are not
Mandarin pronunciation or proof of a Chinese simplified-form relationship. Keep
author interpretations attributed and unreviewed until separately checked. No
upstream scripts are executed. See [the collection guide](../README.md).
