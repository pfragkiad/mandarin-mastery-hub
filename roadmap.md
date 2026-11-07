# Roadmap

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
