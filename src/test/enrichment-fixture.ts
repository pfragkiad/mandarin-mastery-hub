// Test-only loader for the per-character BabelStone enrichment sidecars, reading the same
// public/data files the browser fetches so tests exercise real recorded trees.
import fs from 'fs';
import type { CharacterEnrichment } from '@/lib/character-enrichment';

export async function readEnrichment(character: string): Promise<CharacterEnrichment | null> {
  const point = character.codePointAt(0);
  if (point === undefined || Array.from(character).length !== 1) return null;
  const path = `public/data/character-enrichment/${point.toString(16)}.json`;
  if (!fs.existsSync(path)) return null;
  const envelope = JSON.parse(fs.readFileSync(path, 'utf8'));
  return envelope.character === character ? envelope.record as CharacterEnrichment : null;
}
