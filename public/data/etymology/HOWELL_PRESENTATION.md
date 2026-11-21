# Howell visual presentation contract

This guide is for the frontend engine improving the existing Howell renderer.
It defines a presentation of the recorded text, not a replacement etymology
dataset or an assertion that Howell's interpretations are verified. It covers
recognized notation and provides a complete fallback for everything else.

**Scope:** improve `src/lib/howell-structure.ts`, its tests,
`src/components/tutor/howell-entry.tsx` and scoped styles when implementing this
guide. Keep the source downloads, generated JSON, schemas, catalogue, identities,
recorded decompositions and geometry unchanged. Do not run the etymology importer
for a presentation-only change. Shuowen's existing Advanced disclosure is outside
this task.

**Links are allowed.** The former blanket prohibition on generating links does
not apply. Preserve the approved exact-character navigation, recorded pinyin and
independent audio controls described below. Do not remove these interactions
while improving layout.

## Existing implementation and the gap

The implementation pulled at `47d321db` already handles direct `part + part`
phrases, top-level arrows, marked senses and some parenthetical reasons. Extend
that shared parser/renderer rather than adding a second parser in the component.

The eight upstream record fields are structured; the `raw_etymology` field is
prose with notation. Treat syntax recognition as presentation evidence, not a
complete semantic grammar. In that snapshot, 5,582 of 6,376 entries produced
formation boxes; 794 did not, although 187 of those still contained ` + `.
A missing box therefore does not establish that the source describes no formation.

For example, 是 starts with "The relevant bronzeware inscription form is" before
`止# (stand straight) + a spoon/ladle`. The prefix should become context; it should
not prevent the two explicitly joined elements from receiving a composition row.

## Visual order

Render the source in its recorded order, using only the sections actually
supported by that passage:

1. **Source attribution:** Lawrence J. Howell, author interpretation. Retain the
   existing source information and notices.
2. **Origin account / historical-form context:** introductory narrative, or a
   named form such as oracle-bone, bronze or seal inscription. These are source
   descriptions, not newly assigned dates or supplied historical glyph images.
3. **Elements in Howell's account:** explicit combinations, retaining their order,
   nested descriptions, markers and any introductory/reference wording.
4. **Meaning path:** only where the text actually supplies progression arrows.
   Keep explanatory branches with the step they qualify.
5. **Other meanings / discussion:** subsequent claims and sentences, preserving
   borrowing, confusion, comparisons, alternatives and uncertainty.
6. **Notation help / original text:** concise accessible help and an available
   literal view of the original `entry.text` for comparison.

These are visual roles, not mandatory headings. Merge short adjacent context and
prose naturally, omit empty sections, and allow multiple accounts or progressions
in one entry. A later sentence may contain core evidence; do not automatically
treat every sentence after the first as an insignificant, muted footnote.

## Case-by-case rendering

