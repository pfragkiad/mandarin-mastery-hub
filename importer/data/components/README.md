# Component metadata patch guide

This directory holds importer-only component metadata proposals. Read this guide
before applying the supplied [CJK Component Metadata Patch](cjk_component_metadata_patch.md).
The handoff is a review queue, not an executable patch or verified dictionary.

## Files, consumers and generation

| File | Purpose | Consumers / generator |
| --- | --- | --- |
| [.gitattributes](.gitattributes) | Preserves checksum-bound source/review bytes across Git checkouts. | Git; maintained with the inputs. |
| [cjk_component_metadata_patch.md](cjk_component_metadata_patch.md) | Original owner-supplied suggestions: 26 components missing both fields, four missing pinyin, 30 missing translations, and six proposed resolver mappings that overlap those lists. | Offline agent/editor review; the identity importer checks its SHA-256 but never parses its suggestions. Preserve its supplied bytes. |
| [radical-family-metadata-review.json](radical-family-metadata-review.json) | Explicit selection of five exact Unicode symbol/ideograph pairs and a separate descriptive-only decision for 龶, with source/proposal checksums. | `scripts/import-radical-identities.py` validates the selected pairs against the pinned Unicode property and each symbol's independently recorded family. 龶's attributed description is maintained in the shared presentation adapter. |
| [form-reference-review.json](form-reference-review.json) | Four exact source/target tuple bindings, dictionary relationship evidence and explicit shared-meaning versus related-only decisions. | `scripts/import-component-form-references.py` compiles a small browser-safe presentation subset into `src/data/component-form-references.json`. |
| [README.md](README.md) | Application workflow, evidence requirements and validation for that handoff. | Maintainers and agents; maintained manually. |

The supplied patch's SHA-256 is
`7d8e5e353cf712367aa3761586dcf4787712261907858b7ca8978be3ebd27d3b`.
Keep corrections and decisions separate from that source. Put standalone review
reports under [reports/](../../../reports/README.md). Generated runtime data belongs
under [public/data/](../../../public/data/README.md), following the
[catalogue contract](../../../public/data/catalog.md). Never import this Markdown
into the browser bundle.

## Applied resolver review

The five family proposals now have exact, pinned
[Unicode Equivalent_Unified_Ideograph evidence](../radical-identities/EquivalentUnifiedIdeograph.txt),
separate from NamesList cross-references:

| Component | Exact Unicode symbol | Family | Result |
| --- | --- | --- | --- |
| 𡯂 (U+21BC2) | ⺑ (U+2E91) | 43 尢 | Imported exact variant identity; shared family meaning/reading fallback. |
| 𦍋 (U+2634B) | ⺸ (U+2EB8) | 123 羊 | Imported exact variant identity; shared family meaning/reading fallback. |
| 𧢲 (U+278B2) | ⻇ (U+2EC7) | 148 角 | Existing form `148-1` retained; added exact identity so component presentation agrees. Its stroke data remains unrecorded. |
| 𨸏 (U+28E0F) | ⻕ (U+2ED5) | 170 阜 | Imported exact variant identity; shared family meaning/reading fallback. |
| 𩠐 (U+29810) | ⻡ (U+2EE1) | 185 首 | Imported exact variant identity; shared family meaning/reading fallback. |
| 龶 (U+9FB6) | None | None assigned | Descriptive label “Top component of 青 (青字头)” only, attributed to the supplied patch. No lexical reading/meaning or 青 family membership is inferred. |

