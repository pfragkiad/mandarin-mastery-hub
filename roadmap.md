# Roadmap

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
- [ ] Vocabulary: Subtopic dropdown beside Topic, filtering by recorded subtopic IDs
