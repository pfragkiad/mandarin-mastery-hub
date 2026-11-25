import type { Word } from '@/lib/mandarin';
import { vocabularyKind } from '@/lib/mandarin';
import { phraseStyle } from '@/lib/data-contract';
import { wordRadicalNumber } from '@/lib/card-ink';
import { RadicalPill } from './radical-pill';
import { usageRankTier } from './usage-label';

/**
 * One source for the identity pills a Words/Phrases record wears, shared by the grid card's top
 * row and the word detail card's top-right corner so the two never drift.
 *
 * Inputs: `word` — the record; `traditional` — whether this group should render the Traditional
 * pill itself (the detail title already renders it from `script`, so the detail passes false).
 *
 * Order matches the grid card: merged HSK level/ID pill (China red), gold Radical #N pill for
 * one-character words that are sourced Kangxi radicals, Traditional, then a phrase's recorded
 * sentence style. Nothing renders for a part that is not recorded.
 */
export function WordIdentityPills({ word, traditional = true }: { word: Word; traditional?: boolean }) {
  const hsk = wordHskPill(word);
  const radicalNumber = wordRadicalNumber(word.hanzi);
  const isPhrase = vocabularyKind(word) === 'phrase';
  const idiomRank = word.idiomMeta?.rank;
  return <>
    {hsk && <span className="word-hsk-id hsk-level-pill" title={hsk.title}>{hsk.label}</span>}
    {idiomRank != null && <span className={`component-reuse-label usage-${usageRankTier(idiomRank)}`} title={`Frequency rank #${idiomRank.toLocaleString('en-US')} in the THUOCL chengyu corpus`}>Rank #{idiomRank.toLocaleString('en-US')}</span>}
    {radicalNumber !== undefined && <RadicalPill number={radicalNumber} title="Sourced Kangxi radical identity of this character"/>}
    {traditional && word.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
    {isPhrase && <PhraseStylePill word={word}/>}
  </>;
}

/** Recorded sentence style of a phrase (Conversational / Written) as a card or detail pill.
 *  Unclassified phrases render nothing, so no pill implies a style that was never recorded. */
export function PhraseStylePill({ word }: { word: Word }) {
  const style = phraseStyle(word.entry);
  if (style === 'Unclassified') return null;
  return <span className="word-hsk-id phrase-style-pill" title={`${style} style, as recorded with the sentence`}>{style}</span>;
}

/**
 * The HSK pill text and tooltip. Words and phrases merge the recorded level and official ID into
 * one "HSK L<level>/#<id>" pill (either part omitted when not supplied); a sentence phrase carries
 * the values recorded for its owning parent word. Other records (session additions) show only
 * an "ID <n>" pill when an official ID exists. Returns null when nothing is recorded.
 */
export function wordHskPill(word: Word): { label: string; title: string } | null {
  const kind = vocabularyKind(word);
  if (kind !== 'word' && kind !== 'phrase') return word.hskId != null ? { label: `ID ${word.hskId}`, title: 'Official ID in the HSK 3.0 syllabus' } : null;
  const level = word.entry?.hskLevel ?? null;
  if (level == null && word.hskId == null) return null;
  const label = `HSK${level != null ? ` L${level}` : ''}${word.hskId != null ? `${level != null ? '/' : ' '}#${word.hskId}` : ''}`;
  const from = word.entry?.sentenceSource?.hskFromWord ?? null;
  const title = from ? `HSK 3.0 level and ID recorded for ${from}, the word this sentence comes from` : 'HSK 3.0 level / official ID in the syllabus';
  return { label, title };
}
