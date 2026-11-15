/**
 * Study lessons (browser-safe, no React).
 *
 * Source of truth: the JSON lesson files under src/data/study_lessons/lessons/<DIR>/<FILE>.json
 * plus the shared category registry src/data/study_lessons/core/lesson_categories.json. The
 * Markdown copies beside them are generated from the same JSON and are never read here.
 *
 * Two ways in:
 * - Summaries (title, categories, headword, status) are read eagerly through Vite's
 *   named-key JSON imports, so only those few top-level keys reach the page bundle;
 *   the index page, the menu and the character cards can list lessons synchronously.
 * - A whole lesson is loaded lazily (one chunk per lesson) only when its page opens.
 *
 * Lesson kinds come only from the explicit schema id (mandarin-character-lesson → character,
 * mandarin-word-lesson → word, …), never from the headword's length or shape. A lesson
 * without a headword is a topic lesson. Lessons attach to a glyph or word record only by
 * an exact written-form match of their recorded headword, so no identity is inferred.
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
  /** The recorded headword, when the lesson is about one written form. */
  headword: { hanzi: string; pinyin: string } | null;
};

/* ---------- Full lesson document (mirrors core/character_lesson.schema.json) ---------- */
export type LessonVocabItem = { id: string; catalog_id: string | null; hanzi: string; pinyin: string; part_of_speech: string; meaning_en: string; priority: 'A' | 'B' | 'C'; register: string; lexical_status: string; usage_note: string; hsk_level: number | null; hsk_syllabus_id: string | null; frequency_rank: number | null };
export type LessonConstruction = { id: string; category: string; pattern_hanzi: string; pattern_pinyin: string; function_en: string; example: LessonTerm; register: string; usage_note: string };
export type LessonExample = { id: string; title: string; hanzi: string; pinyin: string; english: string; context: string; register: string; teaching_note: string; provenance: string; source_ids: string[] };
export type LessonContrast = { id: string; hanzi: string; pinyin: string; meaning_en: string; example: LessonTerm; usage: string; limitation: string };
export type LessonPreference = { statement: string; source_ids: string[]; data: { sample: string; categories: { form_hanzi: string; form_pinyin: string; abstract: number; concrete: number }[] } };
export type LessonMistake = { id: string; incorrect_inference: string; correction: string; reason: string };
export type LessonHistorical = { id: string; function_en: string; hanzi: string; pinyin: string; translation_en: string; explanation: string; source_ids: string[] };
export type LessonQuestion = { id: string; kind: 'comprehension' | 'selection' | 'production' | string; prompt: string; choices: LessonTerm[]; answer: string; explanation: string };
export type LessonSource = { id: string; claim: string; author: string; title: string; publication: string; url: string | null; evidence_type: string; verification_status: string; scope_note: string };
export type LessonBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'term'; hanzi: string; pinyin: string; meaning_en: string; note: string }
  | { kind: 'example'; hanzi: string; pinyin: string; english: string; usage_note: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };
export type LessonExtension = { id: string; title: string; category: string; classification: string; visibility: 'learner' | 'editorial' | string; verification_status: string; source_ids: string[]; report_ids: string[]; rationale: string; blocks: LessonBlock[] };
export type LessonReport = { id: string; title: string; source_type: string; source_locator: string; received_date: string; notes: string };
export type LessonMaterial = { id: string; report_id: string; source_location: string; content_summary: string; handling: string; destinations: { section: string; item_id: string }[]; decision_note: string };

