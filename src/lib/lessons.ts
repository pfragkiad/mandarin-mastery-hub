/**
 * Study lessons (browser-safe, no React).
 *
 * Source of truth: the lesson JSON files under src/data/study_lessons/lessons/ — one lesson
 * per *_LESSON_* directory, at any depth (hsk3/level1/<DIR>/, independent/<DIR>/), except
 * lessons/legacy/, which keeps the pre-v3 copies for migration only and would otherwise
 * duplicate their lesson IDs — plus the shared topic registry
 * src/data/study_lessons/core/lesson_categories.json. The Markdown/HTML copies beside each
 * JSON are generated from it and never read here. Course placement (units, order,
 * prerequisites) lives separately in lessons/curricula/*.json (src/lib/lesson-curricula.ts).
 *
 * Two ways in:
 * - Summaries (title, topics, headword, status, objectives) are read eagerly through Vite's
 *   named-key JSON imports, so only those few top-level keys reach the page bundle;
 *   the index page, the menu and the character cards can list lessons synchronously.
 * - A whole lesson is loaded lazily (one chunk per lesson) only when its page opens.
 *
 * Lesson kinds come only from the explicit schema id (mandarin-character-lesson → character,
 * mandarin-word-lesson → word, …), never from the headword's length or shape. A lesson
 * without a headword is a topic lesson. Lessons attach to a glyph or word record only by
 * an exact written-form match of their recorded headword, so no identity is inferred.
 *
 * Schema v3 moved topics into `classification` (primary_topic_id, topic_ids, tags) and added
 * `lesson_type` and `learning_objectives`; v2.x lessons keep their `lesson.categories` fields,
 * read only when a lesson has no v3 classification.
 */
import categoryRegistry from '@/data/study_lessons/core/lesson_categories.json';

export type LessonKind = 'character' | 'word' | 'phrase' | 'topic';
export type LessonStatus = 'draft' | 'reviewed' | 'approved';
export type LessonCategory = { id: string; label: string; description: string };
export type LessonTerm = { hanzi: string; pinyin: string; meaning_en?: string };

export type LessonSummary = {
  id: string;
  kind: LessonKind;
  schemaVersion: string;
  title: string;
  subtitle: string;
  description: string;
  categories: LessonCategory[];
  primaryCategory: LessonCategory | null;
  tags: string[];
  status: LessonStatus | string;
  audience: string;
  dateReviewed: string | null;
  /** v3 `lesson_type` (character_usage, topic_vocabulary, grammar, …); '' for v2.x lessons. */
  lessonType: string;
  /** v3 `learning_objectives`, in recorded order (empty for v2.x lessons). */
  objectives: string[];
  /** The recorded headword, when the lesson is about one written form. */
  headword: { hanzi: string; pinyin: string } | null;
  /** metadata.catalog_character_id: an explicit Characters record ID (e.g. "Characters:次"), when recorded. */
  catalogCharacterId: string | null;
};

/* ---------- Full lesson document (mirrors core/character_lesson.schema.json) ---------- */
export type LessonVocabItem = { id: string; catalog_id: string | null; hanzi: string; pinyin: string; part_of_speech: string; meaning_en: string; priority: 'A' | 'B' | 'C'; register: string; lexical_status: string; usage_note: string; hsk_level: number | null; hsk_syllabus_id: string | null; frequency_rank: number | null };
export type LessonConstruction = { id: string; category: string; pattern_hanzi: string; pattern_pinyin: string; function_en: string; example: LessonTerm; register: string; usage_note: string };
// v2.5 keeps learner content in JSON and editorial provenance in a separate report.
// Optional provenance fields retain compatibility with earlier lesson documents.
export type LessonExample = { id: string; title: string; hanzi: string; pinyin: string; english: string; context: string; register: string; teaching_note: string; provenance?: string; source_ids?: string[] };
export type LessonContrast = { id: string; hanzi: string; pinyin: string; meaning_en: string; example: LessonTerm; usage: string; limitation: string };
export type LessonPreference = { statement: string; source_ids?: string[]; data: { sample: string; categories: { form_hanzi: string; form_pinyin: string; abstract: number; concrete: number }[] } };
export type LessonMistake = { id: string; incorrect_inference: string; correction: string; reason: string };
export type LessonHistorical = { id: string; function_en: string; hanzi: string; pinyin: string; translation_en: string; explanation: string; source_ids?: string[] };
export type LessonChoice = { id?: string; text?: string; hanzi?: string; pinyin?: string; meaning_en?: string };
export type LessonQuestion = { id: string; kind: 'comprehension' | 'selection' | 'multi_selection' | 'production' | string; prompt: string; choices: LessonChoice[]; correct_choice_ids?: string[]; answer?: string; explanation: string };
export type LessonSource = { id: string; claim: string; author: string; title: string; publication: string; url: string | null; evidence_type: string; verification_status: string; scope_note: string };
export type LessonBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'term'; hanzi: string; pinyin: string; meaning_en: string; note: string }
  | { kind: 'example'; hanzi: string; pinyin: string; english: string; usage_note: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };
