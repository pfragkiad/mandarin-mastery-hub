import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { SourceInfo } from '@/components/tutor/source-info';
import { characterVariants, scriptGroup } from '@/lib/character-variants';
import { libraryEntries } from '@/lib/character-library';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import type { PracticeMode } from '@/lib/practice-mode';
import { useWorkspace } from './workspace';
import type { CharactersSearch } from './characters-page';

// Form picker for a simplified/traditional script group.
// Inputs: the glyph whose record is shown; `destination` picks where each tile leads —
// 'reference' (default) swaps the Characters detail card to that form's own record (URL id,
// replace), 'practice' opens Practice for that exact form (pushed, keeping the active mode),
// mirroring RadicalForms. Either way the selected form shows its own reading, meaning,
// strokes and rank — a traditional form never borrows the simplified rank or vice versa.
// `hideLabel` drops the heading where the surrounding panel already labels the record
// (Practice shows a Traditional pill). Reuses the radical-family tile styles.
/** Library records for each form in the glyph's script group (forms without a record drop out). */
export function scriptFormRecords(glyph: string) {
  const records = new Map(libraryEntries('Characters').map(entry => [entry.hanzi, entry]));
  return scriptGroup(glyph).flatMap(form => { const entry = records.get(form); return entry ? [entry] : []; });
}

export function ScriptForms({ glyph, destination = 'reference', mode, hideLabel = false }: { glyph: string; destination?: 'reference' | 'practice'; mode?: PracticeMode; hideLabel?: boolean }) {
  const { preferences } = useWorkspace();
  const forms = scriptFormRecords(glyph);
  if (forms.length < 2) return null;
  return <div className="radical-family-section script-forms">
    {!hideLabel && <h3 className="eyebrow flex-wrap"><span>SCRIPT FORMS</span><SourceInfo inline className="detail-footnote">Simplified ↔ traditional links · {characterVariants.source}</SourceInfo></h3>}
    <div className="radical-form-list" role="group" aria-label={`Script forms of ${glyph}`}>
      {forms.map(entry => {
        const selected = entry.hanzi === glyph;
        const rank = usageOrder.loaded ? usageRank(entry, 'Characters', preferences.includeTraditional) : null;
        const scriptName = entry.script === 'Traditional' ? 'traditional' : 'simplified';
        const content = <><strong lang="zh-CN">{entry.hanzi}</strong><span>{entry.strokes ?? '?'} strokes</span><small>{entry.script === 'Traditional' ? 'Traditional' : 'Simplified'}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `Rank #${rank.toLocaleString('en-US')}`}</>}</small></>;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          {destination === 'practice'
            ? <Link to="/strokes" search={{ character: entry.hanzi, ...(mode ? { mode } : {}) }} resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`Practice ${scriptName} form ${entry.hanzi}`}>{content}</Link>
            : <Link to="/characters" search={prev => { const { variant: _variant, ...rest } = prev as CharactersSearch; return { ...rest, id: entry.id }; }} replace resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`View ${scriptName} form ${entry.hanzi}`}>{content}</Link>}
        </Button>;
      })}
    </div>
  </div>;
}
