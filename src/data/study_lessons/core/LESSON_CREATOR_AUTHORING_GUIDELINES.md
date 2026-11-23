# Mandarin Tutor — Lesson Creator Authoring Guidelines

**Policy version:** 1.1.0  
**Compatibility:** Core Project Sources v3.4.0; backward-compatible general-lesson schema v3.3.0; topic/character/curriculum schemas unchanged  
**Status:** Updated in Core Project Sources v3.4.0 (authoring policy v1.1.0)  
**Scope:** HSK Levels 1–9, independent Conversational Mandarin, supplementary grammar, pronunciation, reading, writing, listening, and communication lessons

## 1. Purpose and precedence

This is a **cross-cutting authoring and release-quality policy**, not a replacement for the JSON Schemas, JSON templates, topic registry, or curriculum manifest. Use in this order:

1. Respect the canonical JSON Schema and stable identity contracts.
2. Follow the appropriate type-specific JSON template and teaching requirements.
3. Follow this editorial/frontend policy for every authored or revised lesson.
4. Validate against the exact pinned vocabulary and character-catalog sources before export.

The official HSK topic hierarchy and its mapping to the shared taxonomy are separate design artifacts; this policy does not alter those structures.

## 2. Header copy

### `lesson.title`

- Use a concise, specific, learner-facing title describing the communicative goal or topic.
- **Prefer no more than 35–40 characters**, especially for mobile cards. Longer titles require a demonstrable reason.
- Examples: `Making Plans Together`, `Ordering at a Restaurant`.
- Do not prepend a course name, HSK level, internal sequence, or internal code to the title.

### `lesson.subtitle`

- Briefly describe distinctive content taught in **this lesson**, e.g. `Stations, tickets, and getting around`.
- Do **not** use repeated course-wide boilerplate such as `Topic-based beginner conversation lesson`.
- Use the empty string (`""`) when no meaningful distinct subtitle exists.

### `lesson.description`

- Write one or two natural, action-oriented sentences beginning with an active verb, usually `Learn to …` or `Practise …`.
- Describe the learner's resulting capability, not the authoring or import process.
- Never mention transcripts, extraction, audio tracks, external course inspirations, production methodology, source filenames, schema versions, or revision numbers.
- Keep legitimate provenance and source/version audit details exclusively in the standalone `report.md`.

### Learner-facing explanation blocks

- Open with natural instructional language (`Learn to …` when introducing a new skill).
- Keep the content instructional; do not use explanation blocks for provenance or developer notes.
- Do not expose internal IDs or course/workflow attributions in learner-facing labels.

## 3. Classification and tags

### `classification.tags`

- Use **2–3** genuinely descriptive content tags, ordered most specific/important first.
- Exclude level and audience labels (`beginner`, `intermediate`, `advanced`, `hsk-level-1`, etc.).
- Exclude format/course labels (`topic-lesson`, `topic-study`, `conversational-mandarin`, `character-usage`, etc.).
- Do not duplicate topic IDs merely to fill tag slots. Tags are discovery metadata, not curriculum placements.
- Examples: `greetings`, `courtesy`, `introductions` or `trains`, `tickets`, `travel`.

### Topics and subtopics

- Use the authoritative taxonomy and valid, stable topic/subtopic IDs.
- A lesson may share a primary topic with other lessons, including Part 1 and Part 2.
- HSK-level applicability belongs to curriculum placements or the official syllabus crosswalk, not invented topic IDs or classification tags.
- Do not alter topic associations or syllabus IDs for editorial presentation fixes.

## 4. Audience, duration, and schema compatibility

- `metadata.audience` is required by the current Core v3.3.0 lesson schemas. Keep it concise and internal; **do not omit it**.
- `estimated_minutes` is a **root-level** numeric field (not `metadata.estimated_minutes`). Use a realistic positive integer estimate, e.g. `10`, `15`, or `20`.
- Duration is informational; **never calculate completion from minutes**.
- Respect type-specific schema fields, valid status values, and required metadata. Do not change schemas merely to implement these editorial rules.

## 5. Exercises, answers, and progress stability

