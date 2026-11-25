import { filterLibrary, type LibraryEntry } from './character-library';
import { parseUsageGroup } from './usage-frequency';
import { matchesTopic, partOfSpeechList, vocabularyKind, type Word } from './mandarin';
import { includeScript } from './learning-preferences';
import { isValidStrokeFilter } from './stroke-range';
import { ALL_SUBTOPICS, inSubtopic } from './vocabulary-subtopics';
import { lessonCourseIds, lessonDeckIds } from './flashcard-lessons';

export const drawingKinds = ['Characters', 'Components', 'Radicals', 'Words'] as const;
export type DrawingKind = typeof drawingKinds[number];
export type DrawingSearch = { kind?: DrawingKind | undefined; strokes?: string | undefined; usage?: string | undefined; collection?: string | undefined; subtopic?: string | undefined; level?: string | undefined; pos?: string | undefined; course?: string | undefined; lesson?: string | undefined; saved?: boolean | undefined; /** '1' widens the rank group to rank 1..group end ("include lower ranks"). */ usageUpTo?: '1' | undefined; /** '1' widens the stroke count to 1..count ("include fewer strokes"). */ strokesUpTo?: '1' | undefined };
export type DrawingCard = LibraryEntry & { word?: Word; characterIndex?: number };
export type DrawingResult = 'correct' | 'guided' | 'passed' | 'unavailable';

export function drawingSearch(search: Record<string, unknown>): DrawingSearch {
  const kind = drawingKinds.find(value => value === search['kind']);
  const usage = kind && kind !== 'Words' ? parseUsageGroup(kind, search['usage']) : undefined;
  const strokes = String(search['strokes'] ?? '');
  const filtered = kind !== 'Words';
  const validStrokes = filtered && isValidStrokeFilter(strokes);
  const hasLessons = kind === undefined || kind === 'Characters' || kind === 'Words';
  return { ...(kind ? { kind } : {}), ...(validStrokes ? { strokes } : {}),
    ...(kind === 'Words' && typeof search['collection'] === 'string' && search['collection'].trim() ? { collection: search['collection'] } : {}),
    ...(kind === 'Words' && typeof search['subtopic'] === 'string' && search['subtopic'].trim() ? { subtopic: search['subtopic'] } : {}),
    ...(kind === 'Words' && typeof search['level'] === 'string' && search['level'].trim() ? { level: search['level'] } : {}),
    ...(kind === 'Words' && typeof search['pos'] === 'string' && search['pos'].trim() ? { pos: search['pos'] } : {}),
    ...(hasLessons && typeof search['course'] === 'string' && search['course'].trim() ? { course: search['course'] } : {}),
    ...(hasLessons && typeof search['lesson'] === 'string' && search['lesson'].trim() ? { lesson: search['lesson'] } : {}),
    ...(usage ? { usage } : {}),
    ...(usage && (search['usageUpTo'] === '1' || search['usageUpTo'] === true) ? { usageUpTo: '1' as const } : {}),
    ...(validStrokes && (search['strokesUpTo'] === '1' || search['strokesUpTo'] === true) ? { strokesUpTo: '1' as const } : {}),
    ...(search['saved'] === true || search['saved'] === '1' ? { saved: true } : {}) };
}

function drawingLessonIds(search: DrawingSearch, items: readonly Word[] = []) {
  const kind = search.kind ?? 'Characters';
  if (kind !== 'Characters' && kind !== 'Words') return undefined;
  if (search.lesson) return lessonDeckIds(search.lesson, kind, items);
  return search.course ? lessonCourseIds(search.course, kind, items) : undefined;
}

/** Use actual recorded clues, explicit script flags and the library's corpus frequency groups. */
export function drawingPool(entries: LibraryEntry[], search: DrawingSearch, includeTraditional: boolean, savedIds?: readonly string[]) {
  const filtered = search.kind !== 'Words';
  const inLesson = drawingLessonIds(search);
  return filterLibrary(entries, '', filtered ? search.strokes : '', false, includeTraditional, search.kind === 'Words' ? undefined : search.usage, search.saved ? savedIds : undefined, false, false, search.usageUpTo === '1', search.strokesUpTo === '1')
    .filter(entry => (!inLesson || inLesson.has(entry.id)) && Array.from(entry.hanzi).length === 1 && entry.pinyin.trim() && entry.meaning.trim());
}

const wordCharacters = (word: Word) => Array.from(word.hanzi).flatMap((hanzi, index) => /\p{Unified_Ideograph}/u.test(hanzi) ? [{ hanzi, index }] : []);

/** Mask the target even from accessible labels; pinyin comes from exact word tokens only. */
export function drawingWordClues(card: DrawingCard) {
  if (!card.word) return [];
  const tokens = card.word.entry?.tokens ?? [];
  const aligned = tokens.map(token => token.text).join('') === card.word.hanzi;
  const readings = aligned ? tokens.flatMap(token => Array.from(token.text).map(() => Array.from(token.text).length === 1 ? token.pinyin ?? '' : '')) : [];
  return Array.from(card.word.hanzi).map((glyph, index) => ({
    glyph: index === card.characterIndex ? '' : glyph,
    pinyin: readings[index] ?? '', selected: index === card.characterIndex, index,
  }));
}

/** Keep words and exact vocabulary IDs; sample words first, then character occurrences. */
export function drawingWordPool(items: Word[], search: DrawingSearch, includeTraditional: boolean, savedIds?: readonly string[]): DrawingCard[] {
  const inLesson = drawingLessonIds({ ...search, kind: 'Words' }, items);
  return items.filter(word => vocabularyKind(word) === 'word' && includeScript(word.script, includeTraditional)
    && (!search.saved || (savedIds ?? []).includes(word.id))
    && (!inLesson || inLesson.has(word.id))
    && matchesTopic(word, search.collection || '') && inSubtopic(word, search.subtopic || ALL_SUBTOPICS)
    && (!search.level || word.level === search.level)
    && (!search.pos || partOfSpeechList(word).includes(search.pos))
    && word.pinyin.trim() && word.meaning.trim() && wordCharacters(word).length > 0)
    .map(word => ({ id: word.id, hanzi: wordCharacters(word)[0]?.hanzi ?? '', pinyin: word.pinyin, meaning: word.meaning, note: '', word }));
}

export function shuffledDrawingDeck(entries: DrawingCard[], size = 10): DrawingCard[] {
  const deck = [...entries];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = deck[i]; const b = deck[j];
    if (a && b) { deck[i] = b; deck[j] = a; }
  }
  return deck.slice(0, size).map(card => {
    if (!card.word || card.characterIndex !== undefined) return card;
    const characters = wordCharacters(card.word);
    const selected = characters[Math.floor(Math.random() * characters.length)];
    return selected ? { ...card, hanzi: selected.hanzi, characterIndex: selected.index } : card;
  });
}