export type LessonExtension = { id: string; title: string; category: string; classification: string; visibility: 'learner' | 'editorial' | string; verification_status?: string; source_ids?: string[]; report_ids?: string[]; rationale?: string; blocks: LessonBlock[] };
export type LessonReport = { id: string; title: string; source_type: string; source_locator: string; received_date: string; notes: string };
export type LessonMaterial = { id: string; report_id: string; source_location: string; content_summary: string; handling: string; destinations: { section: string; item_id: string }[]; decision_note: string };

export type LessonSections = {
  overview?: { core_takeaway: string; independent_usage: string; modern_roles: string[]; teaching_priority: string; meaning_map: { id: string; reading: string; function_en: string; register: string; example: LessonTerm | null; evidence?: string }[]; one_minute_explanation: string };
  vocabulary?: { items: LessonVocabItem[]; notes: string };
  constructions?: { enabled: boolean; items: LessonConstruction[]; structural_note: string };
  examples?: { default_provenance?: string; items: LessonExample[] };
  contrasts?: { items: LessonContrast[]; preference_vs_rule: LessonPreference | null };
  mistakes?: { items: LessonMistake[] };
  /** Legacy optional (schema ≤2.3); rendered only when a lesson still carries it. */
  writing?: { mapping_note: string; pronunciation_note: string; pending_checks: string[] };
  historical?: { enabled: boolean; intro: string; items: LessonHistorical[]; caution: string };
  practice?: { enabled: boolean; questions: LessonQuestion[] };
  sources?: { items: LessonSource[]; editorial_status?: string; example_provenance?: string; licensing?: string };
  /** Legacy optional; rendered only when present. */
  checklist?: { items: { id: string; label: string; passed: boolean }[] };
  extensions?: { intro: string; items: LessonExtension[] };
};

/* ---------- Topic lessons (mirrors core/topic_lesson.schema.json v3) ---------- */
/** One recorded example sentence of a topic-lesson word. */
export type TopicExample = { id: string; style?: string; register?: string; hanzi: string; pinyin: string; english: string; teaching_note?: string };
/** A course syllabus entry this word stands for (e.g. hsk3-2025 entry 26). */
export type SyllabusRef = { curriculum_id: string; entry_id: number };
export type TopicVocabItem = { id: string; hanzi: string; pinyin: string; meaning_en: string; primary_pos_id: string; pos_ids: string[]; topic_ids: string[]; examples: TopicExample[]; learning_role: 'introduced' | 'reviewed' | string; syllabus_refs: SyllabusRef[] };
/** A grammar note with the recorded example it points at (resolved by example ID; null when the ID is unknown). */
export type TopicGrammarPoint = { id: string; title: string; explanation: string; example: TopicExample | null };
/** A Mandarin line with its tone-marked pinyin and English (teaching-plan sentences). */
export type PlanLine = { hanzi: string; pinyin: string; english: string };
/** v3.1 `sections.teaching_plan`: the instructional path topic lessons teach before any word list
 *  (dialogue → patterns → guided building → reading → speaking → pitfall/pronunciation → review). */
