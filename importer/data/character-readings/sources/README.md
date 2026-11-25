# Preserved supplementary reading evidence

`<lowercase-codepoint>.html.gz` stores the exact downloaded Han Dian HTML bytes in
lossless gzip form; `unicode-2019.pdf` is the unmodified Unicode-hosted dictionary
excerpt document on 叚 and 氾 (and 剋), and `unicode-2023.pdf` records the 伲
pronunciation proposal and regional preference. `5256.html.gz` preserves the 剖
entry confirming `pōu / pǒu` with shared meanings; the review also links the
independently verified MOE and CNS11643 web entries. Original source and stored-file SHA-256 hashes,
URLs and acquisition dates are in [the manifest](../manifest.json). The filenames
refer to exact Unicode glyphs, not normalized or related characters.

These are offline evidence inputs checked by `scripts/import-reading-meanings.py`.
They are not executed, served, imported into frontend bundles or interpreted as
historical claims. The separately maintained [review](../review.json) records the
specific basic, detailed, Guoyu or historical sections used, including disagreements.
Preserve source bytes and notices. See [the parent guide](../README.md) for licensing,
consumers, generation and the complete audit outputs.

`5d3e-*-excerpt.json` preserves short attributed evidence for 崾: the official
MCA Geographical Names Institute article (`yào` in `崾崄`), the official MOE entry
(`yǎo` mountain name), and the authors' *Cishu Yanjiu* 2025(4) study of regional
overlap. `5256-pronunciation-excerpt.json` records Beijing's mainland `jiě pōu`
guidance. These are explicitly labeled extracts, not full article snapshots.
Capture methods distinguish direct-download fingerprints from browser-verified
quotations. Each excerpt's exact stored bytes are pinned by the manifest, and
`.gitattributes` prevents checkout line-ending conversion. No full articles are
redistributed; URLs retain the complete source context.
