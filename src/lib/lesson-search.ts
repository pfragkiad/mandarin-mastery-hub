/**
 * Lesson search (browser-safe, no React): the Lessons page's search box.
 *
 * Purpose: find lessons by anything a learner reads in them — titles, topics and tags, plus the
 * lesson's own text (hanzi, pinyin and English in examples, dialogues, explanations, quizzes).
 *
 * Inputs: the whole raw lesson JSON (loaded lazily, only once someone searches) and its summary.
 * Bookkeeping fields (IDs, schema/template versions, register/status codes, the character
 * reference table, metadata) are skipped, so an internal code never makes a lesson match.
 *
 * Matching is a plain substring test, never a guess: case-insensitive, and tone-insensitive
 * while the query has no tone marks (`xianzai` finds xiànzài); a query typed with tone marks
 * (`xiànzài`) matches only that exact tone spelling. Tone numbers count as tone marks
 * (`ma1` = mā, `xue2sheng1` = xuéshēng, `lv4` = lǜ, 5 = neutral); a number is read as a tone only
 * right after a real pinyin syllable, so `lesson 2` stays plain text. Spaced numbered syllables
 * (`xue2 sheng1`) also match the joined word. Curly quotes read as straight ones.
 * Each hit carries the original text of the first matching passage, with the match position,
 * so the results can show where the lesson says it.
 */
import type { LessonSummary } from './lessons';
import { parsePinyin, toneMark } from './pinyin-guide';

/** One passage of searchable text, with its folded form and a map back to the original. */
type Passage = { text: string; folded: string; exactFolded: string; map: number[]; exactMap: number[]; headline: boolean };
export type LessonSearchEntry = { lesson: LessonSummary; passages: Passage[] };
export type LessonSearchHit = { lesson: LessonSummary; snippet: { before: string; match: string; after: string } };

const SKIP_TOP = new Set(['catalog_character_refs', 'metadata', 'classification', 'schema_version', 'template_version', 'lesson_id']);
const SKIP_KEYS = new Set(['id', 'kind', 'register', 'style', 'status', 'language', 'slug', 'priority', 'learning_role', 'lexical_status', 'mapping_type', 'visibility', 'vocabulary_display', 'speaker', 'date_reviewed', 'lesson_type', 'template_version', 'schema_version']);
const skipKey = (key: string) => SKIP_KEYS.has(key) || /(^|_)ids?$/.test(key);

const MARKS = /\p{M}/gu;
const quotes = (s: string) => s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
/** Folds one character; `keepTones` keeps tone marks (exact-tone queries). */
const foldChar = (c: string, keepTones: boolean) => {
  const q = quotes(c).toLowerCase();
  return keepTones ? q.normalize('NFC') : q.normalize('NFD').replace(MARKS, '');
};
/** Folds text character by character, recording which original index each folded unit came from. */
function fold(text: string, keepTones: boolean): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  let index = 0;
  for (const c of text) {
    const f = foldChar(c, keepTones);
    for (let i = 0; i < f.length; i += 1) map.push(index);
    folded += f;
    index += c.length;
  }
  map.push(index);
  return { folded, map };
}
const passage = (text: string, headline: boolean): Passage => {
  const loose = fold(text, false);
  const exact = fold(text, true);
  return { text, folded: loose.folded, map: loose.map, exactFolded: exact.folded, exactMap: exact.map, headline };
};

/** Every learner-facing string in a raw lesson JSON, in document order. */
export function lessonTexts(raw: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown, key: string | null, top: boolean) => {
    if (typeof value === 'string') { if (value.trim()) out.push(value); return; }
    if (Array.isArray(value)) { for (const v of value) walk(v, key, false); return; }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if ((top && SKIP_TOP.has(k)) || skipKey(k)) continue;
        walk(v, k, false);
      }
    }
  };
  walk(raw, null, true);
  return out;
}

