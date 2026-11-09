import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { SourceInfo } from '@/components/tutor/source-info';
import { associationNote, characterVariants, relatedGroup, scriptGroup, type AssociationNote } from '@/lib/character-variants';
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
        const content = <><strong lang="zh-CN">{entry.hanzi}</strong><span>{entry.strokes !== undefined ? `${entry.strokes} strokes` : 'Strokes not recorded'}</span><small>{formLabel(entry.hanzi, entry.script)}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `Rank #${rank.toLocaleString('en-US')}`}</>}</small></>;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          {destination === 'practice'
            ? <Link to="/strokes" search={{ character: entry.hanzi, ...(mode ? { mode } : {}) }} resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`Practice ${scriptName} form ${entry.hanzi}`}>{content}</Link>
            : <Link to="/characters" search={prev => { const { variant: _variant, ...rest } = prev as CharactersSearch; return { ...rest, id: entry.id }; }} replace resetScroll={false} aria-current={selected ? 'true' : undefined} aria-label={`View ${scriptName} form ${entry.hanzi}`}>{content}</Link>}
        </Button>;
      })}
    </div>
    {!family && <AssociationNotes forms={forms.map(entry => entry.hanzi)}/>}
  </div>;
}

/** Short learner label for a v1.4.0 association classification (unknown values shown as recorded). */
export function classificationLabel(classification: string) {
  switch (classification) {
    case 'context_dependent_not_error': return 'Context-dependent';
    case 'orthographic_variant': return 'Orthographic variant';
    case 'regional_variant': return 'Regional variant';
    case 'traditional': return '2013 traditional column';
    case 'attested_alternate_form': return 'Alternate form';
    default: return classification.replace(/_/g, ' ');
  }
}

/** Recorded notes for every simplified → traditional pair among `forms` (first form is the
 *  simplified key). Text is shown verbatim from v1.4.0: explanation and example inline, the
 *  usage caveat, evidence scope and source link behind the ⓘ. Pairs without a note show nothing. */
function AssociationNotes({ forms }: { forms: string[] }) {
  const [simplified, ...rest] = forms;
  if (!simplified) return null;
  const notes = rest.flatMap(traditional => { const note = associationNote(simplified, traditional); return note ? [{ traditional, note }] : []; });
  if (!notes.length) return null;
  return <ul className="association-notes">{notes.map(({ traditional, note }) => <AssociationNoteRow key={traditional} simplified={simplified} traditional={traditional} note={note}/>)}</ul>;
}

function AssociationNoteRow({ simplified, traditional, note }: { simplified: string; traditional: string; note: AssociationNote }) {
  return <li className="association-note">
    <p className="association-note-head"><span lang="zh-CN">{simplified}</span> ↔ <span lang="zh-CN" className="traditional-character">{traditional}</span><span className="association-note-kind">{classificationLabel(note.classification)}</span>
      <SourceInfo inline className="detail-footnote">{note.usageCaveat && <>{note.usageCaveat}<br/></>}{note.unchangedSense && <>{simplified} stays unchanged for: {note.unchangedSense}<br/></>}Possible correspondence, not an automatic replacement{note.evidenceScope ? ` · ${note.evidenceScope}` : ''}{note.sourceUrl && <><br/><a href={note.sourceUrl} target="_blank" rel="noreferrer">Source</a></>}<br/>Character associations v{characterVariants.version || '1.4.0'}</SourceInfo>
    </p>
    <p className="association-note-text">{note.explanation}</p>
    {note.example && <p className="association-note-example">Example: {note.example}</p>}
  </li>;
}

// Related written forms: a context-dependent association set from v1.4.0 (了 ↔ 瞭, 发 ↔ 發/髮).
// These forms never share a library card, so each tile opens that form's own card (pushed, so
// Back returns). Inputs: the shown glyph and its library kind; Traditional forms hide when
// Include traditional is off. The simplified key reads "Simplified · also traditional" only
// when a note documents it staying unchanged in traditional writing (alsoTraditional).
export function RelatedWrittenForms({ glyph, kind = 'Characters' }: { glyph: string; kind?: ScriptFormKind }) {
  const { preferences } = useWorkspace();
  const group = relatedGroup(glyph);
  if (group.length < 2) return null;
  const records = new Map(libraryEntries(kind).map(entry => [entry.hanzi, entry]));
  const forms = group.flatMap(form => { const entry = records.get(form); return entry && (preferences.includeTraditional || entry.script !== 'Traditional' || form === glyph) ? [entry] : []; });
  if (forms.length < 2) return null;
  const head = group[0]!;
  const label = (entry: (typeof forms)[number]) => entry.hanzi === head
    ? entry.script === 'Simplified' && characterVariants.alsoTraditional.has(head) ? 'Simplified · also traditional' : entry.script === 'Traditional' ? 'Traditional' : 'Simplified'
    : entry.script === 'Traditional' ? 'Traditional' : entry.script === 'Simplified' ? 'Simplified' : 'Shared form';
  return <div className="radical-family-section script-forms related-forms">
    <h3 className="eyebrow flex-wrap"><span>RELATED WRITTEN FORMS</span><SourceInfo inline className="detail-footnote">These forms correspond only for some meanings, so each keeps its own card, reading, meaning, strokes and rank.<br/>Simplified ↔ traditional associations · {characterVariants.source}</SourceInfo></h3>
    <div className="radical-form-list" role="group" aria-label={`Related written forms of ${glyph}`}>
      {forms.map(entry => {
        const selected = entry.hanzi === glyph;
        const rank = usageOrder.loaded ? usageRank(entry, kind, preferences.includeTraditional) : null;
        const note = entry.hanzi === head ? undefined : associationNote(head, entry.hanzi);
        const content = <><strong lang="zh-CN">{entry.hanzi}</strong><span>{entry.pinyin || 'Pinyin not recorded'}</span><small>{label(entry)}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `Rank #${rank.toLocaleString('en-US')}`}</>}{note && <><br/>{classificationLabel(note.classification)}</>}</small></>;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice related-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          {selected
            ? <span aria-current="true">{content}</span>
            : <Link to="/characters" search={prev => { const { variant: _variant, ...rest } = prev as CharactersSearch; return { ...rest, tab: kind, id: entry.id }; }} resetScroll={false} aria-label={`Open the card for ${entry.hanzi}`}>{content}</Link>}
        </Button>;
      })}
    </div>
    <AssociationNotes forms={[head, ...forms.map(entry => entry.hanzi).filter(form => form !== head)]}/>
  </div>;
}
