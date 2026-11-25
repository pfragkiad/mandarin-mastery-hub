import type { CharacterTatoebaExample } from '@/lib/character-tatoeba-examples';
import { SourceInfo } from './source-info';

/** Attribution for this exact displayed sentence. Shows only the public Tatoeba
 * resource (sentence links, contributors, licence, and the original wording when
 * our displayed text was edited); internal review process (rounds, reviewers,
 * ratings, dispositions) is never exposed. The one exception is the review note
 * on warning cases (Minor_Review/Needs_Fix): those notes flag learner-meaningful
 * issues (e.g. a lost negative sense, an unnatural measure word), so they stay,
 * shown as a plain "Note" without review jargon, and the marker keeps its
 * warning triangle. Pass-case notes are process chatter and stay hidden.
 */
export function TatoebaSentenceSource({ example }: { example: CharacterTatoebaExample }) {
  const { source, review, editorial } = example;
  const warning = example.display.marker === 'warning_triangle';
  const changed = editorial.chineseChanged || editorial.englishChanged;
  return <span className="sentence-source-marker">
    <SourceInfo inline className="detail-footnote" variant={warning ? 'warning' : 'info'} label={warning ? 'Sentence source and usage note' : 'Sentence source'}>
      <a href={source.chinese.url} target="_blank" rel="noopener noreferrer">Tatoeba · Chinese #{source.chinese.id}</a> · {source.chinese.contributor ?? 'Unassigned contributor'}<br/>
      <a href={source.english.url} target="_blank" rel="noopener noreferrer">English #{source.english.id}</a> · {source.english.contributor ?? 'Unassigned contributor'}<br/>
      <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">CC BY 2.0 FR</a>{changed && ' · Edited from the attributed originals'}<br/>
      {editorial.excerpt && <>Excerpt from the linked longer sentence; terminal punctuation may be adjusted.<br/></>}
      {editorial.chineseChanged && <>Original Chinese: <span lang="zh-CN">{source.chinese.text}</span><br/></>}
      {editorial.englishChanged && <>Original English: {source.english.text}<br/></>}
      {warning && review.notes && <>Note: {review.notes}</>}
    </SourceInfo>
  </span>;
}
