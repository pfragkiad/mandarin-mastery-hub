import { filterLibrary, type LibraryEntry } from './character-library';
import { reuseGroups, type ReuseGroup } from './component-reuse';
import { vocabularyKind, type Word } from './mandarin';
import { includeScript } from './learning-preferences';

export const drawingKinds = ['Characters', 'Radicals', 'Components', 'Words'] as const;
export type DrawingKind = typeof drawingKinds[number];
export type DrawingSearch = { kind?: DrawingKind | undefined; strokes?: string | undefined; usage?: ReuseGroup | undefined; collection?: string | undefined; level?: string | undefined };
export type DrawingCard = LibraryEntry & { word?: Word; characterIndex?: number };
export type DrawingResult = 'correct' | 'guided' | 'passed' | 'unavailable';

export function drawingSearch(search: Record<string, unknown>): DrawingSearch {
  const kind = drawingKinds.find(value => value === search['kind']);
  const usage = reuseGroups.find(group => group.value === search['usage'])?.value;
  const strokes = String(search['strokes'] ?? '');
  const filtered = kind === 'Radicals' || kind === 'Components';
  return { ...(kind ? { kind } : {}), ...(filtered && /^[1-9]\d*$/.test(strokes) ? { strokes } : {}),
    ...(kind === 'Words' && typeof search['collection'] === 'string' && search['collection'].trim() ? { collection: search['collection'] } : {}),
    ...(kind === 'Words' && typeof search['level'] === 'string' && search['level'].trim() ? { level: search['level'] } : {}),
    ...(filtered && usage ? { usage } : {}) };
}

/** Use actual recorded clues, explicit script flags and the library's sourced usage counts. */
export function drawingPool(entries: LibraryEntry[], search: DrawingSearch, includeTraditional: boolean) {
  const filtered = search.kind === 'Radicals' || search.kind === 'Components';
  return filterLibrary(entries, '', filtered ? search.strokes : '', false, includeTraditional, filtered ? search.usage : undefined)
    .filter(entry => Array.from(entry.hanzi).length === 1 && entry.pinyin.trim() && entry.meaning.trim());
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
export function drawingWordPool(items: Word[], search: DrawingSearch, includeTraditional: boolean): DrawingCard[] {
  return items.filter(word => vocabularyKind(word) === 'word' && includeScript(word.script, includeTraditional)
    && (!search.collection || word.collection === search.collection) && (!search.level || word.level === search.level)
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