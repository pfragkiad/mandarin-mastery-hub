# Roadmap

- [done] Practice progress tiles laid out sideways per mockup (picture left; reading, speaker, count, status and bar right), two word tiles side by side on phones; 67 Practice tests pass, desktop and phone checked.

- [done] Practice progress tile (current stroke + bar, bar-only in Recall), stroke tiles in a closed Details drawer, larger stroke labels wrapping only when needed, 爱 stroke 5 named diǎn; 71 tests pass, 爱/身体 checked live.

- [done] Start game tiles per mock-ups (picture tiles wide, compact rows on phones, whole tile clickable) and pinned phone header; verified desktop/tablet/phone, scroll tests pass.

- [done] Phone header (title + Search + Settings), Vocab label and tinted active tab, More drawer kept, phone game switch tabs; Character style 永 buttons + preview, Theme and Display size moved into Settings.

- [done] Menu per reviewer notes: wide windows full menu or remembered icon strip (no hamburger); phones bottom tab bar with More opening the drawer, close X on the drawer's logo row.

- [done] Resolve look-alike radical forms (阝 邑/阜, 月 肉, 日 曰, 夂 夊, 斗, ⺫) by the character's declared radical, 阝 position fallback, 釒 #167 from Unihan; 邑 ⻏ card lists its characters. 12 new tests pass; 鄱, 阳, 祁, 胧, 曹, 夏 verified live.

- [done] Compact small-screen library Filters/Study sheets in both modes, applied chips and hidden keyboard help; 14 tests pass, phone Apply/removal/hiding/remembering and vocabulary sheet verified, both modes at 700px fit without overflow, desktop menus restored; preview clean.

- [done] Refine Go to: tabs above summary, split rank summary, remember tab/default Rank, select prefill, clamp feedback and first-unranked jump; 21 tests passed, live replacement, clamp, unranked and tab recall verified; preview clean.

- [done] Clear ranked/unranked totals, nearest recorded rank jumps with feedback, Go to icon, and direct page buttons for up to seven pages; 14 tests passed, live rank gap/direct page jumps and phone layout verified, preview clean.

- [done] Shared top/bottom first/previous/next/last paging, filtered Page/Rank Go to dialog and range totals; enlarged Comfortable search with spaced toggles. Verified Glyphs rank/page and Vocabulary page jumps, bottom navigation, desktop/phone layouts without overflow; 25 tests passed and preview clean.

- [done] Combined pronunciation/translation hiding and optional session remembered reveals; verified exact reveal/focus after Details and Practice in Glyphs/Vocabulary, including remembering disabled; related tests pass and preview clean.

- [done] Shared header Compact/Comfortable choice; Comfortable enlarges search, dropdowns, labels and controls app-wide while preserving large cards; verified phone/desktop libraries, Practice, games, Settings, portal menus and persistence; 9 tests pass, preview clean.

- [done] Shared remembered Grid/List controls in Glyphs and Vocabulary; large rearranged one-card rows verified at phone/tablet/desktop widths, stable hide/reveal, detail opening and reload persistence; 13 tests pass, preview clean.

- [done] Add small perfect-completion confetti in Trace, Recall and Drawing with saved Settings switch and reduced-motion support; verified a live Trace burst and switch persistence, 56 tests pass, preview clean.

- [done] Match all reference/Practice stroke tile gaps to character examples with shared spacing; verified 10px gaps on 木.
- [done] Trace stroke clicks show the prefix and continue after the selected stroke; Recall unchanged. Verified tracing 木 strokes 3–4 to completion, prefix unscored, Reset and last-stroke behavior; 38 tests pass.

- [done] Narrow Characters/Components rank and stroke choices in both directions after Apply; 50 tests passed, live rank/stroke Apply and history verified, draft options unchanged, preview clean.

- [done] Preserve Drawing rounds across Practice visits; live Back restored the exact second card both before/after Pass, Next advanced correctly with review retained; 35 tests passed and preview build clean.

- [done] Compact shared game setup rows and ready states, simplify Start/counts and align All/Saved; 39 tests passed, both live rounds preserved after filtering and deck-size changes, narrow-screen layouts checked without overflow or runtime errors, preview build clean.

- [done] Correct exact traditional script in Practice, purple decomposition parts and Traditional pills in both search boxes; 48 tests passed, lion search-to-Practice verified live, no runtime errors and preview clean.

- [done] Shared page keyboard shortcuts and contextual keyboard help beside page/record navigation; 19 tests passed, both libraries and independent modal navigation verified live, preview build clean.

- [done] Add explanatory comments covering library controls, source-data adapters, import scripts and practice logic; 114 existing tests passed, Python scripts parsed, both library pages opened without runtime errors and preview build clean.

- [done] Shared remembered 3/5/10 rows in Characters and Vocabulary; verified phone 3/desktop 5, actual row counts, reload/cross-library persistence, paging/reset and no automatic selection; paging tests passed.

- [done] Make library reference windows modal with blurred backgrounds, remove the handle, and anchor navigation top-centre; verified navigation position, close and two shared tests.

