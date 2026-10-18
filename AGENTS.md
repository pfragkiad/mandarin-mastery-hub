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
- TanStack leaf routes with shared root navigation/state; selections, filters, tabs, pages and Practice focus live in URL search (push selections, replace typing) so history restores exactly.
- Mandarin data stays browser-safe; large reference data (catalogue, radical-identity sidecar, enrichment sidecars, cnchar-order, Hanzi Writer) loads lazily, never in page bundles. Samples and session-only edits are labeled so they never imply imported or durable records.
- Hanzi Writer outlines and stroke data come only from recorded sources (Hanzi Writer Data, cnchar-order stroke table via src/lib/stroke-names.ts); never infer missing paths or names — the median-geometry guess is only a fallback. Preserve animation runs across Pause/Resume via native APIs; invalidate only on replacement, reset, practice or teardown.
- Decompositions stay provenance-attached (Make Me a Hanzi IDS, BabelStone prefix IDS parsed separately, unsupported notation raw, numbered components opaque); shared rendering and vector layout icons across Glyphs, Practice and Vocabulary; never imply grammar/etymology.
- Kangxi identities resolve through exact sourced glyph/symbol mappings only — never shape, normalization, dictionary text or containing-character assignments; preserve exact cards and link missing symbols only to unique canonical identities.
- Component reuse derives from distinct parent-character trees and radical usage from imported dictionary-radical assignments, once per catalogue version; usage groups are URL-backed and counts stay independent of browsing filters.
- Pronunciation routes through src/lib/audio.ts (attached recording → exact character-reading recording → validated Mandarin TTS, never auto-switching after failure); unrecorded speech needs a known reading and confirmed Mandarin voice, so disabled controls never promise audio.
- Flashcards: separate flip targets from pronunciation, hidden faces inert; preserve exact record IDs and library kinds; bookmark only unsaved missed IDs in the session workspace, linked to their exact Vocabulary/Glyphs records.
- Drawing game: URL-backed filters, session-only rounds, native Hanzi Writer quizzes with no outline or automatic hints, so errors never substitute guessed acceptance.
- Vocabulary splits by explicit entryKind metadata (never glyph length) with URL-backed Words/Phrases tabs; mirror the external Mandarin Tutor API contract in src/lib/data-contract.ts; preserve field-level spreadsheet provenance and match by HSK identity/headword without replacing audio, examples or entry IDs. Unofficial phrases keep local IDs/review in phraseMetadata with hsk_index/hskSource empty.
- Recordings live on the Lovable CDN; exported data stores only CDN URLs plus source/speaker/license — no media binaries in the repo.
- Share the record-card footer, sentence rendering, and namespaced session bookmarks between vocabulary and glyph cards; use shared library destinations and real router links; explicit selections resolve independently of browsing filters and offscreen selected cards scroll into view without moving visible ones.
- Script metadata is explicit — never guess script from glyphs; Overview discovery and paginated links respect script preferences.
- Load per-glyph enrichment sidecars only after current tree/raw geometry SHA-256 match; overlay exact occurrence strokes independently of playback; never substitute standalone outlines.
- Visual roles/layouts are defined globally with shared controls and root theme state, so navigation, controls and writing ink stay consistent.