export type LessonSections = {
  overview?: { core_takeaway: string; independent_usage: string; modern_roles: string[]; teaching_priority: string; meaning_map: { id: string; reading: string; function_en: string; register: string; example: LessonTerm; evidence: string }[]; one_minute_explanation: string };
  vocabulary?: { items: LessonVocabItem[]; notes: string };
  constructions?: { enabled: boolean; items: LessonConstruction[]; structural_note: string };
  examples?: { default_provenance: string; items: LessonExample[] };
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

export type LessonDocument = {
  summary: LessonSummary;
  intro: { lesson_focus?: string; core_principle?: string; learning_priority?: string };
  headword: { hanzi: string; pinyin: string; simplified?: string; traditional?: LessonTerm[]; readings?: { pinyin: string; context: string }[]; mapping_type?: string } | null;
  metadata: { license_note?: string; hsk?: { level: number | null; official_id: string | null } };
  sections: LessonSections;
  reportIntake: { reports: LessonReport[]; material: LessonMaterial[] };
};

/* ---------- Pure helpers (tested directly) ---------- */
type RawLesson = { schema_version?: unknown; lesson_id?: unknown; lesson?: Record<string, unknown> | undefined; metadata?: Record<string, unknown> | undefined; headword?: Record<string, unknown> | null | undefined };
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
  const lessonCats = strList(lesson['categories']).flatMap(cid => { const c = byId.get(cid); return c ? [c] : []; });
  const primaryId = str(lesson['primary_category_id']);
  return {
    id, kind: lessonKindFor(schemaVersion), schemaVersion, title,
    subtitle: str(lesson['subtitle']), description: str(lesson['description']),
    categories: lessonCats, primaryCategory: byId.get(primaryId) ?? lessonCats[0] ?? null,
    tags: strList(lesson['tags']), status: str(metadata['status']) || 'draft', audience: str(metadata['audience']),
    dateReviewed: typeof metadata['date_reviewed'] === 'string' ? metadata['date_reviewed'] : null,
    headword,
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
  return {
    summary,
    intro: (raw['intro'] ?? {}) as LessonDocument['intro'],
    headword,
    metadata: (raw['metadata'] ?? {}) as LessonDocument['metadata'],
    sections,
    reportIntake: { reports: intake.reports ?? [], material: intake.material ?? [] },
  };
}

/* ---------- Project data ---------- */
// Vite needs a literal pattern in every glob call, so the path repeats.
const ids = import.meta.glob<string>('/src/data/study_lessons/lessons/*/*.json', { eager: true, import: 'lesson_id' });
const schemas = import.meta.glob<string>('/src/data/study_lessons/lessons/*/*.json', { eager: true, import: 'schema_version' });
const lessonKeys = import.meta.glob<Record<string, unknown>>('/src/data/study_lessons/lessons/*/*.json', { eager: true, import: 'lesson' });
const metadataKeys = import.meta.glob<Record<string, unknown>>('/src/data/study_lessons/lessons/*/*.json', { eager: true, import: 'metadata' });
const headwordKeys = import.meta.glob<Record<string, unknown> | null>('/src/data/study_lessons/lessons/*/*.json', { eager: true, import: 'headword' });
const loaders = import.meta.glob<Record<string, unknown>>('/src/data/study_lessons/lessons/*/*.json', { import: 'default' });

const raws: Record<string, RawLesson> = Object.fromEntries(Object.keys(ids).map(path => [path, {
  lesson_id: ids[path], schema_version: schemas[path], lesson: lessonKeys[path], metadata: metadataKeys[path], headword: headwordKeys[path] ?? null,
}]));
const index = buildLessonIndex(raws);
/** Every lesson, in stable file order. */
export const lessonSummaries: LessonSummary[] = index.summaries;
export const lessonSummary = (id: string) => lessonSummaries.find(s => s.id === id);
/** Character lessons for a Characters record with exactly this hanzi. */
export const characterLessons = (hanzi: string) => lessonsForHeadword(lessonSummaries, hanzi, ['character']);

/** Loads one whole lesson (its own lazy chunk); null when no lesson has this ID. */
export async function loadLesson(id: string): Promise<LessonDocument | null> {
  const summary = lessonSummary(id);
  const path = index.pathById.get(id);
  const load = path ? loaders[path] : undefined;
  if (!summary || !load) return null;
  return toLessonDocument(await load(), summary);
}
