import { Link } from '@tanstack/react-router';
import { MeaningText } from './meaning-text';
import { libraryEntries } from '@/lib/character-library';
import type { MeaningPart } from '@/lib/meaning-pointers';

// Meaning line of a detail heading whose recorded meaning mixes in a sense owned by a related
// character (干 "oppose, offend; invade; dried", where "dried" is 乾's sense). Purpose: keep the
// recorded text intact while showing which related card that sense belongs to.
// Input: `parts`, the meaning's "; " parts from meaningPointers (already validated against the
// recorded text and the related-characters set). No state. A pointed part keeps its words and
// gains a "→ 乾" link to that character's own Characters card; the link is dropped (plain text
// only) when no exact Characters record exists, so it never opens a look-alike.
export function PointedMeaning({ parts }: { parts: MeaningPart[] }) {
  return <h2 className="pointed-meaning">
    {parts.map((part, index) => {
      const target = part.related ? libraryEntries('Characters').find(entry => entry.hanzi === part.related) : undefined;
      return <span key={index}>
        {index > 0 && '; '}
        <MeaningText text={part.text}/>
        {target && <> <Link to="/characters" search={{ tab: 'Characters', id: target.id }} resetScroll={false} className={`meaning-pointer${target.script === 'Traditional' ? ' traditional-character' : ''}`} title={`This sense belongs to ${target.hanzi} — open its card`} aria-label={`"${part.text}" belongs to ${target.hanzi}, open its card`}>→ <span lang="zh-CN">{target.hanzi}</span></Link></>}
      </span>;
    })}
  </h2>;
}
