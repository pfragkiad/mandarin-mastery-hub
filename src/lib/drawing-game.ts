import { filterLibrary, type LibraryEntry } from './character-library';
import { reuseGroups, type ReuseGroup } from './component-reuse';

export const drawingKinds = ['Characters', 'Radicals', 'Components'] as const;
export type DrawingKind = typeof drawingKinds[number];
export type DrawingSearch = { kind?: DrawingKind | undefined; strokes?: string | undefined; usage?: ReuseGroup | undefined; errors?: boolean | undefined };
export type DrawingResult = 'correct' | 'missed' | 'passed' | 'unavailable';

export function drawingSearch(search: Record<string, unknown>): DrawingSearch {
  const kind = drawingKinds.find(value => value === search['kind']);
  const usage = reuseGroups.find(group => group.value === search['usage'])?.value;
  const strokes = String(search['strokes'] ?? '');
  const filtered = kind === 'Radicals' || kind === 'Components';
  return { ...(kind ? { kind } : {}), ...(filtered && /^[1-9]\d*$/.test(strokes) ? { strokes } : {}),
    ...(filtered && usage ? { usage } : {}), ...(search['errors'] === true || search['errors'] === 'true' ? { errors: true } : {}) };
}

/** Use actual recorded clues, explicit script flags and the library's sourced usage counts. */
export function drawingPool(entries: LibraryEntry[], search: DrawingSearch, includeTraditional: boolean) {
  const filtered = search.kind === 'Radicals' || search.kind === 'Components';
  return filterLibrary(entries, '', filtered ? search.strokes : '', false, includeTraditional, filtered ? search.usage : undefined)
    .filter(entry => Array.from(entry.hanzi).length === 1 && entry.pinyin.trim() && entry.meaning.trim());
}

export function shuffledDrawingDeck(entries: LibraryEntry[], size = 10): LibraryEntry[] {
  const deck = [...entries];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = deck[i]; const b = deck[j];
    if (a && b) { deck[i] = b; deck[j] = a; }
  }
  return deck.slice(0, size);
}

export function mistakeOutcome(allowErrors: boolean): 'drawing' | 'missed' {
  return allowErrors ? 'drawing' : 'missed';
}