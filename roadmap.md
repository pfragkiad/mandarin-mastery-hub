# Roadmap

## Detail tab consistency and long idioms
- [x] Keep In a… tabs identical to Decomposition/Etymology in both sizes, removing conflicting control typography; browser-verified matching font, weight, padding and icons.
- [x] Move idiom pinyin and translation below Hanzi when a translation exceeds two lines; verified expanded lists at wide/narrow widths in both sizes, with 41 related tests passing.

## Shared detail example tabs
- [x] Group all In a… detail sections with the existing drawer-tab styling and history-backed selection.
- [x] Replace phrase/idiom search links and limited lists with shared Show all bounded scrolling.
- [x] Verify character, vocabulary and sound details, exact links, hover hints, drawer collapse and narrow layouts; 69 affected tests pass.

## Collapsed drawer defaults
- [x] Start the detail card's Decomposition | Etymology drawer collapsed on a first visit (remembered afterwards), resolving etymology in the background so the Etymology tab never promises notes the card lacks; 44 drawer tests pass and the live app was checked on a fresh profile.

## Character word bank
- [x] Add all exact multi-character Word matches to character details using shared expandable cards; 31 tests pass. Verified 爱 shows all 10 matching words, exact word navigation/history return and Compact/Comfortable narrow layouts.

## Consistent grid-card gaps
- [x] Share balanced header/footer insets and view-specific inner gaps across library and example grids; remove extra Compact body height. Verified Words/Phrases/Idioms, Characters/Components/Radicals/Strokes and sound examples at 1426px/390px in both sizes; 25 existing tests pass.

## Tone-pair focus animation
- [x] Animate small-to-focused word cards and neighbouring layout changes, preserving selection and reduced-motion preferences; verified at 1426px and 390px with 14 existing tests passing.

## Small-card balanced spacing
- [x] Centre the detail arrow with the HSK pill in both sizes; match vertical gaps to the existing left inset (12px small cards, 18px expanded cards), verified in the browser.

## Stable library range editing
- [x] Keep rank preset pills and Done on one line: drop the fourth "Top N" pill (Top 2,000) and stop the pill row wrapping; verified both panels at 1458 and 390 widths.
- [x] Keep Rank/Strokes triggers and Apply space stable while dragging; verified draft-only editing and submission at 1458/1280/390 widths and both display sizes; 18 shared filter/range tests pass.
- [x] Verified the panel stays anchored when the maximum handle restores Any and Apply disappears at wide/narrow widths.

## Small detail-grid alignment and translations
- [x] Show Unranked in every character-example header and reuse whole-sense trimming after three lines, preserving the sole translation in each card; verified glyph and sound grids and translation-limit tests.

## Nested sound filters
- [x] Use shared coloured parent/indented child dropdown styling for Initials and Finals, with one heading such as “Lips · b p m f” (no plain duplicate “Lips”); verified applied selections on wide/narrow Sound chart and hierarchy in all three pinyin games.

## Expandable character examples
- [x] Share Show all/Show fewer with bounded scrolling in component and sound detail grids; verified expansion, internal scrolling and collapse at wide and narrow widths.

## Sound-card example consistency
- [x] Reuse component-detail character grid cards in sound cards without redundant reading/audio rows.
- [x] Match section-label icons and verify exact character links, grouped forms and narrow layout.

## Global control corners and Bookmarks alignment
- [x] Extend global rounding to every grid/detail card, panel and tile; verify actual library detail windows on wide and narrow screens.
- [x] Match the rounded mockup consistently across controls and floating forms.
- [x] Align game Bookmarks with neighbouring filters in both display sizes; verify wide and narrow layouts.

## Done button in floating range panels
- [x] Add a small Done control to the Rank and Strokes panels that closes them gracefully; outside clicks still only dismiss. Verify both panels, Apply, and phone width.
- [x] Put Done on the same line as the quick choices in both panels; on phones the rank presets and Done wrap with Done flush right.

## Compact game setup
- [x] Bring filters and submission actions together, place switches side by side when they fit, and tighten shared spacing; verify games on wide and narrow screens.

## Always-visible game filters
- [x] Remove character Course/Lesson choices and the shared Filters disclosure; retain vocabulary topics and floating range editors, then verify both games.

## Floating game ranges
- [x] Anchor Rank and Strokes panels below their buttons, with separate Clear and outside-click dismissal; verify drafts and both games.

