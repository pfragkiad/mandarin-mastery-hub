import { referenceCatalog, type ReferenceKind } from '@/components/tutor/references';
import { includeScript } from './learning-preferences';
import type { Word } from './mandarin';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export type SearchHit =
  | { kind: 'Word'; word: Word }
  | { kind: ReferenceKind; hanzi: string; pinyin: string; meaning: string; note: string };

export function searchAll(items: Word[], query: string, includeTraditional = false, limit = 8): SearchHit[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const wordHits: SearchHit[] = items
    .filter(w => includeScript(w.script, includeTraditional) && normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.translation}`).includes(q))
    .map(word => ({ kind: 'Word' as const, word }));
  const refHits: SearchHit[] = referenceCatalog.flatMap(({ kind, entries }) =>
    entries
      .filter(([hanzi, pinyin, meaning, note, script]) => includeScript(script, includeTraditional) && normalize(`${hanzi} ${pinyin} ${meaning} ${note}`).includes(q))
      .map(([hanzi, pinyin, meaning, note]) => ({ kind, hanzi, pinyin, meaning, note })),
  );
  return [...wordHits, ...refHits].slice(0, limit);
}
