import { vocabularyKind } from '@/lib/mandarin';
import type { SearchHit } from '@/lib/site-search';

/** Shared result contents for Start and global search. Script is copied from
 * the exact result record; the type badge stays separate from Traditional. */
export function SearchHitContent({ hit }: { hit: SearchHit }) {
  const record = hit.kind === 'Word' ? hit.word : hit;
  const traditional = record.script === 'Traditional';
  return <>
    <strong lang="zh-CN" className={traditional ? 'traditional-character' : undefined}>{record.hanzi}</strong>
    <span className="pinyin">{record.pinyin}</span>
    <span className="hit-meaning" title={record.meaning}>{record.meaning}</span>
    <span className="search-hit-badges">
      {traditional && <span className="word-hsk-id traditional-pill">Traditional</span>}
      <span className="hit-kind">{hit.kind === 'Word' ? vocabularyKind(hit.word) : hit.kind}</span>
    </span>
  </>;
}