The descriptive name for 龶 is cross-checked against the existing checksum-bound
[CC-CEDICT snapshot](../character-readings/README.md), exact entry 青字頭/青字头,
and [MDBG's online dictionary](https://www.mdbg.net/chinese/dictionary?wdqb=%E9%9D%92).
The review retains the exact source entry and archive checksum. Its recorded reading
belongs to the component name, not a standalone lexical reading of 龶.

The family mappings add metadata identities without creating family form keys,
stroke records or geometry aliases. Raw catalogue rows stay unchanged. 龶 is shown
once in Components; its raw Characters row remains stored, but is excluded from
Characters presentation. Regenerate `public/data/catalog_ids.json` with
`node scripts/export-catalog-ids.mjs` when changing that membership.
Other gloss/reading proposals in the supplied patch remain outside this applied
six-component resolver review. The additional four-record review below is separate.

Generate the identity sidecar with `python scripts/import-radical-identities.py`;
verify it without writing with `python scripts/import-radical-identities.py --check`.
The importer checks the original component tuples, original patch and Unicode file
hashes, each selected property pair and each symbol's exact NamesList family. It records the review hash
in the sidecar coverage and both Unicode source identities on each new variant.

## Meaning-first form references

Nonempty definitions can still contain only a relationship description. The
owner-requested [form reference review](form-reference-review.json) addresses four
such records without replacing their imported tuples or inferring Kangxi identities:

| Form | Linked exact Characters record | Presentation |
| --- | --- | --- |
| 歨 bù | 步 bù | Lead with “step, pace; walk, stroll”; retain the original old-variant note as secondary information. |
| 毌 guàn | 貫 guàn | Lead with “a string of 1000 coins; to go through”; retain the original form/component notes as secondary information. |
| 丷 bā | 八 bā | Lead with “eight; all around, all sides”; retain the complete original component/historical/Korean note as secondary information. |
| 龹 quǎn | 卷 juǎn | Show the linked meaning with an explicit “Related 卷” label. Keep the phonetic-component description secondary and both records' pronunciations independent. This relationship does not license lexical inheritance or a reading correction. |

CC-CEDICT's pinned exact old-variant entries support the first three links. Their
existing readings already match the linked records and stay unchanged. 龹's link
uses its recorded component description for contextual navigation only. Its
recorded quǎn is retained, not newly verified; the linked 卷 reading is not a
replacement for it. No root, shape or decomposition inference is involved.

The shared `component-form-references.ts` adapter validates every original source
tuple and target tuple before applying the presentation. Changed tuples fail
closed to their current data, and references never recursively borrow from other
references. The existing shared glyph/meaning adapters apply the same display in
libraries, search, lesson hints, games and Practice. `ComponentFormReference` adds
an exact Characters link and a separate speaker for the linked record in Glyph
details and guided Practice; the extra row stays hidden in Recall.

Generate/check this subset from the repository root:

```sh
python scripts/import-component-form-references.py --write
python scripts/import-component-form-references.py --check
python scripts/import-component-form-references.test.py
```

The input review is checksum-bound by the output. Dictionary archives and exact
source entries remain offline; only the four reviewed tuple bindings, attribution
and decisions are bundled. These links do not alter readings, audio attachments,
library membership, script metadata, source trees, family form keys or geometry.

## Agent workflow

1. Inspect the current exact `Components:<glyph>` record in
   `public/data/components.json`, any same-glyph Characters record, and the shared
   presentation adapters. The handoff's missing-field counts describe its snapshot;
   a blank raw field may already have a contextual display fallback.
2. Review each proposed field independently. Record the exact Unicode code point,
   library kind/record ID, original tuple, proposed display or data change, supporting
   source and decision (`apply`, `already covered`, `defer` or `reject`). For a
   family-specific proposal also record the family number and exact form key.
   Retain unresolved or conflicting evidence instead of filling gaps by analogy.
3. Check exact identities against the pinned
   [radical identity sources](../radical-identities/README.md) and recorded family
   forms in `public/data/radical-families-source.json` / `radical-strokes.json`.
   Independently verify new readings, lexical glosses and variant/historical claims
   against attributable dictionary/source records; retain source location, version
   and the evidence supporting each field. A suggested equivalent is not evidence
   for another glyph's Mandarin reading or lexical meaning.
4. Apply supported changes through the existing shared layer described below.
   Keep source tuples intact for presentation changes. A durable source correction
   must have explicit field-level provenance and a reproducible import/review path;
   preserve all unrelated fields and metadata. Do not introduce an implicit Markdown
   parser or one-off UI mapping that silently treats every suggestion as approved.
5. Validate the affected behavior and report applied, already covered, deferred and
   rejected proposals with their reasons. Complete supported independent changes
   while leaving uncertain fields explicitly unresolved.

## Presentation and identity rules

- Use `src/lib/glyph-presentation.ts` for shared classification, descriptions,
  component names and speech targets; use `radicalVariantFallback` and
  `radicalVariantMeaning` in `src/lib/character-library.ts` for recorded family
  fallbacks. Reference, Practice, decomposition and games must agree.
- Treat the handoff's “suppress” as no standalone lexical pinyin for a pure
  component form. Preserve the existing family reading/audio fallback for an exact
  recorded radical variant and label it in that context. Component-name pinyin and
  parent-family readings must never be written as the component's lexical reading.
  Preserve a form's own recorded reading and the existing family-qualified contextual
  identity exception. Route playback through `src/lib/audio.ts`.
- The six “Quick Fix” mappings are proposals, not unconditional resolver aliases.
  A description such as “top component of 青” does not establish Kangxi-family
  membership. Add a family identity only with exact sourced evidence through its
  existing reviewed source/generator; never infer one from shape, IDS or the table's
  parent label. Component dictionary radicals remain exclusively Unihan kRSUnicode
  assignments generated by `scripts/import-component-radicals.py`.
- Reconcile conflicts with current sourced presentation explicitly. For example,
  the handoff suggests ice/冫 for ⺀ while the shared adapter records Unicode's
  `CJK RADICAL REPEAT` description. Do not silently overwrite that distinction.
- Japanese/historical equivalents, rare-glyph labels and code points do not supply
  missing Mandarin pronunciation or meaning. Keep unknown readings unknown; do not
  synthesize speech from a related character. Historical claims also remain subject
  to the separate [etymology contract](../../../public/data/etymology/AGENTS.md).
- Preserve exact glyph strings, row ordering, IDs, script metadata, recordings,
  provenance and the 214 Kangxi headings. Keep pure forms in Components and ordinary
  dual forms in Characters according to the shared adapter. Preserve family-qualified
  URLs/bookmarks and duplicate-form identities. Metadata proposals never authorize
  changing IDS, checksums, stroke bindings or handwriting geometry.

## Validation

For documentation changes, verify relative links and the supplied file checksum.
For implementation changes, run the relevant existing suites, starting with:

```sh
npx vitest run src/lib/glyph-presentation.test.ts src/lib/component-variant-reading.test.ts src/lib/character-library.test.ts
npx vitest run src/lib/component-metadata-patch.test.ts src/lib/radical-identities.test.ts
python scripts/import-radical-identities.py --check
node scripts/export-catalog-ids.mjs --check
npx tsc --noEmit
```

Use `npx.cmd` on Windows when PowerShell blocks `.ps1` wrappers. Include catalogue,
identity or audio suites when those layers change, plus the required checks for
any touched source generator. Add focused regression coverage for changed behavior:
own readings stay intact, family fallbacks remain contextual, ambiguous/unknown
forms stay unresolved, and Reference/Practice retain the exact selected identity.
See [catalog.md](../../../public/data/catalog.md) for full-suite and environment
instructions. Only the selected family identities and descriptive decision above
and the four reviewed form references are implemented; do not describe the rest
of the supplied suggestions as imported.