| Recorded case | Proposed presentation | Boundary |
| --- | --- | --- |
| Direct `子# child + 女 woman` | One composition group with two elements and their glosses. | The group describes Howell's account, not necessarily the current IDS tree. |
| Preface followed by an explicit combination | Keep the preface as context and render the following elements as a composition row. Recognize bounded phrases such as "form is", "combines" or "composed of" only where their extent is clear. | Do not discard the preface or assume every Han character in it is a formation element. |
| A pictorial/narrative origin without an explicit combination | A readable origin-account paragraph with approved inline character tiles. | Do not manufacture parts, a chain or a "Built from" section. |
| `a spoon/ladle`, `a squatting figure`, `an element combining …` | A text element in the same composition group. It can contain explicitly named subelements. | Do not invent a glyph, picture, modern radical identity or standalone record. |
| `As per 固# …` | An exact-character reference with its recorded explanatory wording, followed by the rest of the account. It may also participate in a recorded combination. | Navigation does not mean the entire referenced entry was imported into this claim. |
| "top of", "left half of", "abbreviated form", "remnant of" | Preserve the qualification with that element; use a text description alongside any explicitly written glyph. | Never present the whole linked character as an attested image of the partial historical element. |
| `A → B → C` | Ordered steps connected by the recorded arrows; allow each step to wrap. | These are proposed idea/meaning transitions, not dated stages or independently verified causation. |
| `(← explanation)` | An indented explanation attached to the enclosing step, retaining its direction and wording. | Do not turn it into the next forward step. |
| `(← explanation ← earlier idea)` | A nested/local reason chain inside that explanation. | Keep it local; do not join it to the main path. |
| An arrow or plus inside parentheses | Keep the parenthetical group together; optionally lay out its own local relation. | It must not split the outer composition or path. |
| `*correct*; *just*; *right*` | A group of marked sense chips at the same stage, preserving the source's separators/relationship. | Three semicolon-separated senses are not three chronological steps. |
| "Also", "Other extended meanings", "associated meanings" | A distinct prose block or explicit branch retaining the connector. | Do not invent a forward arrow merely because a new sentence starts. |
| "borrowed meaning", "by confusion with", "via …" | An explicitly qualified meaning/reference block. | Borrowing, confusion and semantic extension are different relations; keep the source's wording. |
| "or", alternative accounts, quoted interpretations | Preserve distinct alternatives inside their original scope, using prose or separately labeled accounts when clearly stated. | Never select one automatically or merge alternatives into a single fact. |
| "possibly", "probably", "may have", "in all likelihood" | Keep the wording visible with the claim it qualifies. | Do not soften it into invisible help text or replace it with a numeric confidence score. |
| `compare X`, `as with X`, a list of referenced characters | A reference clause with exact-character links; keep its original position unless a clearly associated reference row preserves the scope. | A comparison is neither a formation element nor a verified identity. |
| `#` following a glyph | Howell's phonosemantic marker on that recorded element, with source-qualified help. | It does not verify the historical sound or establish a modern Mandarin sound match. |
| `#` following "an element" or another description | Retain the marker with the described fragment. If its exact scope is unclear, keep it inline with help. | Do not move the marker onto the nearest Han character. |
| Slash-separated alternatives | Preserve the slash and its scope: glyph alternatives remain the exact written glyphs; `tree/wood` remains a gloss. | Do not create a slash, expand alternatives or infer equivalence. |
| Unpaired `*`, unusual punctuation, incomplete parentheses, unsupported notation | Readable source-preserving prose for the affected span, still supporting exact-character navigation. | Unknown syntax must not delete text or force a plausible structure. |

This table is a coverage strategy, not a claim that every sentence has an
unambiguous parse. Partial recognition plus faithful prose is a supported outcome.
When an ambiguous span contains a relation whose scope cannot be determined,
keep that entire local span as prose. Do not restructure across it.

## Recommended in-memory representation

Keep `entry.text` authoritative. Build a lightweight presentation tree on demand
for the selected entry and memoize it by its text. No new persisted JSON format
or database is needed. A source-span approach avoids duplicating or paraphrasing
the explanation and lets the engine fall back locally:

```ts
type Span = { start: number; end: number }; // JS UTF-16 offsets; end exclusive

type VisualFragment = {
  kind: 'text' | 'glyph' | 'marked-sense' | 'marker' | 'group';
  span: Span;
  children?: VisualFragment[];
};

type VisualBlock = {
  kind: 'prose' | 'context' | 'composition' | 'progression' | 'discussion';
  span: Span;
  fragments: VisualFragment[];
  children?: VisualBlock[];
};

type HowellPresentation = {
  text: string;
  blocks: VisualBlock[];
  parseStatus: 'recognized' | 'partial' | 'prose';
};
```

This is guidance for an internal view model, not a required public API change.
Keep literal marker/separator spans, original ordering and the scope of nested
groups, even if the renderer substitutes accessible visual connectors for their
printed notation. Overlapping parent/child spans are normal; the ordered leaf
spans used for reconstruction must partition the original string exactly.
Use one explicit offset convention and never cut a surrogate pair in a glyph.

Separate grammar recognition from navigation. The parser records the exact glyph
written in the source; the existing adapters later supply its link/readings.
`#` is recorded source notation, not a computed historical role. Keep interpretation
review status separate from whether the syntax was successfully recognized.

Avoid a global "split at every plus/arrow/period" pass. Track grouping and quotes,
recognize complete spans, and keep unknown spans intact. A full stop in an
abbreviation or quotation must not manufacture a new section. Do not strip
uncertainty, "Originally", "Now", "for emphasis/clarification", or similar text
while extracting attractive-looking boxes.

## Worked layout: 是

The following diagram describes visual roles. It does not replace the original
wording; the renderer retains the full source preface and phrases.

```text
Historical-form context
The relevant bronzeware inscription form is

Elements in Howell's account
[止 · (stand straight) · #]  +  [a spoon/ladle]
                         ↓
Meaning path
straight spoon/ladle
                         ↓
[correct] ; [just] ; [right]
  (← abstract applications of straightness/uprightness).
```

The spoon/ladle is a textual element. The 止 link opens the exact 止 record; its
displayed reading/audio, when available, is that record's modern reading. Neither
the link nor that reading proves the role Howell assigns to the historical form.

