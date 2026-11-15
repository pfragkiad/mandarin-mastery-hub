import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { libraryEntries } from './character-library';

// This public authoring export must stay in sync with actual selectable records:
// a plausible Characters:<glyph> string is insufficient if that record is excluded.
const exported = JSON.parse(readFileSync('public/data/catalog_ids.json', 'utf8')) as { characters: Record<string, string> };

describe('exported character IDs', () => {
  it('matches every selectable Characters record without adding inferred identities', () => {
    const expected = Object.fromEntries(libraryEntries('Characters').map(entry => [entry.hanzi, entry.id]));
    expect(Object.keys(expected).length).toBeGreaterThan(0);
    expect(exported).toEqual({ characters: expected });
  });

  it('keeps lesson characters and dual radical forms in the Characters namespace', () => {
    for (const glyph of ['次', '一', '上', '这', '下', '每', '再', '以', '门', '马']) {
      expect(exported.characters[glyph]).toBe(`Characters:${glyph}`);
    }
    expect(exported.characters['氵']).toBeUndefined();
    expect(exported.characters['⺮']).toBeUndefined();
  });
});