- [done] Replace Glyphs/Vocabulary sidebars with shared centred floating reference panels and full-width spacious cards; verified unselected visits, cross-page Previous/Next, close preserving scroll, phone bounds and no runtime errors. Shared panel/loading/paging tests passed.

- [done] Immediate card highlight, shared wait cursor and animated detail placeholder for Glyphs/Vocabulary. Verified exact card/URL and completed sidebar live in both libraries, waiting cleanup and selection order in tests; four tests passed and preview build clean.

- [done] Isolate search draft state from library results/reference rendering; conditional Apply for changed inputs and X for active applied filters across libraries/games. Typing benchmark reduced from 4.95s with nine long tasks to 0.55s with none; 21 related tests passed, library controls verified live.

- [done] Share compact Play/Hide menus across Glyphs/Vocabulary; explicit Apply and immediate X clearing across both libraries and games. Verified live counts, Hide/Play menus, game rounds retained during edits, desktop/mobile widths and library Back/Forward; 24 tests passed and preview build clean.

- [done] Simplify the Glyphs top section: compact heading/source, filtered-only count, shared actions/display row and grid pagination. Verified desktop/mobile layout, filtering and hide/show behavior; shared preference test passed and preview build clean.

- [done] Enable separate radical-variant bookmarks; exact Saved → Glyphs → Practice flow verified for 亻, with 人 independently unsaved and 62 related tests passing.

- [done] Hide decomposition and its indicator for radical-identified Characters; remove separate vocabulary words below character sentence translations. Verified 一 live, retained 好 and Radicals-tab breakdowns, and 35 existing tests passed.

- [done] Confirmed Components/Radicals parent examples already prioritize highest recorded character frequency before the six-example limit; added regression coverage for both kinds, with 21 tests passing.

- [done] Italicize Component form of descriptions consistently without changing actual translations. Verified the supplied vocabulary record and mixed glyph detail live; 29 related tests passed, no page errors, preview clean.

- [done] Replace Components/Radicals sentence examples with recorded, linked parent-character examples under In a character; preserve ordinary Character sentences. Nine tests passed; live component/radical parents, exact character navigation and browser Back verified; preview clean.

- [done] Place glyph frequency/share after Rank in the facts row; shorten the component label; omit decomposition for radical-identified Components. Verified all three frequency tabs live, with retained Radical/Character decomposition, no page errors and 37 passing existing tests.

- [done] Resolve BabelStone numbered components from the supplied IDS table; hosted its PUA font, verified all source-table font mappings, passed 24 tests and live 年/之 glyphs, source hints and Practice display; preview clean.

- [done] Prioritize explicit BabelStone G-source consistently in Glyphs, Vocabulary and Practice; hide other regional alternatives, retain the original graphical structure; 45 tests passed, live 是 ordering and Recall verified, build clean.

- [done] Add sourced cumulative character/component percentages and update component frequency classes across libraries and games; validated 39 tests, unchanged ranks in both scopes, and live filters/details/flashcard round.

- [done] Move glyph detail actions directly below translation.
- [done] Add sentence and word pronunciation controls to Glyphs usage examples; verify playback and layout.

- [done] Stroke cards and component headings clickable only in Watch; inert reference in Trace/Recall with audio controls live (tests + live check)
- [done] Step with a selected component deselects it and draws the next group's first stroke; after the last group it returns to stroke one (tests + live check)
- [done] Trace/Recall: re-arm silently after completion; fresh round starts on first new drag, scores stay until then
- [done] Small-screen Practice: family tiles above the writing card; no decomposition for radicals at any width (verified live, build OK)
- [done] Practice heading: hide Print practice sheet on small screens; never wrap its label on wider screens.
- [done] Practice Expert icon: larger crown in gold.

- [done] Sound card Back trail (sound-alike clicks only), selectable grey neutral tone, Play all with one recording, "In a character" list (12 + Show all, details Back returns); 36 tests pass, Back/details/grid-reset verified live.
- [done] Sound chart grid dots: fixed colour per tone; "In a character" items show the meaning to the right, vertically centred on the hanzi; verified in preview.

- [done] Group simplified/traditional characters (mutual Unihan links) onto one Glyphs card; details show Script forms tiles, each opening that form's own rank, strokes and meaning.

- [done] Menu in Learn / Practice blocks with one Games group (Hanzi + Pinyin games); phone section pills on Glyphs, Vocab and every game page (verified live, 619 tests pass).

- [done] Make the "matches the G-source breakdown above" note the same size as the "BabelStone · G-source" label and keep it italic.

- [done] Global search no longer freezes while typing (cached matching, search window rerenders alone).
- [done] Global search: Apply button — results update only on Apply/Enter; Enter again opens the first result.

## Search (Start + Search everything)
- [ ] Start search: Apply button, no search while typing; fix freeze after Apply
- [ ] Never search a single Latin letter
- [ ] Pinyin/English toggle inside the search box; hanzi input searches hanzi only