export type TeachingPlan = {
  dialogue: { title: string; context_en: string; turns: (PlanLine & { speaker: string })[] };
  patterns: { id: string; title: string; explanation_en: string; formula_en: string; examples: PlanLine[] }[];
  guided_building: { instruction_en: string; model: PlanLine; substitutions: { cue_en: string; model_answer: PlanLine }[] };
  reading: { title: string; paragraphs: PlanLine[]; questions: { prompt_en: string; answer_en: string }[] };
  speaking_tasks: { id: string; scenario_en: string; model_answer: PlanLine }[];
  common_pitfall: string;
  pronunciation_focus: string;
  review: { can_do: string[]; entry_ids: number[] };
};
export type TopicContent = {
  /** v3.1 teaching plan; null for v3.0 topic lessons (which keep the word-list layout). */
  plan: TeachingPlan | null;
  description: string;
  focus: string;
  items: TopicVocabItem[];
  related: TopicVocabItem[];
  grammar: TopicGrammarPoint[];
};

export type LessonDocument = {
  summary: LessonSummary;
  intro: { lesson_focus?: string; core_principle?: string; learning_priority?: string };
  headword: { hanzi: string; pinyin: string; simplified?: string; traditional?: LessonTerm[]; readings?: { pinyin: string; context: string }[]; mapping_type?: string } | null;
  metadata: { license_note?: string; hsk?: { level: number | null; official_id: string | null } };
  sections: LessonSections;
  /** Topic-vocabulary content (schema family mandarin-topic-lesson); null for other lessons. */
  topic: TopicContent | null;
  reportIntake: { reports: LessonReport[]; material: LessonMaterial[] };
};

/* ---------- Pure helpers (tested directly) ---------- */
/** Resolve v2.6 answers only through unique, recorded choice IDs. Invalid references
 * fail closed; legacy questions continue to use their recorded answer text. */
export function correctLessonChoices(question: LessonQuestion): LessonChoice[] {
  const correctIds = question.correct_choice_ids ?? [];
  const ids = question.choices.map(choice => choice.id);
  if (!correctIds.length || ids.some(id => !id) || new Set(ids).size !== ids.length || new Set(correctIds).size !== correctIds.length) return [];
  if (question.kind === 'selection' ? correctIds.length !== 1 : question.kind !== 'multi_selection' || correctIds.length < 2) return [];
  if (correctIds.some(id => !ids.includes(id))) return [];
  return question.choices.filter(choice => choice.id && correctIds.includes(choice.id));
}

type RawLesson = { schema_version?: unknown; lesson_id?: unknown; lesson_type?: unknown; lesson?: Record<string, unknown> | undefined; classification?: Record<string, unknown> | null | undefined; learning_objectives?: unknown; metadata?: Record<string, unknown> | undefined; headword?: Record<string, unknown> | null | undefined };
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const strList = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/** Explicit schema id → kind; any other schema family is a topic lesson (never guessed from the headword). */
export function lessonKindFor(schemaVersion: string): LessonKind {
  const family = schemaVersion.split('/')[0] ?? '';
  if (family === 'mandarin-character-lesson') return 'character';
  if (family === 'mandarin-word-lesson') return 'word';
  if (family === 'mandarin-phrase-lesson') return 'phrase';
  return 'topic';
}

export const lessonCategories: LessonCategory[] = (categoryRegistry.categories ?? [])
  .filter(c => c.status === 'active')
  .map(c => ({ id: c.id, label: c.label, description: c.description }));

