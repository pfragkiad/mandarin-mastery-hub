import type { CharacterTatoebaExample } from '@/lib/character-tatoeba-examples';
import { SourceInfo } from './source-info';

/** Collapsed attribution and scoped review evidence for this exact displayed
 * sentence. Warning triangles expose unresolved findings without hiding sources.
 */
export function TatoebaSentenceSource({ example }: { example: CharacterTatoebaExample }) {
  const { source, review, editorial } = example;
  const changed = editorial.chineseChanged || editorial.englishChanged;
  return <span className="sentence-source-marker">
    <SourceInfo inline className="detail-footnote" variant={example.display.marker === 'warning_triangle' ? 'warning' : 'info'} label={example.display.label}>
      <a href={source.chinese.url} target="_blank" rel="noopener noreferrer">Tatoeba · Chinese #{source.chinese.id}</a> · {source.chinese.contributor ?? 'Unassigned contributor'}<br/>
      <a href={source.english.url} target="_blank" rel="noopener noreferrer">English #{source.english.id}</a> · {source.english.contributor ?? 'Unassigned contributor'}<br/>
      <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">CC BY 2.0 FR</a>{changed && ' · Edited from the attributed originals'}<br/>
      Review round {review.latestRound} · {review.status.replaceAll('_', ' ')} · Chinese quality and English fidelity<br/>
      {review.notes && <>{review.notes}<br/></>}
      {review.latestRound === 3 && !review.round3ReturnedForThisId && <>Round 3 reviews the same sentence pair under another character. This character-specific row was not returned.<br/></>}
      {source.okTag ? 'Chinese source has an OK tag' : 'Chinese source has positive ratings'} · {source.positiveRatings} positive rating{source.positiveRatings === 1 ? '' : 's'}<br/>
      {editorial.chineseChanged && <>Original Chinese: <span lang="zh-CN">{source.chinese.text}</span><br/></>}
      {editorial.englishChanged && <>Original English: {source.english.text}<br/></>}
      {example.pinyin ? <>Pinyin: recorded Tatoeba transcription{editorial.pinyin?.reviewer ? ` · ${editorial.pinyin.reviewer}` : ''}; not verified in this review.<br/></> : editorial.pinyinWithheldAfterChineseEdit ? <>Pinyin withheld because the Chinese was edited.<br/></> : <>No source pinyin available.<br/></>}
      Target character reading/sense and audio were not reviewed. No Tatoeba recording imported.
    </SourceInfo>
  </span>;
}
