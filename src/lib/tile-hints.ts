/**
 * Shared hover hints for clickable hanzi tiles (decomposition boxes, "In a character"
 * rows, script/radical form tiles, sentence characters, review chips…).
 *
 * Owner rule: a tile hint always says what the click will do, in one consistent
 * sentence ("Click to open 贝's character details"). It never repeats the meaning or
 * reading printed beside the tile, nor names only the script (the purple box and the
 * Traditional pill already show that).
 *
 * Inputs are the exact glyph shown on the tile and the destination it really links to
 * (the library tab of its record, a vocabulary word, Practice…), so the hint can never
 * promise a different record than the link opens.
 */
export type TileHintKind = 'Characters' | 'Components' | 'Radicals' | 'Strokes' | 'word' | 'phrase';

const KIND_NOUN: Record<TileHintKind, string> = {
  Characters: 'character', Components: 'component', Radicals: 'radical', Strokes: 'stroke', word: 'word', phrase: 'phrase',
};

/** "Click to open 贝's character details" — the tile opens that record's details window. */
export function openDetailsHint(glyph: string, kind: TileHintKind | string | undefined) {
  const noun = KIND_NOUN[(kind ?? 'Characters') as TileHintKind] ?? 'character';
  return `Click to open ${glyph}'s ${noun} details`;
}

/** "Click to switch to 預" — a form tile that swaps the open details window to that form. */
export function switchFormHint(glyph: string, selected: boolean) {
  return selected ? `Showing ${glyph} now` : `Click to switch to ${glyph}`;
}

/** "Click to practice writing 預" — a tile that opens (or switches) Practice to that glyph. */
export function practiceHint(glyph: string, selected = false) {
  return selected ? `Practicing ${glyph} now` : `Click to practice writing ${glyph}`;
}