/** One summary from a lesson's top-level keys; categories resolve only through the shared registry. */
export function summarizeLesson(raw: RawLesson, categories: LessonCategory[] = lessonCategories): LessonSummary | null {
  const id = str(raw.lesson_id);
  const lesson = raw.lesson ?? {};
  const title = str(lesson['title']);
  if (!id || !title) return null;
  const metadata = raw.metadata ?? {};
  const hanzi = str(raw.headword?.['hanzi']);
  const headword = hanzi ? { hanzi, pinyin: str(raw.headword?.['pinyin']) } : null;
  const schemaVersion = str(raw.schema_version);
  const byId = new Map(categories.map(c => [c.id, c]));
  // v3 classification wins; v2.x lessons keep their categories inside `lesson`.
  const cls = raw.classification && typeof raw.classification === 'object' ? raw.classification : null;
  const topicIds = cls ? strList(cls['topic_ids']) : strList(lesson['categories']);
  const primaryId = cls ? str(cls['primary_topic_id']) : str(lesson['primary_category_id']);
  const lessonCats = [...new Set(primaryId ? [primaryId, ...topicIds] : topicIds)].flatMap(cid => { const c = byId.get(cid); return c ? [c] : []; });
  return {
    id, kind: lessonKindFor(schemaVersion), schemaVersion, title,
    subtitle: str(lesson['subtitle']), description: str(lesson['description']),
    categories: lessonCats, primaryCategory: byId.get(primaryId) ?? lessonCats[0] ?? null,
    tags: cls ? strList(cls['tags']) : strList(lesson['tags']), status: str(metadata['status']) || 'draft', audience: str(metadata['audience']),
    dateReviewed: typeof metadata['date_reviewed'] === 'string' ? metadata['date_reviewed'] : null,
    lessonType: str(raw.lesson_type), objectives: strList(raw.learning_objectives),
    headword,
    catalogCharacterId: str(metadata['catalog_character_id']) || null,
  };
}

/** Summaries from the eager key maps, keyed by file path; duplicate lesson IDs fail loudly. */
export function buildLessonIndex(files: Record<string, RawLesson>, categories: LessonCategory[] = lessonCategories): { summaries: LessonSummary[]; pathById: Map<string, string> } {
  const summaries: LessonSummary[] = [];
  const pathById = new Map<string, string>();
  for (const [path, raw] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const summary = summarizeLesson(raw, categories);
    if (!summary) continue;
    if (pathById.has(summary.id)) throw new Error(`Duplicate lesson_id ${summary.id} in ${path}`);
    pathById.set(summary.id, path);
    summaries.push(summary);
  }
  return { summaries, pathById };
}

/** Lessons about exactly this written form for the given record kinds (no normalisation or shape matching). */
export function lessonsForHeadword(summaries: LessonSummary[], hanzi: string, kinds: LessonKind[]): LessonSummary[] {
  return summaries.filter(s => s.headword?.hanzi === hanzi && kinds.includes(s.kind));
}

/** Full document from the raw JSON: missing optional sections stay absent, arrays default to empty. */
export function toLessonDocument(raw: Record<string, unknown>, summary: LessonSummary): LessonDocument {
  const sections = (raw['sections'] ?? {}) as LessonSections;
  const intake = (raw['report_intake'] ?? {}) as Partial<LessonDocument['reportIntake']>;
  const headword = raw['headword'] && typeof raw['headword'] === 'object' && str((raw['headword'] as Record<string, unknown>)['hanzi']) ? raw['headword'] as LessonDocument['headword'] : null;
  const topic = summary.schemaVersion.split('/')[0] === 'mandarin-topic-lesson' ? toTopicContent(raw['sections']) : null;
  return {
    summary,
    topic,
    intro: (raw['intro'] ?? {}) as LessonDocument['intro'],
    headword,
    metadata: (raw['metadata'] ?? {}) as LessonDocument['metadata'],
    sections,
    reportIntake: { reports: intake.reports ?? [], material: intake.material ?? [] },
  };
}

/** Topic-lesson sections as recorded. Grammar points resolve their example only by an exact
 *  example ID inside this lesson's words (null when the ID is missing, never a guessed match). */