## Expandable game range filters
- [x] Put the stroke range behind a shared summary dropdown button in Flashcards and Drawing.
- [x] Add an expandable Frequency panel with custom From/To ranks, slider and presets using recorded rank data.
- [x] Preserve Apply/Reset, URL history and active rounds; test ranges and verify both games.

## Game bookmark collection
- [x] Replace the ambiguous Saved control with a shared Saved collections field and Bookmarks count, matching the mockup without custom collections.
- [x] Verify empty and selected states and existing saved-deck filtering.

## Game filter submission
- [x] Replace automatic game filter updates with Apply and Reset; refresh dependent choices only after submission.
- [x] Add the shared Stroke count label above the range control.
- [x] Verify draft changes, submission, reset and next-round behaviour.

## Game settings redesign
- [x] Share grouped kind buttons, visible round choices, and collapsible labelled filters across games.
- [x] Add live match counts, recorded previews, clear Saved labels, and consistent narrow-screen spacing.
- [x] Verify filters, next-round behaviour, and all five games on wide and narrow screens.

- [x] Glyphs: frequency/Pinyin/Shuffle sorting with stable URL-backed order and Reshuffle
- [x] Words and Phrases: Pinyin/HSK index/Shuffle, Pinyin default for HSK entries, existing default order for non-HSK entries
- [x] Verify sorting, reshuffle, pagination and browser history

- [x] Hide unknown-only decomposition trees and availability controls across glyph cards, Practice and vocabulary; retain known alternatives
- [x] Known parts include exact BabelStone parts and numbered source identities, not only dictionary glyphs

- [x] Stroke practice: correct ㇝/㇋/㇎ source indices; remove unverified ㇘ outline and clear stale geometry
- [x] Check stroke tile font coverage: Handwritten covers all; Sans/Print still lack ㇤/㇥ (no fabricated font glyphs)

- [x] Phone library pages: equal top gaps (header→title→search→Filters→Study)
- [x] Phone library pages: heading hanzi faint, larger, behind title at right, reserving no space
- [x] Card Details/Trace/Recall row aligns left with the tiles
- [x] Detail cards: pinyin below the top main hanzi, pills stay top right; per-reading lines carry their own speakers
- [x] Detail cards: translation on the pinyin line, wrapping below
- [x] Detail cards: translation that fits a full line moves whole below
- [x] Detail "In a sentence": always shown on Characters/Words with "Find more examples" (Purple Culture, new window)
- [x] Clearer up-right arrow icon for external examples
- [x] Characters/Words cards: Examples icon beside the pinyin speaker (moved from the button row)
- [x] Flashcards: kind dropdown in glyphs-first order (Characters, Components, Radicals, Words, Phrases) with a vocabulary collection dropdown; two setup rows (kind + collection/level/type, then filters)
- [x] Drawing game: same two-row setup
- [x] Card layout policies independent: button wrap follows card width (always applies); cards-per-row separate. Compact min-width back to 230px; verified 820px (3/row, Recall+bookmark wrap) and 700px (2/row, one line).
- [x] Lessons: "Lessons" under Learn; /lessons index + /lessons/<lesson ID> pages rendered from the lesson JSON (Markdown not needed)
- [x] Lessons: hanzi link to Glyphs/Vocabulary only on an exact written-form match; interactive practice questions
- [x] Lessons: not only character lessons — word, phrase or category-only lessons render without a character headword
- [x] Lessons: a character's details card lists the lessons about that exact character (Lessons section, book icon)
- [x] Lessons: library cards with a lesson show a book icon in the top indicator row beside the "In a sentence"/decomposition icons
- [x] Library cards: top row same height with or without a pill; top-row text, pills and footer buttons share one font size per view
- [x] Comfortable cards: up to three per row on wide screens (each ≥380px), two from 700px
- [x] Card top row: shorten the Radical pill ("Rad. #53"), then step the card chrome font down (header + footer buttons together) before the row wraps
- [x] Grid cards: when the translation's last line holds only 1-2 words (it adds a line), shrink the translation font instead
- [x] Footer buttons: reduce their font independently of the header as the first attempt before the button row wraps
- [x] Lessons: every hanzi rings on hover and opens a quick character card on click (word link, full-card link); quiz only after answering; remembered side switch
- [x] Start random cards (wide screens): exact library grid cards, header = section link + shuffle
- [x] Radical "In a character": owner-reviewed BabelStone links 𤣩→王 (jade), 𠆢→人 (top), 𧘇→衣, 𫜹→彐, 𫇦 (艹 over 冖) → contains 艹

