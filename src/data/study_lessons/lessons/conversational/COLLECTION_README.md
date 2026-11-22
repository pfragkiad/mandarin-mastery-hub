# Conversational Mandarin — topic-based beginner study collection

This package organizes the user-provided 16 Pimsleur Mandarin audio transcripts by **15 communicative topics**, not by original track number.

- 880 original extracted vocabulary and expression rows are retained in an independent audit index.
- 227 manually curated topic-expression placements are included (may include a phrase in more than one topic).
- 60 new editorial dialogue turns; 60 new open-ended assessment tasks.
- Source track/time/line anchors are retained for matched original expressions.
- Global categories reuse the 20 existing Mandarin tutor topics. Course-specific topics are defined in the curriculum manifest.
- Every nested lesson ZIP contains exactly JSON, HTML, Markdown, report.md; compatible with core v3.1.1 (unchanged JSON schemas).
- The first-pass provisional extraction flags were not treated as a judgment of correctness.
- Original transcripts are retained unmodified under source_transcripts/ for traceability and audit.
- Raw extraction rows are not silently exposed as certified learner entries. Only curated examples occur in lessons.

## How to import

1. Use `core.zip` v3.1.0 unchanged.
2. Import `CURRICULUM_CONVERSATIONAL_MANDARIN.json` as a new course, independent of HSK.
3. Import the 15 nested lesson ZIPs as reusable dialogue lessons.
4. Keep `EXTRACTION_REVIEW_INDEX.json` and the original source transcripts as editorial/source material, not learner data.

## Lesson topics

1. Greetings and Politeness — 11 curated expressions; source tracks 1, 2, 3, 11, 14
2. Introducing Yourself and Other People — 17 curated expressions; source tracks 1, 2, 3, 4, 8, 15, 16
3. Speaking Languages and Describing Ability — 16 curated expressions; source tracks 1, 2, 3
4. Understanding and Asking for Clarification — 13 curated expressions; source tracks 2, 4, 5, 9, 12, 15
5. Asking Where Places Are — 16 curated expressions; source tracks 4, 5, 6, 9
6. Expressing Wants and Intentions — 16 curated expressions; source tracks 5, 6, 8, 10, 13, 15, 16
7. Ordering Food and Drinks — 16 curated expressions; source tracks 5, 7, 8, 13
8. Choosing Where to Meet and Eat — 15 curated expressions; source tracks 6, 7, 8, 9
9. Doing Things Together — 12 curated expressions; source tracks 8, 9, 11, 13
10. Clock Time and Negotiating a Meeting — 16 curated expressions; source tracks 9, 10, 11, 12
11. Today, Tomorrow, and Later — 17 curated expressions; source tracks 6, 7, 9, 10, 11, 13
12. Choosing: Or, Either, and Not — 14 curated expressions; source tracks 8, 9, 10, 13, 14, 15
13. Money, Prices, and Currency — 16 curated expressions; source tracks 12, 13, 14, 15, 16
14. Counting and Simple Arithmetic — 16 curated expressions; source tracks 15, 16
15. Permission and Polite Requests — 16 curated expressions; source tracks 14, 15
