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
