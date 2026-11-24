import { vocabularyKind } from '@/lib/mandarin';
import type { SearchHit } from '@/lib/site-search';
import { InlineReadingMeanings } from './reading-meanings';

/** Shared result contents for Start and global search. Script is copied from
 * the exact result record; the type badge stays separate from Traditional. */
export function SearchHitContent({ hit }: { hit: SearchHit }) {
  const record = hit.kind === 'Word' ? hit.word : hit;
  const traditional = record.script === 'Traditional';
  const hskLevel = hit.kind === 'Word' ? hit.word.entry?.hskLevel ?? null : null;
  const pos = hit.kind === 'Word' && hit.word.type && hit.word.type !== 'Unspecified' ? hit.word.type : null;
  return <>
    <strong lang="zh-CN" className={traditional ? 'traditional-character' : undefined}>{record.hanzi}</strong>
    <span className="pinyin">{record.pinyin}</span>
    {/* Words show their recorded part of speech before the meaning, and their recorded HSK
        level as a pill, so same-headword entries (点 HSK 1 noun vs HSK 2 verb) differ at a glance. */}
    <span className="hit-meaning" title={record.meaning}>{pos && <span className="hit-pos">({pos}) </span>}{hit.kind !== 'Word' && hit.readingSplit ? <InlineReadingMeanings items={hit.readingSplit}/> : record.meaning}</span>
    <span className="search-hit-badges">
      {hskLevel != null && <span className="word-hsk-id hsk-level-pill" title="HSK 3.0 level in the syllabus">HSK {hskLevel}</span>}
      {traditional && <span className="word-hsk-id traditional-pill">Traditional</span>}
      <span className="hit-kind">{hit.kind === 'Word' ? vocabularyKind(hit.word) : hit.kind}</span>
    </span>
  </>;
}