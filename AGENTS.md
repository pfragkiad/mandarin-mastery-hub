<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Give each learning section a TanStack leaf route; share navigation and session state in the root shell to preserve the workspace.
- Use the browser-safe Mandarin data module for starter content and filtering; explicitly label sample content and session-only edits rather than implying imported records or durable storage.
- Dynamically load Hanzi Writer for characters and sourced representative stroke outlines; never infer missing paths, so practice follows recorded brush data.
- Define visual roles/layouts globally with shared controls and root theme state, so navigation, controls and writing ink stay consistent.
- Share sentence rendering in vocabulary and glyph details; match usage through existing text, radical assignments and component trees, never inferred stroke shapes.
- Keep library filtering/pagination browser-safe, decompositions provenance-attached, and Kangxi IDs extracted from explicit source metadata (never row order), to preserve source identity without inferred etymology.
- Derive component reuse from distinct parent-character decomposition trees and radical usage from imported dictionary-radical assignments once per catalogue version; share URL-backed usage groups while keeping counts independent of browsing filters and their provenance distinct.

- Keep shared learning preferences and script inclusion in a browser-safe module; imported records use explicit script metadata so filtering and traditional markers never rely on glyph guesses.
- Share browser-safe Overview random discovery and exact paginated links respecting script preferences, so links select real records, not filtered lists.
- Route all pronunciation through src/lib/audio.ts (attached recording → exact character-reading recording → validated Mandarin browser TTS, never auto-switching after a failed recording), so the external data plan's audio priority stays in one place.
- Share pronunciation availability: unrecorded speech requires a known reading and confirmed Mandarin voice, so disabled controls never promise playable audio.
- Separate flashcard flip targets from pronunciation and make hidden faces inert, so listening never flips cards or exposes hidden answers to keyboard navigation.
- Mirror the external Mandarin Tutor API contract in src/lib/data-contract.ts and adapt entries to the UI Word shape there, so screens never depend on whether data comes from fixtures or the local API.
- Preserve field-level source references for spreadsheet-enriched parts of speech, matching existing entries by HSK identity and headword, so enrichment never replaces audio, examples, or entry identities and remains distinguishable from the original import.
- Imported data is regenerated from the source SQLite by an export script into src/data/vocabulary.json (bundled, API Entry shape) and public/data/catalog.json (fetched once by src/lib/catalog-store.ts), so the large character catalogue never enters the page bundle.
- Recordings live on the Lovable CDN; exported data stores only their CDN URLs plus source/speaker/license, so the repo stays free of media binaries.
- Keep selections, filters, tabs, pages and Practice focus in URL search; push selections and replace typing to restore history.
- Share the record-card footer between vocabulary and glyph cards, and keep namespaced glyph bookmarks in the existing session workspace with URL-backed Saved filtering, so audio/bookmark controls and history behave identically without implying durable account storage.
- Use shared library destinations and real router links for decomposition glyphs; resolve explicit selections independently of browsing filters so linked records and browser history never silently show a different record.
- Share the browser-safe decomposition tree renderer across Glyphs, Practice and vocabulary details; preserve contextual character readings and match phrase text to real vocabulary records without implying verified grammar or etymology.
- Split vocabulary by explicit entryKind metadata, never glyph length; keep its Words/Phrases tab in URL search and infer the tab from linked entries so dictionary links still open their target.
- Keep vocabulary/Glyphs selection in URL search; shared helpers prioritize exact records over tab/filter/page hints and reveal offscreen cards after navigation and history updates, without moving visible cards.
- Import unofficial spreadsheet phrases with the repeatable scripts/import-hsk-phrases.py adapter; retain local IDs, textual vocabulary matches, and review notes in phraseMetadata while leaving hsk_index and hskSource empty, so local numbering never becomes syllabus provenance.

- Preserve Hanzi Writer animation runs across Pause/Resume using its native APIs; invalidate runs only on replacement, reset, practice or teardown, so in-flight stroke progress and guide highlights survive pausing.
- Load per-glyph enrichment sidecars only after current tree/raw geometry SHA-256 match, so annotations preserve canonical data and unknowns. Overlay exact occurrence strokes independently of playback; never substitute standalone outlines.