- Assign a unique, stable `id` to every independently addressable and progress-tracked activity, question, substitution, reading question, or speaking task **as required by its schema**.
- Checkpoints have globally stable `id`, `kind`, learner-facing `label`, explicit `optional`, and a valid `target_id` when pointing to an addressable item.
- Keep checkpoint IDs, target IDs, required/optional flags, and existing learner progress unchanged during copy or taxonomy edits.
- For `selection` and `multi_selection`, require distinct `choices[].id` and valid `correct_choice_ids`; do not keep a duplicate free-text answer field.
- For `comprehension` or `production`, store the schema-defined suggested `answer` and empty `choices`/`correct_choice_ids`; do not auto-grade open answers or invent an ID for a string answer.
- Show natural checkpoint labels, not implementation keys (`q-17-5`, `grammar-1`, `lesson-intro`, etc.).

## 6. Authoritative vocabulary and Chinese text

- Match every embedded vocabulary headword, tone-marked pinyin, English meaning, exact syllabus entry ID, and inherited word-card example to the **pinned source JSON version**.
- Preserve official entry IDs and the `introduced` vs. `reviewed` learning role. Every HSK entry is introduced exactly once per level curriculum; related lessons may review it.
- Preserve inherited word-card example records in the **canonical JSON**, as required by the topic template, but do not display them as newly authored teaching material.
- Author fresh dialogues, worked pattern examples, reading passages, writing cues, and exercises; do not repeat **exact word-card sentences** as new teaching examples.
- Avoid exact duplicates across newly authored lessons. Explicitly labelled review material may intentionally reuse content; report this exception.
- Supply correct Hanyu Pinyin (tone marks, word segmentation and context-dependent sandhi) next to Chinese text.
- Use local Kai-friendly font stacks in generated learner HTML. Never distribute font files or depend on paid or remote font services.
- Populate `catalog_character_refs` with exact IDs from `catalog_ids.json` for every catalog-resolvable Chinese character in the complete learner-facing lesson. Never invent IDs.

## 6A. Grammar-pattern cards: distinguish structure and spoken example

In `mandarin-general-lesson/3.2.0` and `3.3.0` grammar blocks, `pattern_hanzi` / `pattern_pinyin` and `example.hanzi` / `example.pinyin` serve **different instructional purposes**:

- **Pattern fields:** Show a reusable structural formula (e.g. `陈述句 + 吗？` / `chénshùjù + ma?`), not a duplicate of the sample sentence. A structure may contain grammatical labels and operators such as `+` and is **never an audio/TTS input**.
- **Example fields:** Supply a complete, natural, pronounceable Mandarin utterance, with accurately aligned pinyin and idiomatic English. Only this spoken example is eligible for an example audio button.
- **`function_en`:** Explain the rule or communicative function of the grammatical pattern in one concise sentence.
- **`example.teaching_note`:** Add genuinely new context, usage nuance, pronunciation information, register, or response guidance. **Do not** copy or trivially paraphrase `function_en`. Do not invent unnecessary explanatory prose merely to fill the field.
- **No placeholders in audio-bearing fields:** Ban `……`, `...`, `<placeholder>`, grammatical operators (`+`), or unfinished utterances from concrete sentence/example/turn audio text. Structural formulas are allowed **only** in pattern fields explicitly rendered as non-spoken.
- **Validation gate:** Reject generated lessons if normalized `pattern_hanzi == example.hanzi`, or normalized `function_en == example.teaching_note`. Separately flag near-duplicates for manual review. Check every grammar block across the complete lesson package, not only a sample card.
- **Frontend defense:** Label the two portions **Grammar structure** and **Example**; disable audio for structural formulas and avoid duplicating explanatory notes. A presentation fallback does not repair duplicated authored JSON.
- **Compatibility:** The above rules change authoring *quality*, not the JSON schema. Never rename fields or change existing lesson, block, example, question or checkpoint IDs when fixing repeated copy.

## 6B. Source-attested conversational expressions and visible usage notes (Core v3.4.0)

- Preserve the source-authenticated expression's Hanzi and pinyin in the main learner-facing entry. A different register, marked emphasis, northern speech habit, or context-dependent ellipsis is **not** by itself a reason to replace the sourced item.
- In `mandarin-general-lesson/3.3.0`, review expressions may optionally include `expression_id`, `usage_label`, and `usage_note`. The fields are independent of grammar-pattern examples, and older `3.2.0` lessons remain valid.
- `expression_id` is a permanent external review/index key; it must not be rederived from display text after editorial changes. It is not a substitute for the lesson/block/checkpoint IDs.
- `usage_label` identifies a concise distinction: e.g. `Emphasis`, `Context`, `Northern usage`, `Register`. `usage_note` explains why the expression is used, how the context affects naturalness, and if helpful gives a more neutral/explicit alternative with Hanzi **and** pinyin.
- Source-based form and authored alternative must be visibly distinct. Do not manufacture additional lessons or teach every alternative as a new mandatory review entry. Do not mark all instances of 儿 (ér) as rhotic usage; use regional tags only for genuine 儿化 (érhuà).
- In the frontend and standalone HTML/MD, display `usage_note` immediately below the associated review expression. Never pass note text or grammatical formulas to TTS. A source phrase remains eligible for TTS when it is a complete utterance.
- The note should be brief, factual, and learner-facing; source/provenance metadata and proof of transcript attestation belong in `report.md` / release audit.
- Release validation checks: notes reference real expression IDs when provided; no duplicate expression IDs within one lesson; note text has no unpaired Chinese examples; lesson/question/checkpoint IDs are preserved.

