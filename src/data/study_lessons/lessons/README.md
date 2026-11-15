# Lesson documents

Each directory holds one canonical lesson JSON and its Markdown companion. Current
lessons use the content-only v2.5 format:

- [CHARACTER_LESSON_CI](CHARACTER_LESSON_CI/README.md): 次 (cì), times and occasions.
- [CHARACTER_LESSON_YI](CHARACTER_LESSON_YI/README.md): 以 (yǐ), words and constructions.

`src/lib/lessons.ts` discovers `*/*.json`: summary keys load eagerly and each full
document loads lazily on its lesson route. Markdown, HTML prototypes and editorial
`report.md` files are not runtime inputs. There is no repository generator; keep
Markdown companions aligned with their authored JSON.

Use the [core template](../core/README.md) for new lessons and follow the
[study lessons guide](../README.md) for IDs, categories and exact record links.
