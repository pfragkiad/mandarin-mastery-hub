# Component-colored practice strokes

## Visual behavior
- Keep accuracy percentages and their score colors unchanged. Stroke ink represents components, not accuracy.
- Give each component a distinct hue; all strokes in that component share it. Use subtle saturation variation within a group while maintaining strong contrast in both themes.
- Use the same component colors in the writing square, stroke thumbnails and component-selection controls.
- Arrange the Strokes panel into labeled groups with a small color marker and stroke numbers. Keep tiles equally sized, preserve writing order and avoid nested decorative cards. Repeated occurrences remain separately identified.
- Treat radicals and characters without a usable mapping as one whole-form group. For partial mappings, collect unassigned strokes into one clearly unnamed group without guessing their identity.
- Preserve Recall’s hidden square and hidden-by-default stroke tiles. Colors must not reveal undrawn strokes.

## Grouping sources
- Make Me a Hanzi remains the default where the current stroke mapping validates.
- Provide a source selector when alternatives exist; retain the selection in browser history. An alternative is usable for coloring only when its own exact stroke assignment validates.
- Keep unavailable alternatives visible but disabled, with the reason available from an information button. Selecting another source must not relabel or recycle the original mapping.
- For 学, the installed mapping supplies ⺍ (1–3), 冖 (4–5) and 子 (6–8). BabelStone records ⿱𰃮子, but provides no separate stroke assignment. Its two-group coloring stays unavailable until a source-attached mapping is supplied; do not guess that 𰃮 corresponds to strokes 1–5.
- Keep both original decomposition trees and their provenance intact.

## Technical details
- Resolve grouping from the existing lazy, checksum-validated enrichment data; add a focused browser-safe grouping adapter with a single-group fallback.
- Define component-ink palettes as semantic global CSS tokens and apply them consistently to Hanzi Writer’s real stroke paths and stroke tiles. Color changes must not restart playback or disturb Pause/Resume, Step, tile jumps or quizzes.
- Support source-specific mappings with exact tree and raw-geometry bindings; reject missing, overlapping, mismatched or substituted assignments.
- Keep explicit component highlighting independent of playback and grouping, without allowing it to leak into Recall.

## Verification
- Add focused tests for 学’s exact three groups, radical and missing-mapping single-group fallbacks, partial unknown grouping, and rejected unsupported alternatives.
- Verify live coloring, playback, tile jumps, pause/resume, mode changes, accuracy labels and history on 学, a radical and an unmapped character.
- Inspect dark/light and phone/desktop layouts for contrast, wrapping and equal tile sizing.

## Not included
Generating or inventing new BabelStone-to-stroke mappings. Alternative coloring requires independently supplied source evidence.