**Release rationale:** New optional JSON fields are a backward-compatible lesson-format extension; Core v3.4.0 is therefore MINOR (not PATCH). Existing general lesson v3.2.0 remains accepted.

## 7. Lesson completeness and packaging

- For a *full HSK level package*, cover **100% of the authoritative level vocabulary source**, partitioned by topic/subtopic and any necessary Part 1/Part 2 lesson subdivisions. A one-lesson sample is not a full level deliverable.
- Individual topic lessons retain the full teaching path required by their schema/template: dialogue, explained grammar patterns, sentence building, reading, speaking, common pitfalls, pronunciation and assessment.
- Preserve individual lesson IDs and syllabus references; curriculum membership and order belong to the curriculum manifest.
- Each completed individual lesson ZIP has exactly four files at its root: canonical JSON, regenerated HTML, regenerated Markdown, and `report.md`.
- Lesson JSON/HTML/Markdown are learner-facing and free of input-source provenance. `report.md` contains source attribution, editorial exceptions and audit findings.
- The collection ZIP filename identifies lesson schema version, taxonomy version and pinned vocabulary version as independent axes.

## 8. Required release gates

**Schema and semantic validation**

- Validate every lesson using the canonical JSON Schema and full `validate_core.py --lesson <file> --catalog-ids <catalog_ids.json>` process.
- Validate all checkpoint targets, unique IDs, choice references, required/optional flags, and taxonomy/subtopic memberships.

**Source and content audit**

- Compare **all** inherited vocabulary example records against the pinned source version.
- Audit exact sentence reuse across the source word-card examples and newly authored teaching material, and across new lessons.
- Confirm no lesson copy contains prohibited attribution/production terms, generic repeated subtitles, or prohibited tags.
- Audit titles (prefer <=40 characters), action-oriented descriptions, internal audience, and root-level numeric duration.

**Package and regression audit**

- Rebuild HTML and Markdown from canonical JSON after every content change.
- Confirm canonical JSON, generated HTML, generated Markdown and report remain synchronized.
- Verify nested and outer ZIP integrity, curriculum placements, 100% source-entry coverage, and exactly-once introduction.
- For a revision, diff against the preceding package: verify no unrequested changes to lesson IDs, vocabulary IDs, checkpoint IDs, checkpoint labels, target IDs, optional flags, or learner-progress contracts.
- An editorial revision does **not** change the Core JSON Schema version. Keep an independent policy version and record approved Core-package changes explicitly rather than silently replacing an existing canonical artifact.

## 9. Relationship to Core release policy

This authoring policy is included in **Core Project Sources v3.4.0**. It is an editorial/release-quality policy, not a new JSON Schema. The topic-lesson schema remains `mandarin-topic-lesson/3.3.0`; character-lesson schema remains `mandarin-character-lesson/3.2.0`; general-lesson schema is `mandarin-general-lesson/3.3.0` (older v3.2.0 accepted).

The Core **package release** follows Semantic Versioning (major = incompatible format or validation contract; minor = backward-compatible format addition; patch = no lesson-format contract change, including policy, documentation, template-copy, and generator-instruction improvements). Changes that make previously valid lessons invalid are assessed for breaking compatibility, even if JSON field names stay unchanged.

The **policy version** remains independently versioned; `1.0.0` was first adopted in Core v3.3.1 and `1.0.1` adds grammar-card de-duplication and TTS safeguards; `1.1.0` adds optional source-respecting expression usage notes. Course vocabulary and taxonomy versions are separate axes and must be pinned explicitly. A Markdown file does not automatically run as an Agent Skill: a lesson-authoring agent must be directed to read and apply this file. Legacy lessons are not silently rewritten by the policy.
