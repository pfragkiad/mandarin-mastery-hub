import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { SourceInfo } from '@/components/tutor/source-info';
import { characterVariants, scriptGroup } from '@/lib/character-variants';
import { componentCardGlyphs, componentFamilyGroup } from '@/lib/component-families';
import { catalog } from '@/lib/catalog-store';
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
// `kind` picks which library's records form the group (Characters or Components), so a
// component's tiles only offer forms that exist as Components records, ranked by the
// component-exposure scope rather than character frequency.
export type ScriptFormKind = 'Characters' | 'Components';
/** Library records of `kind` for each form in the glyph's script group (forms without a record drop out). */
export function scriptFormRecords(glyph: string, kind: ScriptFormKind = 'Characters') {
  const records = new Map(libraryEntries(kind).map(entry => [entry.hanzi, entry]));
  return scriptGroup(glyph).flatMap(form => { const entry = records.get(form); return entry ? [entry] : []; });
}

/** Records shown on one library card: Components use radical-family card groups
 * (component-families.ts, plus script partners when Traditional is included);
 * Characters use script groups only when Traditional is included. */
export function cardFormRecords(glyph: string, kind: ScriptFormKind, includeTraditional: boolean) {
  if (kind === 'Characters') return includeTraditional ? scriptFormRecords(glyph, kind) : [];
  const records = new Map(libraryEntries('Components').map(entry => [entry.hanzi, entry]));
  return componentCardGlyphs(glyph, includeTraditional).flatMap(form => { const entry = records.get(form); return entry ? [entry] : []; });
}

// `grouping`: 'script' (default) offers only Simplified/Traditional partners; 'card' offers
// everything the Components card shows, including the radical-family forms (刀 刂 ⺈), whose
// tiles read Main form / Variant. Each tile still opens that exact form's own record.
export function ScriptForms({ glyph, kind = 'Characters', destination = 'reference', mode, hideLabel = false, grouping = 'script' }: { glyph: string; kind?: ScriptFormKind; destination?: 'reference' | 'practice'; mode?: PracticeMode; hideLabel?: boolean; grouping?: 'script' | 'card' }) {
  const { preferences } = useWorkspace();
  const forms = grouping === 'card' ? cardFormRecords(glyph, kind, preferences.includeTraditional) : scriptFormRecords(glyph, kind);
  const family = grouping === 'card' && kind === 'Components' ? componentFamilyGroup(glyph) : undefined;
  if (forms.length < 2) return null;
  const formLabel = (hanzi: string, script: string | undefined) => script === 'Traditional' ? 'Traditional' : family ? (hanzi === family.head ? 'Main form' : 'Variant') : 'Simplified';
  return <div className="radical-family-section script-forms">
    {!hideLabel && <h3 className="eyebrow flex-wrap"><span>{family ? 'COMPONENT FORMS' : 'SCRIPT FORMS'}</span><SourceInfo inline className="detail-footnote">{family ? <>Forms of Kangxi radical #{family.familyId} that share its reading · {catalog.radicalStrokes.source}{forms.some(entry => entry.script === 'Traditional') ? <><br/>Simplified ↔ traditional links · {characterVariants.source}</> : null}</> : <>Simplified ↔ traditional links · {characterVariants.source}</>}</SourceInfo></h3>}
    <div className="radical-form-list" role="group" aria-label={`Script forms of ${glyph}`}>
      {forms.map(entry => {
        const selected = entry.hanzi === glyph;
        const rank = usageOrder.loaded ? usageRank(entry, kind, preferences.includeTraditional) : null;
        const scriptName = formLabel(entry.hanzi, entry.script).toLowerCase();
        const content = <><strong lang="zh-CN">{entry.hanzi}</strong><span>{entry.strokes ?? '?'} strokes</span><small>{formLabel(entry.hanzi, entry.script)}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `Rank #${rank.toLocaleString('en-US')}`}</>}</small></>;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          {destination === 'practice'
            ? <Link to="/strokes" search={{ character: entry.hanzi, ...(mode ? { mode } : {}) }} resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`Practice ${scriptName} form ${entry.hanzi}`}>{content}</Link>
            : <Link to="/characters" search={prev => { const { variant: _variant, ...rest } = prev as CharactersSearch; return { ...rest, id: entry.id }; }} replace resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`View ${scriptName} form ${entry.hanzi}`}>{content}</Link>}
        </Button>;
      })}
    </div>
  </div>;
}
