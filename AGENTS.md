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
- Keep drawing-game filters URL-backed and rounds session-only; use native Hanzi Writer quizzes with no outline or automatic hints, so errors never substitute guessed handwriting acceptance.
- Use TanStack leaf routes and shared root navigation/state to preserve the workspace.
- Keep Mandarin data browser-safe; label samples and session-only edits so they never imply imported or durable records.
- Dynamically load Hanzi Writer for characters and sourced representative stroke outlines; never infer missing paths, so practice follows recorded brush data.
- Define visual roles/layouts globally with shared controls and root theme state, so navigation, controls and writing ink stay consistent.
- Share sentence rendering in vocabulary and glyph details; match usage through existing text, radical assignments and component trees, never inferred stroke shapes.
- Keep filtering/pagination browser-safe and decompositions provenance-attached. Resolve Kangxi identities through exact sourced glyph/symbol mappings, never shape, normalization, dictionary text or containing-character assignments; preserve exact cards and link missing symbols only to unique canonical identities.
- Derive component reuse from distinct parent-character decomposition trees and radical usage from imported dictionary-radical assignments once per catalogue version; share URL-backed usage groups while keeping counts independent of browsing filters and their provenance distinct.

- Share browser-safe preferences and explicit script metadata; never guess script from glyphs.
- Share browser-safe Overview discovery and exact paginated links respecting script preferences.
- Route all pronunciation through src/lib/audio.ts (attached recording → exact character-reading recording → validated Mandarin browser TTS, never auto-switching after a failed recording), so the external data plan's audio priority stays in one place.
- Share pronunciation availability: unrecorded speech requires a known reading and confirmed Mandarin voice, so disabled controls never promise playable audio.
- Separate flashcard flip targets from pronunciation and make hidden faces inert, so listening never flips cards or exposes hidden answers to keyboard navigation.
- Preserve exact record IDs and library kinds in flashcard rounds; bookmark only unsaved missed IDs in the shared session workspace and link reviews to their exact Vocabulary/Glyphs records, so saving never removes an existing bookmark or opens a homograph instead.
- Mirror the external Mandarin Tutor API contract in src/lib/data-contract.ts and adapt entries to the UI Word shape there, so screens never depend on whether data comes from fixtures or the local API.
- Preserve field-level spreadsheet provenance; match by HSK identity/headword without replacing audio, examples or entry IDs.
- Fetch the catalogue and repeatably imported radical-identity sidecar together through catalog-store; keep large reference data out of page bundles and preserve original tuples.
- Recordings live on the Lovable CDN; exported data stores only their CDN URLs plus source/speaker/license, so the repo stays free of media binaries.
- Keep selections, filters, tabs, pages and Practice focus in URL search; push selections and replace typing to restore history.
- Share the record-card footer between vocabulary and glyph cards, and keep namespaced glyph bookmarks in the existing session workspace with URL-backed Saved filtering, so audio/bookmark controls and history behave identically without implying durable account storage.
- Use shared library destinations and real router links for decomposition glyphs; resolve explicit selections independently of browsing filters so linked records and browser history never silently show a different record.
- Share decomposition rendering and vector layout icons across Glyphs, Practice and Vocabulary; preserve readings/textual matches without implying grammar/etymology. Parse BabelStone prefix IDS separately; keep unsupported notation raw and numbered components opaque.
- Split vocabulary by explicit entryKind metadata, never glyph length; keep its Words/Phrases tab in URL search and infer the tab from linked entries so dictionary links still open their target.
- URL selections override browsing hints; reveal offscreen cards after navigation/history, without moving visible cards.
- Repeatably import unofficial phrases; keep local IDs/matches/review in phraseMetadata and hsk_index/hskSource empty so local numbering never implies syllabus provenance.

- Preserve Hanzi Writer animation runs across Pause/Resume using its native APIs; invalidate runs only on replacement, reset, practice or teardown, so in-flight stroke progress and guide highlights survive pausing.
- Load per-glyph enrichment sidecars only after current tree/raw geometry SHA-256 match, so annotations preserve canonical data and unknowns. Overlay exact occurrence strokes independently of playback; never substitute standalone outlines.