- [x] Optional style tag for standalone (non-sentence) phrases
- [x] Flashcards Phrases deck: Sentence style choice (Conversational / Written / Unclassified), same rule as the Phrases library
- [x] Phrase cards: shrink pinyin + translation a little before moving them under the characters
- [x] Vocabulary cards: if one card in a row stacks its text under the characters, stack the whole row
- [x] Glyph and Start random cards share per-row stacking with Vocabulary cards
- [x] Characters/Components: "Hide radicals" filter switch (default radicals shown), URL-backed, cross-narrowed dropdowns
- [x] Simplified radical forms (麦, 门, 马… all 25): Radical #N pill on Characters cards; "simplified form of Kangxi radical N" dropped from shown meanings; detail keeps the dictionary-radical box
- [x] Hanzi finder: draw a character, see Characters/Components/Radicals matches ≥50% with similarity %, one result per exact glyph; Live results (default on) or Find; Learn menu + Draw button in Search
- [x] Find similar: glyph details open the Hanzi finder with that glyph's recorded strokes on the board (self excluded; editing turns it into a normal drawing); hidden when no strokes are recorded
- [x] Hanzi finder matches: a button at each tile's top makes that match the reference (its recorded strokes go on the board, results re-run); Back restores the previous reference or the learner's own drawing

- [x] Hanzi finder layout: board left, the first matches beside it as the same small tiles at every width (phones too), the rest below; one-line larger intro
- [x] Neutral-tone pronunciation (吧 ba, 呗/唄 bei, 啊 a): the imported clips were French speech — removed and erased; neutral readings always use TTS, as in the Sound chart
- [x] Breakdowns: when BabelStone and the Hanzi structure have the same parts and differ only by layout name (止), show the BabelStone one alone with the usual "matches" line
- [x] Memory pictures: 心 (U+5FC3) imported with its caption; the detail preview shows only the picture's bottom half while the popup keeps the full picture with the character drawn at the top
- [x] Memory pictures: each picture records its own paper colour (sampled at import), so the covered character band and the preview's letterbox never show a seam; a picture with an empty top can still carry the character (draw true)

- [x] Hanzi finder match tile: percentage centred in the header, pen at the header top-right in the speaker white and slightly larger
- [x] Memory picture pinyin: darkened terracotta on the cream paper, at least 4.5:1 contrast (WCAG AA)

- [x] Substitute identity colour: reddish deep brick, clear of radical gold AND the Traditional purple (dark splits deep glyph / lighter small label)
- [x] 瞭 detail card: two reviewed per-reading lines (liào look from afar; liǎo to understand), like 了
- [x] Find similar on radical variant forms such as ⻏ (traceable forms should open the Hanzi finder)
- [x] Hanzi finder "Similar to": the reference glyph's pinyin + speaker beside its tile and repeated in the results heading
- [x] Hanzi finder: gold radical-form matches (阝, ⺊) read "Component · Radical" so the label matches the colour
- [x] Hanzi finder: the Radicals filter also shows component-radicals (阝) and character-radicals (门)
- [x] Detail card Close returns to the page it was opened from (lesson, finder, Start…), skipping form switches; ‹ › arrows only when opened from the grid

- [x] Detail card Back also skips same-card form switches (hidden when only forms are behind)
- [x] Detail card: no scroll trap so a zoomed reader can pan to the header X
- [x] Zoom fix applies on every device (laptop, desktop, tablet), not only touch screens
- [x] Library cards: over-long translations drop trailing semicolon senses in every view (Compact grid 2-line clamp, Comfortable 3 lines), first sense always kept

- [x] Detail cards: Etymology section (Howell + Shuowen Jiezi), hidden when there is no text or related form to link

- [x] Etymology: Shuowen Jiezi (Classical Chinese) gets an "Advanced" hint for learners; improve Etymology section formatting
- [x] Glyph detail cards: Decomposition + Etymology as Practice-style drawer tabs (always opens on Decomposition, remembered collapse, nothing loads while collapsed, Etymology tab hidden when empty)
- [x] Etymology: one Advanced toggle for the whole Shuowen subsection; structured Howell layout with exact-form clickable hanzi tiles + (pinyin 🔊)
- [x] Characters grid cards: scroll icon top-right when the card has its own etymology notes (book stays the Lessons icon)

