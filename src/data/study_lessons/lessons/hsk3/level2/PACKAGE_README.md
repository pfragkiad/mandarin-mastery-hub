# HSK Level 2 · Core v3.6.1 catalog reference repair

Added 117 verified catalog character references across 25 lessons. All 25 lesson JSON files pass topic lesson schema v3.4.0 and the exact catalog mapping and coverage checks. The original lesson wording, lesson and checkpoint IDs, and teaching assets are preserved. Earlier release notes follow.

# HSK Level 2 · Core v3.6.0

Topic lesson format v3.4.0. 50 approved three-line patterns across 25 topic lessons. The JSON, HTML, and Markdown use the shared Hanzi, pinyin, and pseudo-translation layout. Lesson, vocabulary, and progress identifiers are preserved.

## Earlier release notes

# Mandarin HSK Level 2 — Complete Topic-Lesson Release

**Lesson schema:** v3.3.0 · **Taxonomy:** v2.0.0 · **Level 2 vocabulary:** v1.1.1 · **Level 1 review vocabulary:** v1.7.1.

This complete release contains **25 standalone topic lessons** (four files in each nested ZIP) covering **all 200 Level 2 entries (IDs 301–500)**. Their 20 populated primary topics are drawn from the existing global registry of 22 active topics; larger groups are divided into numbered instructional parts, not new topics.

- `hsk3/level2/` — 25 independent teaching lesson ZIPs.
- `curricula/HSK3_2025_LEVEL1_LEVEL2.json` — combined curriculum; preserves the original Level 1 section and appends 6 Level 2 units with 25 lesson placements.
- `audits/` — exact 200-entry coverage CSV, lesson plan JSON, full validation report, source hash and validator results.

The original source word-card examples are retained inside canonical JSON but intentionally omitted from rendered teaching HTML/Markdown (which contain fresh dialogue, grammar, reading, speaking and exercises). Required completion uses authored non-time-based checkpoints; optional recall quizzes do not block progress.

**Rev. 2 corrections:** fixed the Level 1 #36 embedded example pinyin (source-file erratum) and replaced two exact word-card sentence reuses in dialogue and guided building. Stable lesson and progress IDs are preserved. **Core Project Sources v3.3.0 were not changed or reissued.**

Import the complete package; do not replace it with a single lesson extracted from it. Status: draft pending linguistic review.