/** Builds one lesson's search entry: headline fields (title, subtitle, headword, topics, tags) first. */
export function lessonSearchEntry(lesson: LessonSummary, raw: unknown): LessonSearchEntry {
  const headline = [lesson.title, lesson.subtitle, lesson.headword?.hanzi, lesson.headword?.pinyin, ...lesson.categories.map(c => c.label), ...lesson.tags]
    .filter((s): s is string => Boolean(s && s.trim()));
  const seen = new Set<string>();
  const passages: Passage[] = [];
  for (const [list, isHeadline] of [[headline, true], [[lesson.description, ...lesson.objectives, ...lessonTexts(raw)], false]] as const) {
    for (const text of list) {
      if (!text || seen.has(text)) continue;
      seen.add(text);
      passages.push(passage(text, isHeadline));
    }
  }
  return { lesson, passages };
}

const TONED = /[\u0300-\u0304\u030c]/;
/** Rewrites tone-number syllables as tone marks (`xue2sheng1` → xuéshēng); anything that is
 *  not a real syllable followed by 1–5 is left exactly as typed. */
export function numberedToMarks(query: string): string {
  return query.replace(/([a-zü:v]+?)([1-5])(?![0-9])/g, (whole, letters: string, digit: string) => {
    const syllable = letters.replace(/u:|v/g, 'ü');
    const parsed = parsePinyin(syllable + digit);
    return parsed && parsed.tone ? toneMark(syllable, parsed.tone) : whole;
  });
}
/** The query as matched: trimmed, folded, and whether it asks for exact tones. `texts` holds
 *  the folded query plus, for spaced numbered pinyin, the same syllables joined. */
export function lessonQuery(query: string): { texts: string[]; exactTones: boolean } | null {
  const typed = quotes(query.trim()).toLowerCase();
  if (!typed) return null;
  const numbered = /[a-zü:v][1-5]/.test(typed);
  const trimmed = numbered ? numberedToMarks(typed).normalize('NFC') : typed;
  const exactTones = TONED.test(trimmed.normalize('NFD')) || (numbered && trimmed !== typed);
  const text = exactTones ? trimmed.normalize('NFC') : trimmed.normalize('NFD').replace(MARKS, '');
  const joined = numbered && /\s/.test(text) ? text.replace(/\s+/g, '') : null;
  return { texts: joined ? [text, joined] : [text], exactTones };
}

const SNIPPET = 60;
/** The lesson's hit for `query` (headline passages win), or null when nothing matches. */
export function matchLesson(entry: LessonSearchEntry, query: string): LessonSearchHit | null {
  const q = lessonQuery(query);
  if (!q) return null;
  for (const p of entry.passages) {
    const folded = q.exactTones ? p.exactFolded : p.folded;
    const map = q.exactTones ? p.exactMap : p.map;
    const needle = q.texts.find(t => folded.includes(t));
    if (!needle) continue;
    const at = folded.indexOf(needle);
    const start = map[at] ?? 0;
    const end = map[at + needle.length] ?? p.text.length;
    const from = Math.max(0, start - SNIPPET);
    const to = Math.min(p.text.length, end + SNIPPET);
    return { lesson: entry.lesson, snippet: {
      before: (from > 0 ? '…' : '') + p.text.slice(from, start),
      match: p.text.slice(start, end),
      after: p.text.slice(end, to) + (to < p.text.length ? '…' : ''),
    } };
  }
  return null;
}

/** Hits in `entries`' order, lessons matching in their title/headword/topics/tags first. */
export function searchLessons(entries: LessonSearchEntry[], query: string): LessonSearchHit[] {
  const hits = entries.flatMap(e => { const hit = matchLesson(e, query); return hit ? [{ hit, headline: isHeadlineHit(e, query) }] : []; });
  return [...hits.filter(h => h.headline), ...hits.filter(h => !h.headline)].map(h => h.hit);
}
function isHeadlineHit(entry: LessonSearchEntry, query: string): boolean {
  const q = lessonQuery(query);
  return Boolean(q && entry.passages.some(p => p.headline && q.texts.some(t => (q.exactTones ? p.exactFolded : p.folded).includes(t))));
}
