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
- Keep each primary learning section in its own TanStack leaf route, with shared navigation and session state in the root shell, so navigation preserves the current workspace.
- Use the browser-safe Mandarin data module for starter content and filtering; explicitly label sample content and session-only edits rather than implying imported records or durable storage.
- Load Hanzi Writer dynamically in the writing tool effect, so browser drawing logic never runs during server rendering.
- Define visual roles and responsive layouts in the global design system and use shared UI controls for interactions, so the learning sections remain visually consistent.
- Keep theme state in the root workspace and apply semantic dark tokens globally so navigation, controls and writing ink share one theme.
- Derive banner lighting variants from the same pixel-aligned source and mount both in one shared image frame, so theme changes cannot change cropping or wait for an image download.
- Keep character-library filtering and bounded pagination in a browser-safe data adapter; attach decomposition trees to explicit provenance so future imports do not imply inferred etymology.
- Derive component reuse from distinct parent-character decomposition trees and radical usage from imported dictionary-radical assignments once per catalogue version; share URL-backed usage groups while keeping counts independent of browsing filters and their provenance distinct.

- Keep shared learning preferences and script inclusion in a browser-safe module; imported records use explicit script metadata so filtering and traditional markers never rely on glyph guesses.
- Keep Overview random word/character/component selection and exact paginated destinations in a browser-safe helper, sharing the library discovery card with independent controls respecting script preferences, so links select real records rather than merely filtering lists.
- Route all pronunciation through src/lib/audio.ts (attached recording → exact character-reading recording → validated Mandarin browser TTS, never auto-switching after a failed recording), so the external data plan's audio priority stays in one place.
- Share pronunciation-control availability across learning screens, requiring a known reading and confirmed Mandarin voice for unrecorded speech, so grey controls never advertise playable audio.
- Mirror the external Mandarin Tutor API contract in src/lib/data-contract.ts and adapt entries to the UI Word shape there, so screens never depend on whether data comes from fixtures or the local API.
- Preserve field-level source references for spreadsheet-enriched parts of speech, matching existing entries by HSK identity and headword, so enrichment never replaces audio, examples, or entry identities and remains distinguishable from the original import.
- Imported data is regenerated from the source SQLite by an export script into src/data/vocabulary.json (bundled, API Entry shape) and public/data/catalog.json (fetched once by src/lib/catalog-store.ts), so the large character catalogue never enters the page bundle.
- Recordings live on the Lovable CDN; exported data stores only their CDN URLs plus source/speaker/license, so the repo stays free of media binaries.
- Keep page selections and filters (Characters tab/filters/page/selection, Practice word focus) in URL search params, pushing history for selections and replacing for typing, so browser back/forward restores them without cookies.
- Use shared library destinations and real router links for decomposition glyphs; resolve explicit selections independently of browsing filters so linked records and browser history never silently show a different record.
- Split vocabulary by explicit entryKind metadata, never glyph length; keep its Words/Phrases tab in URL search and infer the tab from linked entries so dictionary links still open their target.
- Keep vocabulary pagination and browsing filters in URL search, resolving exact linked entries to their containing page when no page is specified, so history and dictionary destinations preserve the selected record.
- Import unofficial spreadsheet phrases with the repeatable scripts/import-hsk-phrases.py adapter; retain local IDs, textual vocabulary matches, and review notes in phraseMetadata while leaving hsk_index and hskSource empty, so local numbering never becomes syllabus provenance.
