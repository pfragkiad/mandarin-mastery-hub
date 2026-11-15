# Times and occasions: 次 (cì)

| File | Purpose and consumer |
| --- | --- |
| `CHARACTER_LESSON_CI.json` | Canonical v2.6 learner content for `char-6B21`. Discovered by `src/lib/lessons.ts`; summary keys load eagerly and the full lesson loads lazily at `/lessons/char-6B21`. |
| `CHARACTER_LESSON_CI.md` | Markdown companion to the JSON; not loaded by the application. |
| `CHARACTER_LESSON_CI.html` | Supplied standalone lesson page with quiz interactions; open directly in a browser. Not loaded by the application. |
| `report.md` | Supplied source report, references and content mapping; authoring reference only. |

No repository generator is provided. Keep the authored JSON and Markdown aligned;
editorial references, when supplied, belong in a separate `report.md`.
See the [lesson directory guide](../README.md) and [shared templates](../../core/README.md).
