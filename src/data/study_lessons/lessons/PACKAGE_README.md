# Mandarin Tutor — lessons bundle v3.1.0

Compatible with `core.zip` v3.1.0. **This is an instructional curriculum, not a duplicated vocabulary listing.**

- HSK 3.0 Level 1: 21 lessons containing 300 introduced vocabulary entries and their 600 existing source examples (retained solely in canonical JSON).
- 84 newly written conversation turns, 42 explicit grammar/pattern explanations (2 worked examples each), 42 guided substitutions, 22 connected reading paragraphs, 42 speaking scenarios, and 189 total quiz prompts, including 84 applied comprehension/speaking questions.
- Two independent character-usage lessons, 次 (cì) and 以 (yǐ), unchanged from their v3.0.0 format and validated with the shared core.
- A Level 1 course manifest with stable lesson IDs, lesson order and syllabus entry coverage.
- Every lesson ZIP has exactly four root files: canonical JSON, HTML, Markdown and independent `report.md`.

## Important content distinction

The lesson's *main view* now teaches: dialogue → two worked grammar patterns → substitutions → connected reading with comprehension → speaking → common error/pronunciation → applied checks → review.

The original example sentences are still present in the lesson JSON so older word-detail card consumers retain source data, but the v3.1 HTML/Markdown renderer does **not** print those 600 examples. It prints a collapsible reference word bank with HSK entry IDs instead. Please use a vocabulary-card route in your web app to open each entry; no route is invented by the generated files.

## Review caveat

New material is **editorially authored draft content**, not official HSK text, independently native-speaker certified, or fully audited against the cumulative HSK1 lexicon/grammar. Some naturally communicative contexts use supporting vocabulary from higher levels. Pinyin is manually written and needs a second linguistic review prior to authoritative publication.