## Exact-character links and audio: approved behavior

- Continue using the existing `lessonGlyphHint`, library destinations, real
  router links and recorded identity/reading adapters. Lookup priority remains
  Characters, then Components, then a Radicals record of the same exact glyph.
- Every Han character explicitly written in Howell's prose may have an exact-form
  tile/link, including narrative, quoted, parenthetical and reference passages.
  That permission does not depend on whether a composition was recognized.
- Do not link a look-alike, normalized, canonical, guessed historical or related
  form when the exact written record is unavailable. Keep a plain glyph tile.
- Keep the card's own glyph as its existing non-link/self tile. Preserve the
  current pinyin/audio display preference; changing it to hover-only or removing
  it is not part of this layout work.
- Use the linked record's own reading and common audio pipeline. Keep the speaker
  outside the navigation link, so playing audio never opens another card.
  Source prose itself is not sent to speech.
- Navigation and the recorded modern reading do not create an etymology,
  historical-pronunciation or contextual-component identity claim. Continue to
  respect the existing blocked/context-review statuses for whole card content.

There is no instruction here to disable exact-character links. Structural
caution concerns what an explanation claims, not whether a reader can navigate.

## Layout, wrapping and help

- Treat a composition as an ordered group of elements. Put each separator and
  the following element in one wrapping unit (`+` plus its following part),
  allowing the first element to stand alone. An orphan `+` must not be left at
  the end of a line. Described elements participate in the same wrapping rules.
  Bound each unit to the available width and allow its descriptive text to wrap
  internally; do not apply `white-space: nowrap` to an entire long element.
- Preserve the existing equally sized glyph tiles and identity colours. Textual
  element cards may grow with their prose; do not size glyph spacing from font
  widths, clip annotations or imply that a text card is a recorded glyph image.
- Use vertical progression on narrow screens. Keep a branch's indentation and
  association visible when lines wrap; never reorder reading flow with CSS.
- Keep core claims and uncertainty at normal reading contrast. Auxiliary notes
  may be softer but must remain legible and complete. Avoid making every later
  sentence visually subordinate solely because of its sentence position.
- The existing key line may remain, or its explanations may move into the shared
  source/info presentation. Either way, notation help must be keyboard/touch
  accessible. `#` means Howell's sound-plus-meaning marker; highlighted senses
  are his marked **modern Japanese** meanings, not imported Mandarin meanings.
- An original-text disclosure can show the exact `entry.text` for comparison,
  without changing the main layout or the source file. Keep all substantive
  source text visible in the main account as well; the disclosure is not a place
  to hide clauses the parser failed to accommodate.

## Acceptance checks for the frontend engine

Extend the existing parser/renderer tests with representative recorded entries:

| Fixture | Required behavior |
| --- | --- |
| 好 | Direct composition, phonosemantic marker, ordered progression and marked senses. |
| 是 | Preface plus 止# and a described spoon/ladle; reason stays with the final senses. |
| 古 | Narrative introduction includes the self glyph, then a named mouth and described element; no invented historical image. |
| 丞 | Prefaced composition with 廾# and a described complex element. |
| 乾 | `an element#` retains its own marker and nested description; do not attach it to 日 merely because 日 is nearby. |
| 丸 | A descriptive `line#` remains associated with that phrase; comparisons and later meanings remain visible. |
| 久 | Pictorial narrative without an explicit forward chain; associated meanings remain qualified prose. |
| 固 | Multiple marked senses at the same step and additional meanings stay grouped rather than becoming an invented chronology. |
| 据 | `As per` remains a reference clause as well as part of the stated account. |
| Synthetic notation cases | Malformed parentheses, literal/unpaired asterisks, quotes, abbreviations, nested arrows and pluses fall back without loss. Synthetic cases test grammar only and must not become catalogue records. |

For all 6,376 recorded Howell entries, reconstruct the original text exactly from
the retained spans, including whitespace, `+`, arrows, asterisks and punctuation.
The existing test that strips whitespace, `+` and `→` is useful as a coarse smoke
test but is not a sufficient preservation assertion. Also check that glyph
references retain exact source code points and that unknown spans stay visible.

Verify narrow-width wrapping, independent audio/navigation controls, self tiles,
missing exact records, multiple readings and keyboard/touch access. Meaningful
grammar-specific tests should check correct attachment, not only token counts.
Do not mark syntactically parsed entries as historically reviewed.

Implementation should keep parsing local to the requested entry and reuse the
existing cached catalogue adapters. Do not scan all shards or repeatedly rebuild
the full library for each inline tile. No source-data regeneration or catalogue
mutation is needed to implement this guide.
