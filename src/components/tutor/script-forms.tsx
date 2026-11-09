import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { SourceInfo } from '@/components/tutor/source-info';
import { characterVariants, scriptGroup } from '@/lib/character-variants';
import { libraryEntries } from '@/lib/character-library';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import { useWorkspace } from './workspace';

// Form picker for a simplified/traditional script group on a Characters detail card.
// Input: the glyph whose record is shown. Each tile links to that form's own record
// (URL id), so the sheet then shows the selected form's own reading, meaning, strokes
// and rank — a traditional form never borrows the simplified rank or vice versa.
// Reuses the radical-family tile styles so both pickers look the same.
export function ScriptForms({ glyph }: { glyph: string }) {
  const { preferences } = useWorkspace();
  const records = new Map(libraryEntries('Characters').map(entry => [entry.hanzi, entry]));
  const forms = scriptGroup(glyph).flatMap(form => { const entry = records.get(form); return entry ? [entry] : []; });
  return <div className="radical-family-section script-forms">
    <h3 className="eyebrow flex-wrap"><span>SCRIPT FORMS</span><SourceInfo inline className="detail-footnote">Simplified ↔ traditional links · {characterVariants.source}</SourceInfo></h3>
    <div className="radical-form-list" role="group" aria-label={`Script forms of ${glyph}`}>
      {forms.map(entry => {
        const selected = entry.hanzi === glyph;
        const rank = usageOrder.loaded ? usageRank(entry, 'Characters', preferences.includeTraditional) : null;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          <Link to="/characters" search={prev => ({ ...prev, id: entry.id, variant: undefined })} replace resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`View ${entry.script === 'Traditional' ? 'traditional' : 'simplified'} form ${entry.hanzi}`}>
            <strong lang="zh-CN">{entry.hanzi}</strong><span>{entry.strokes ?? '?'} strokes</span><small>{entry.script === 'Traditional' ? 'Traditional' : 'Simplified'}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `#${rank.toLocaleString('en-US')}`}</>}</small>
          </Link>
        </Button>;
      })}
    </div>
  </div>;
}