- [x] Cards opened from an Etymology link open on their Etymology tab; Back/Close returns to the previous card on Etymology

- [x] HSK 2 word recordings: upload 164 verified clips to the CDN, attach 166 entries, verify playback, remove temporary MP3s
- [x] Returning to a grid (from Sound card, Details or Practice) focuses the card clicked from; hovering another card clears it.
- [x] Card corner icon and bottom-right bookmark share one right edge in every card grid (Compact and Comfortable)

## Lessons v3 (core/lessons packages v3.0.1)
- [x] Import 21 HSK 3.0 Level 1 topic lessons + migrated 次/以, course manifest, v3 core
- [x] Topic lesson page: objectives, words + examples (exact HSK record links/audio), grammar, practice, course position
- [x] Lessons index: By Course (default; Course → Level → Unit → Lesson) / By Topic (shared topics + tags), Independent lessons section, URL-backed
- [x] 电脑 example pinyin (shàng xuéxí) fixed in the word list, plus the same slip in HSK 3 学生在网站上学习汉语
- [x] Word cards/details: Lessons section + book icon for lessons that teach that exact HSK word (owner: HSK lessons only)

- [x] Lesson key expressions: split into words first, characters last (对不起请问)
- [x] Lessons: word popup hints with details arrow, like character hints
- [x] Lessons: hover/pinyin pairing groups per identified word (whole word + its syllables), all lessons
- [x] Lessons: "Hide translations" side switch beside Hide pinyin
- [x] Lessons: "Hide hanzi" side switch
- [x] Lessons: sentence lines (conversation etc.) group hover/popups per identified word (学生)
- [x] Shuowen section: English + ⚠ for uncertain passages visible; every review note in one (i) popup
- [x] Omit self-links in sentence popups (word link + Open full card)
- [x] Single-character popups: show both "As a word" and "As a character" rows
- [x] Kind row label follows record kind: As a character / component / radical
- [x] Self-pointing popup rows hidden entirely (no plain-text remnant)
- [x] Popup offers every existing record for the exact glyph (character/component/radical rows)
- [x] Self rows visible again but without a link
- [x] Radical gold everywhere from one central rule (card-ink.ts): hint popups (header, pill, every row incl. self), word cards grid + detail (gold hanzi + Radical #N pill), glyph detail titles
- [x] Hint popup kind rows: own pinyin + speaker and translation, omitted only when exactly equal to the word row
- [x] Hint popup: a one-character word is the main (top) entry; glyph rank/strokes move to its character row

- [x] Flashcards: "Lesson" deck choice (Characters from recorded catalog refs, Words from course syllabus IDs), URL-backed
- [x] Flashcards: card back links to lessons that teach that exact record
- [x] Rename the "Collection" dropdown to "Topic" on Flashcards, Drawing and Vocabulary
- [x] Detail cards: lines only around the facts row and above the action buttons
- [x] Detail cards: one section gap; half gap after facts line, before and after the action line
- [x] Lessons: import v3.2.0 taxonomy-v2 sync (core registry + 21 HSK L1 + 2 conversational lessons)
- [x] Vocabulary: Subtopic dropdown beside Topic, filtering by recorded subtopic IDs
- [x] Lessons: Key expressions cards wrap so long pinyin never overflows
- [x] Lessons: one search box with scope (All lessons / one course), matching everything in each lesson (titles, topics, hanzi, pinyin, English)
- [x] Lesson search: numbered pinyin queries (ma1, xue2sheng1, lv4) match tone-marked text
- [x] Lessons: speaker (TTS) buttons don't play on lesson pages (e.g. convm-choices-alternatives)

## Lessons index redesign (mockups 816/817)
- [x] Tags inside card footer (max 3), equal heights
- [x] Topic icon hanzi + colour per topic
- [x] Cookie progress: bar per card, Continue card, unit x/y, course x of y
- [x] Course path: connectors, Up next, dim not-started, collapsible units
- [x] Learner copy; caveats in (i); no Pimsleur/ID notes
- [x] Estimated time on lesson cards and pages (from each lesson's estimated_minutes)
- [x] Lesson Word bank / Words to review: simplified Vocabulary grid card look (hanzi box in card ink, reading + translation at its right, HSK pill)
- [x] Lesson progress: Show answer then going back must not leave the course view at zero
- [x] Lesson page: progress shown on the left while studying
- [x] Fix: lesson progress never saved in the preview (cookies refused in embedded frame) — moved to browser storage
- [x] Quiz answers (incl. optional recall quiz) count toward progress
- [x] Progress bar + Reset progress always visible at the start of each lesson
- [x] Complete lesson returns to the course/topic screen
- [x] Remove the Draft pill from lessons

- [x] Lessons v3.3: regression report on word-card examples (handoff vs current) — which version is newer
- [x] Lessons v3.3: wire checkpoint progress, estimated minutes and icon glyph into lesson pages and cards
- [x] Lessons v3.3: re-import the corrected HSK lesson package (vocab v1.7.1)
- [x] Lessons v3.3: import Other Lessons rev2
- [x] Lessons v3.3: Core rev2 imported
- [x] Lessons: conversation intros fixed (Other Lessons rev3)
- [x] Lessons: designer sidebar (pinned progress card with ⋯ reset menu + inline confirm, scrolling list, pinned toggles) and phone strip with Sections/Settings sheets; Undo toast on every reset
- [x] Lessons: "Start over" text link at the top (only with progress) + "Practice this lesson again" outline button at the end, same confirm + Undo
- [x] Lessons: phone Settings "Reset this section" row under Progress (Undo toast)
- [x] Lessons: first HSK 3.0 Level 2 lesson (Making Plans Together) in its own Level 2 course card after Level 1

- [x] Lessons: import corrected HSK Level 2 package (rev2)
- [x] Lessons: each course level (Level 1, Level 2) folds open/closed like units

- [x] Lesson top (small screens): less cramped header per mockup; Next + title + arrow on one line
- [x] Lesson top: hide boilerplate subtitle ("Topic-based beginner conversation lesson") and the transcript/source sentence in descriptions
- [x] Lesson tags: hide long audience pill and course/format tags (topic lesson, beginner, conversational mandarin…); review tag guideline for lesson creator
- [x] Lesson top: drop the repeated progress bar above "In this lesson you will" at every width; time moves beside the lesson type
- [x] Lesson-creator guideline update for subtitles/descriptions/tags
- [x] Etymology: simplified character without its own entry shows "师 → 師" + the traditional form's notes (labelled suggested, not reviewed)
- [x] Etymology (character card): left simplified tile same size as the traditional tile
- [x] Lessons index on small screens: progress on its own full-width line, arrows beside titles (never alone), clearly visible; course title slightly smaller only when that fits one line
- [x] Lesson Key expressions: neutral PHRASE pill on non-entry expressions
- [x] Lessons v3.4.0: Key expressions usage label/note; pattern cards hide repeated formula/note
- [x] Audit lesson pinyin vs word-card readings (spacing/other differences) that could block recordings
- [x] Pattern template lines: speaker beside pinyin (owner: read as written)
- [x] Pattern template lines: character hints / clickable words like other lesson text
- [x] Lesson side panel stays on narrower pages (switch when reading column < ~440px)
- [x] Shared Hanzi·Pinyin·EN toggles in lessons and Glyphs/Vocabulary grids (separate saved choices)
- [x] Grid hidden faces blur instead of blank; click a card to reveal
- [x] Lessons: blurred text click-to-reveal (now)
- [x] Character hints switch in Glyphs/Vocabulary grids (hover ring + quick card on card hanzi)
- [x] Grid hidden hanzi: much stronger blur so large simple characters are truly hidden
- [x] Lesson sidebar + phone sheets use the grid toolbar look for Hanzi·Pinyin·EN and Character hints
- [x] Lessons Core v3.6: three-line pattern headings (Hanzi, pinyin, pseudo-translation) in HSK, Conversational and character lessons; legacy formula fallback
- [x] Pattern lines: no speaker (owner, following the migration report)
- [x] Pattern pseudo-translation is the prominent line and comes first; Hanzi/pinyin smaller below
- [x] Pinyin sounds: Tone pairs and Tone changes pages from the handoff (48 whole-word recordings, draft tone labels), under one "Pinyin sounds" menu item

## Flashcards lesson deck placement
- [x] Flashcards: category list unchanged; a Course dropdown beside Topic, and the lesson list follows from the course (both narrow the deck)
- [x] Flashcards: no Course/Lesson dropdown for Words or Phrases (Pavlos 2026-11-24) — picker stays for Characters only
- [x] Tatoeba sentence hint: show only public Tatoeba resource (links, contributors, licence, edited originals); no internal review info
- [x] Tatoeba sentences: replace recorded Tatoeba transcription pinyin with our own per-character pinyin; careful with common-name characters (multi-reading)
- [x] Tatoeba popover: keep learner-meaningful notes (e.g. lost negative sense); hide only internal review-process chatter

## Example-section consistency
- [x] Idioms: quieter inner divider, green internal search arrow, rank and subtopic above hanzi on the left
- [x] External examples: label “Search on the internet”; remove internal file/review hints while retaining public Tatoeba attribution

## Glyph quick cards label
- [x] Rename the hints switch to "Glyph quick cards" (the ring also covers components and radicals, which are not characters); saved choices untouched

## Unified dropdown styling
- [x] Apply nested choices to the Practise menu in Hanzi games.
- [x] Distinguish parent topic colour, add empty-topic Unclassified filtering, and keep all Unclassified options last and italic; verify library/game handoff.
- [x] Combine Topics/Subtopics in Vocabulary and Flashcards with selectable parents and indented children; preserve existing filters and history.
- [x] Replace remaining native `<select>` filter/settings dropdowns with one shared `FilterSelect` component (consistent themed popover, arrow inset, and text-to-arrow gap)
- [x] Keep unchanged All topics and All types defaults from creating phantom Apply state; retain real edits and explicit empty-option clearing.

## Game settings reviewer refinements
- [x] Balance shared Words/Glyphs game filters, labels, spacing, preview and floating ranges.
- [x] Distinguish unapplied filters without changing Apply/Reset rules or HSK selection geometry; verified both games at wide/narrow widths and 21 filter tests. Unclassified is offered only where recorded unlevelled entries exist (none in the current Words pool).

## Game filter clear-all placement
- [x] Put the labelled "Clear filters" control on the Filters heading line instead of a lone X in an empty band; Apply/Reset mount only while a draft edit is pending. Verified Flashcards at 1395 and 390 widths: heading clear removes the applied filter, range triggers never move, 51 filter/flashcard/drawing tests pass.

## Recorded vocabulary tone pairs
- [x] Enrich the tone bank with exact recorded two-character words and shared character associations.
- [x] Reuse sound-wave links in word grids/details and the shared glyph/word preference.
- [x] Verify exact card navigation, playback, per-character hints and preference behaviour on wide and narrow screens.

## Tone pair card examples
- [x] Show all collapses an open Decomposition/Etymology drawer below it without changing the saved drawer preference.
- [x] Keep Show all scrolling inside the expanded tile grid while allowing the detail card to grow to the available screen height; verified Components, Tone pairs and Sound chart, internal scrolling and collapse on wide/narrow screens; two shared expansion tests pass.
- [x] Apply screen-height expansion consistently to every Show all detail section, not only Tone pairs; shared example grids now use their containing window's scroll area. Verified Sound chart and radical details reach the screen bottom; expanded global/Start search uses full available screen height too. Nine targeted tests pass.
- [x] Reuse shared Close/Back destinations for Tone pairs opened from a grid or detail card; verified exact grid URL after example changes, originating word detail restoration and local matrix closing. Three focused return-rule tests and 27 existing tests pass.
- [x] Let Show all expand the tone-pair detail card to the available screen height before scrolling; verified fixed top edge, screen-bottom expansion and one window scroll area at 1161×1362 and 390×844.
- [x] Float Tone pairs in the shared top-centred sound window, preserve two example columns, and verify navigable character hints on both sound pages; checked exact character navigation, close/reopen, two-column phone layout, expansion and hidden hints in Listen first. All 18 targeted tests pass.
- [x] Move the word bank inside the tone card, reuse sound-card examples, and preserve separate sound pills.
- [x] Remove listening tips and verify example selection, expansion, Listen first and Tone changes at wide/narrow widths; 15 existing tests pass.
- [x] Enlarge the tone card with two example columns and independent pinyin/audio beside tiles; verified wide/narrow layouts, recording requests without navigation, and exact tile selection.
- [x] Show recorded HSK index badges and sort ascending by exact vocabulary ID, with entries missing indices last (confirmed by the owner); 16 targeted tests pass.