export function toTopicContent(rawSections: unknown): TopicContent {
  const s = (rawSections && typeof rawSections === 'object' ? rawSections : {}) as Record<string, unknown>;
  const overview = (s['overview'] ?? {}) as Record<string, unknown>;
  const vocabulary = (s['vocabulary'] ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(vocabulary['items']) ? vocabulary['items'] : []) as TopicVocabItem[];
  const related = (Array.isArray(vocabulary['related_entries']) ? vocabulary['related_entries'] : []) as TopicVocabItem[];
  const examples = new Map(items.flatMap(item => (item.examples ?? []).map(e => [e.id, e] as const)));
  const grammar = (Array.isArray(s['grammar_points']) ? s['grammar_points'] : []) as { id: string; title: string; explanation: string; example_id?: string }[];
  const rawPlan = s['teaching_plan'];
  return {
    plan: rawPlan && typeof rawPlan === 'object' ? toTeachingPlan(rawPlan as Record<string, unknown>) : null,
    description: str(overview['topic_description']), focus: str(overview['focus']),
    items: items.map(item => ({ ...item, examples: item.examples ?? [], syllabus_refs: item.syllabus_refs ?? [], pos_ids: item.pos_ids ?? [], topic_ids: item.topic_ids ?? [] })),
    related: related.map(item => ({ ...item, examples: item.examples ?? [], syllabus_refs: item.syllabus_refs ?? [], pos_ids: item.pos_ids ?? [], topic_ids: item.topic_ids ?? [] })),
    grammar: grammar.map(g => ({ id: g.id, title: str(g.title), explanation: str(g.explanation), example: (g.example_id && examples.get(g.example_id)) || null })),
  };
}

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []) as T[];
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
const line = (value: unknown): PlanLine => { const o = obj(value); return { hanzi: str(o['hanzi']), pinyin: str(o['pinyin']), english: str(o['english']) }; };
/** The teaching plan as recorded; missing lists default to empty so a partial file never crashes the page. */
export function toTeachingPlan(raw: Record<string, unknown>): TeachingPlan {
  const d = obj(raw['dialogue']), b = obj(raw['guided_building']), r = obj(raw['reading']), rv = obj(raw['review']);
  return {
    dialogue: { title: str(d['title']), context_en: str(d['context_en']), turns: arr<unknown>(d['turns']).map(t => ({ ...line(t), speaker: str(obj(t)['speaker']) })) },
    patterns: arr<Record<string, unknown>>(raw['patterns']).map(p => ({ id: str(p['id']), title: str(p['title']), explanation_en: str(p['explanation_en']), formula_en: str(p['formula_en']), examples: arr<unknown>(p['examples']).map(line) })),
    guided_building: { instruction_en: str(b['instruction_en']), model: line(b['model']), substitutions: arr<Record<string, unknown>>(b['substitutions']).map(x => ({ cue_en: str(x['cue_en']), model_answer: line(x['model_answer']) })) },
    reading: { title: str(r['title']), paragraphs: arr<unknown>(r['paragraphs']).map(line), questions: arr<Record<string, unknown>>(r['questions']).map(q => ({ prompt_en: str(q['prompt_en']), answer_en: str(q['answer_en']) })) },
    speaking_tasks: arr<Record<string, unknown>>(raw['speaking_tasks']).map(t => ({ id: str(t['id']), scenario_en: str(t['scenario_en']), model_answer: line(t['model_answer']) })),
    common_pitfall: str(raw['common_pitfall']), pronunciation_focus: str(raw['pronunciation_focus']),
    review: { can_do: strList(rv['can_do']), entry_ids: arr<unknown>(rv['entry_ids']).filter((n): n is number => typeof n === 'number') },
  };
}

/** Syllabus editions a curriculum ID stands for, as recorded by its manifest (hsk3-2025 is the
 *  CLEC HSK 3.0 syllabus, edition 2025-11, the same source as the Vocabulary entries). */
export const SYLLABUS_VERSION: Record<string, '3.0'> = { 'hsk3-2025': '3.0' };
type SyllabusEntry = { id: string; simplified: string; entryKind: string; hskVersion: string | null; hsk_index: number | null };
/** The one Vocabulary entry a topic-lesson word stands for: same syllabus edition, same HSK
 *  entry number AND the exact same headword. Anything else (unknown curriculum, no match, a
 *  number whose headword differs, several matches) is null, so no word identity is guessed —
 *  点 #33 and 点 #336 stay apart because only the recorded number decides. */
export function syllabusEntryFor<T extends SyllabusEntry>(item: Pick<TopicVocabItem, 'hanzi' | 'syllabus_refs'>, entries: readonly T[]): T | null {
  const found = new Set<T>();
  for (const ref of item.syllabus_refs) {
    const version = SYLLABUS_VERSION[ref.curriculum_id];
    if (!version) continue;
    for (const e of entries) if (e.entryKind === 'word' && e.hskVersion === version && e.hsk_index === ref.entry_id && e.simplified === item.hanzi) found.add(e);
  }
  return found.size === 1 ? [...found][0]! : null;
}

