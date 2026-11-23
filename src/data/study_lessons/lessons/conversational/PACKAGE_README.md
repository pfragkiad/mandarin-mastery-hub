# Conversational Mandarin — Complete Course (Core v3.3.1)

The course contains **15 complete conversational lessons**, each in a four-file ZIP (`.json`, `.html`, `.md`, `report.md`) under `conversational_mandarin/topics/`. The existing curriculum (`curricula/CONVERSATIONAL_MANDARIN.json`), lesson index, offline browser, and validation documents are included.

This is an editorial release that uses Core Project Sources **v3.3.1** and the **v2.0.0** topic taxonomy. The individual JSON lesson schemas remain `mandarin-general-lesson/3.2.0`; no schema change was made.

## Editorial corrections

- Replaced all 15 generic subtitles and outdated descriptions with lesson-specific, learner-facing content.
- Normalized tags to 2–3 content-specific terms per lesson.
- Replaced all non-speakable grammar-pattern placeholders/operators with actual Mandarin examples and matching pinyin.
- Rewrote **all 15 speaking model answers** as complete 4–6-turn exchanges satisfying the full prompt.
- Replaced generic grammar-question prompts with concrete tasks; aligned all affected answers and progress labels.
- Removed one invalid concatenated expression from the greetings review list.
- Kept all learner-progress identities and curriculum placement IDs stable.

The two previously bundled independent character lessons under `independent/` remain unchanged byte-for-byte for drop-in compatibility with the preceding Other Lessons package.

The file `conversational_mandarin/EDITORIAL_AUDIT.md` documents checks and the limits of automatic validation.