/* ---------- Project data ---------- */
// Vite needs a literal pattern in every glob call, so the pattern repeats. Every lesson
// directory is named *_LESSON_*; lessons/legacy/ (pre-v3 copies) is excluded.
const ids = import.meta.glob<string>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'lesson_id' });
const schemas = import.meta.glob<string>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'schema_version' });
const lessonKeys = import.meta.glob<Record<string, unknown>>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'lesson' });
const metadataKeys = import.meta.glob<Record<string, unknown>>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'metadata' });
// Only headword lesson kinds record `headword` (topic, grammar and other general lessons have
// none), and a named import of a key a JSON file lacks breaks the whole page, so this one
// key is read only from the headword kinds' directories (<KIND>_LESSON_<KEY>, per core/).
const headwordKeys = import.meta.glob<Record<string, unknown> | null>(['/src/data/study_lessons/lessons/**/CHARACTER_LESSON_*/*.json', '/src/data/study_lessons/lessons/**/WORD_LESSON_*/*.json', '/src/data/study_lessons/lessons/**/PHRASE_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'headword' });
const loaders = import.meta.glob<Record<string, unknown>>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { import: 'default' });
const typeKeys = import.meta.glob<string>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'lesson_type' });
const classificationKeys = import.meta.glob<Record<string, unknown>>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'classification' });
const objectiveKeys = import.meta.glob<string[]>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'learning_objectives' });
const refsKeys = import.meta.glob<Record<string, unknown>>(['/src/data/study_lessons/lessons/**/*_LESSON_*/*.json', '!/src/data/study_lessons/lessons/legacy/**'], { eager: true, import: 'catalog_character_refs' });

const raws: Record<string, RawLesson> = Object.fromEntries(Object.keys(ids).map(path => [path, {
  lesson_id: ids[path], schema_version: schemas[path], lesson_type: typeKeys[path], lesson: lessonKeys[path], classification: classificationKeys[path] ?? null, learning_objectives: objectiveKeys[path], metadata: metadataKeys[path], headword: headwordKeys[path] ?? null,
}]));
const index = buildLessonIndex(raws);
/** Every lesson, in stable file order. */
export const lessonSummaries: LessonSummary[] = index.summaries;
export const lessonSummary = (id: string) => lessonSummaries.find(s => s.id === id);
/** Character lessons for one Characters record: a recorded catalog_character_id must equal the
 *  record ID; without one, the lesson's headword must equal the record's exact hanzi. */
export function lessonsForCharacterRecord(summaries: LessonSummary[], recordId: string, hanzi: string): LessonSummary[] {
  return summaries.filter(s => s.kind === 'character' && (s.catalogCharacterId ? s.catalogCharacterId === recordId : s.headword?.hanzi === hanzi));
}
export const characterLessons = (recordId: string, hanzi: string) => lessonsForCharacterRecord(lessonSummaries, recordId, hanzi);

/** A lesson's recorded catalog_character_refs, validated: single-character keys mapped to
 *  exact "Kind:glyph" record IDs. Anything malformed is dropped, never repaired. */
function validCharacterRefs(raw: unknown): Record<string, string> {
  const refs: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return refs;
  for (const [glyph, id] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.from(glyph).length !== 1 || typeof id !== 'string') continue;
    const sep = id.indexOf(':');
    if (sep <= 0 || id.slice(sep + 1) !== glyph) continue;
    refs[glyph] = id;
  }
  return refs;
}
/** Per-lesson exact character → record ID tables (top-level catalog_character_refs). */
export const lessonCharacterRefs: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(refsKeys).flatMap(([path, raw]) => {
    const id = ids[path];
    return id ? [[id, validCharacterRefs(raw)]] : [];
  }),
);

/** Loads one whole lesson (its own lazy chunk); null when no lesson has this ID. */
export async function loadLesson(id: string): Promise<LessonDocument | null> {
  const summary = lessonSummary(id);
  const path = index.pathById.get(id);
  const load = path ? loaders[path] : undefined;
  if (!summary || !load) return null;
  return toLessonDocument(await load(), summary);
}
