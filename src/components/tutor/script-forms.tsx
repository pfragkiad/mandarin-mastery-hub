import { useId, useState } from 'react';
import { openDetailsHint, practiceHint, switchFormHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { ScrollText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SourceInfo } from '@/components/tutor/source-info';
import { associationNote, characterVariants, CONTEXT_DEPENDENT, relatedGroup, scriptGroup, type AssociationNote } from '@/lib/character-variants';
import { componentCardGlyphs, componentFamilyGroup } from '@/lib/component-families';
import { FormSwitchThumb } from './form-switch-thumb';
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
// `layout="switch"` is Practice's header form switch: wide tiles with the glyph beside its
// form label and stroke count, no rank (Practice shows no ranks). `hideGlyph` (Recall)
// keeps each tile's label and strokes but blanks the hanzi so the answer never shows.
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
export function ScriptForms({ glyph, kind = 'Characters', destination = 'reference', mode, hideLabel = false, grouping = 'script', layout = 'tiles', hideGlyph = false }: { glyph: string; kind?: ScriptFormKind; destination?: 'reference' | 'practice'; mode?: PracticeMode; hideLabel?: boolean; grouping?: 'script' | 'card'; layout?: 'tiles' | 'switch'; hideGlyph?: boolean }) {
  const { preferences } = useWorkspace();
  const forms = grouping === 'card' ? cardFormRecords(glyph, kind, preferences.includeTraditional) : scriptFormRecords(glyph, kind);
  const family = grouping === 'card' && kind === 'Components' ? componentFamilyGroup(glyph) : undefined;
  if (forms.length < 2) return null;
  const formLabel = (hanzi: string, script: string | undefined) => script === 'Traditional' ? 'Traditional' : family ? (hanzi === family.head ? 'Main form' : 'Variant') : 'Simplified';
  return <div className={`radical-family-section script-forms${layout === 'switch' ? ' form-switch' : ''}`}>
    {!hideLabel && <h3 className="eyebrow flex-wrap"><span>{family ? 'COMPONENT FORMS' : 'SCRIPT FORMS'}</span><SourceInfo inline className="detail-footnote">{family ? <>Forms of Kangxi radical #{family.familyId} that share its reading · {catalog.radicalStrokes.source}{forms.some(entry => entry.script === 'Traditional') ? <><br/>Simplified ↔ traditional links · {VARIANT_LINK_SOURCE}</> : null}</> : <>Simplified ↔ traditional links · {VARIANT_LINK_SOURCE}{forms.slice(1).some(entry => !associationNote(forms[0]!.hanzi, entry.hanzi)) && <><br/>No usage qualification is recorded for this pair. That does not prove the forms are interchangeable in every context.</>}</>}</SourceInfo></h3>}
    <div className="radical-form-list" role="group" aria-label={`Script forms of ${glyph}`}>
      {/* Practice's tray: one frame that slides to the chosen form instead of a border appearing. */}
      {layout === 'switch' && <FormSwitchThumb/>}
      {forms.map(entry => {
        const selected = entry.hanzi === glyph;
        const rank = usageOrder.loaded ? usageRank(entry, kind, preferences.includeTraditional) : null;
        const scriptName = formLabel(entry.hanzi, entry.script).toLowerCase();
        const strokes = entry.strokes !== undefined ? `${entry.strokes} strokes` : 'Strokes not recorded';
        const content = layout === 'switch'
          ? <><FormSwitchGlyph glyph={entry.hanzi} hidden={hideGlyph}/><span className="form-switch-text"><b>{formLabel(entry.hanzi, entry.script)}</b><small>{strokes}</small></span></>
          : <><strong lang="zh-CN">{entry.hanzi}</strong><span>{strokes}</span><small>{formLabel(entry.hanzi, entry.script)}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `Rank #${rank.toLocaleString('en-US')}`}</>}</small></>;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          {destination === 'practice'
            ? <Link to="/strokes" search={{ character: entry.hanzi, ...(mode ? { mode } : {}) }} resetScroll={false} aria-current={selected ? 'true' : undefined} title={practiceHint(entry.hanzi, selected)} aria-label={`${scriptName} form · ${practiceHint(entry.hanzi, selected)}`}>{content}</Link>
            : <Link to="/characters" search={prev => { const { variant: _variant, ...rest } = prev as CharactersSearch; return { ...rest, id: entry.id }; }} replace resetScroll={false} aria-current={selected ? 'true' : undefined} title={switchFormHint(entry.hanzi, selected)} aria-label={`${scriptName} form · ${switchFormHint(entry.hanzi, selected)}`}>{content}</Link>}
        </Button>;
      })}
    </div>
    {!family && <AssociationNotes forms={forms.map(entry => entry.hanzi)}/>}
  </div>;
}

/** Hanzi of a form-switch tile. In Recall the glyph is replaced by an empty box of the
 *  same size (screen readers still hear the tile's label), so the tile row never shifts. */
export function FormSwitchGlyph({ glyph, hidden }: { glyph: string; hidden: boolean }) {
  return hidden ? <strong className="form-switch-blank" aria-hidden="true"/> : <strong lang="zh-CN">{glyph}</strong>;
}

/** Learner-facing provenance for simplified ↔ traditional links: the upstream dataset, never our data file name. */
const VARIANT_LINK_SOURCE = 'Unicode Unihan 17.0.0, with reviewed usage notes';

/** Short learner label for a recorded association classification (unknown values shown as recorded). */
export function classificationLabel(classification: string) {
  switch (classification) {
    case 'context_dependent_not_error': return 'Some meanings only';
    case 'orthographic_variant': return 'Orthographic variant';
    case 'regional_variant': return 'Regional variant';
    case 'traditional': return '2013 traditional column';
    case 'attested_alternate_form': return 'Alternate form';
    default: return classification.replace(/_/g, ' ');
  }
}

export type SpellingExample = { simplified: string; traditional: string; note?: string };
/** Splits a recorded example ("了解 → 了解 / 瞭解 (both accepted in Taiwan); 吃了 → 吃了") into
 *  rows for the spelling table. Text is never reworded: each row keeps its two sides and its
 *  parenthetical note verbatim. Returns null when any part is not "A → B (note)", so the
 *  caller falls back to the recorded line as written rather than guessing a split. */
export function parseSpellingExamples(example: string): SpellingExample[] | null {
  const rows: SpellingExample[] = [];
  // Split on ";" only outside parentheses: a row note may itself contain ";".
  const parts: string[] = [];
  let depth = 0, current = '';
  for (const ch of example) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { parts.push(current); current = ''; } else current += ch;
  }
  parts.push(current);
  for (const part of parts.map(item => item.trim()).filter(Boolean)) {
    const match = part.match(/^(.+?)\s*→\s*(.+?)(?:\s*\(([^()]*)\))?$/);
    if (!match) return null;
    rows.push({ simplified: match[1]!.trim(), traditional: match[2]!.trim(), ...(match[3] ? { note: match[3].trim() } : {}) });
  }
  return rows.length ? rows : null;
}

/** Recorded notes for every simplified → traditional pair among `forms` (first form is the
 *  simplified key). Learner view: the key caveat in one muted line; the explanation (verbatim) and
 *  the recorded example as a small spelling table sit behind Details; usage caveat, evidence scope
 *  and the source link stay behind the ⓘ. Pairs without a note show nothing. */
function AssociationNotes({ forms }: { forms: string[] }) {
  const [simplified, ...rest] = forms;
  if (!simplified) return null;
  const notes = rest.flatMap(traditional => { const note = associationNote(simplified, traditional); return note ? [{ traditional, note }] : []; });
  if (!notes.length) return null;
  return <ul className="association-notes">{notes.map(({ traditional, note }) => <AssociationNoteRow key={traditional} simplified={simplified} traditional={traditional} note={note}/>)}</ul>;
}

// One pair note. Collapsed (default): the pair, its classification pill, ⓘ and the one-line
// caveat with a Details toggle. Expanded: the recorded explanation verbatim and the spelling table.
// State: `open` is local to this note, so it resets when another card is shown.
function AssociationNoteRow({ simplified, traditional, note }: { simplified: string; traditional: string; note: AssociationNote }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rows = note.example ? parseSpellingExamples(note.example) : null;
  const contextual = note.classification === CONTEXT_DEPENDENT;
  return <li className="association-note">
    <div className="association-note-head"><span lang="zh-CN">{simplified}</span><span aria-hidden="true">↔</span><span lang="zh-CN" className="traditional-character">{traditional}</span><span className="association-note-kind">{classificationLabel(note.classification)}</span>
      <SourceInfo inline className="detail-footnote">{note.usageCaveat && <>{note.usageCaveat}<br/></>}{note.unchangedSense && <>{simplified} stays unchanged for: {note.unchangedSense}<br/></>}{note.evidenceScope && <>{note.evidenceScope}<br/></>}{note.sourceUrl && <a href={note.sourceUrl} target="_blank" rel="noreferrer">Source</a>}</SourceInfo>
    </div>
    <div className="association-note-summary">
      {contextual && <p className="association-note-caveat">Possible correspondence, not an automatic replacement.</p>}
      {/* Details opens a floating card (like the hints) so the detail sheet never grows. */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="association-note-toggle" aria-controls={panelId}><ScrollText aria-hidden="true"/>Details</PopoverTrigger>
        <PopoverContent id={panelId} align="start" className="source-info-popover association-note-popover">
    <div className="association-note-details">
      <p className="association-note-text">{note.explanation}</p>
      {note.example && <div className="spelling-examples">
        <span className="variant-etymology-caption">Spelling examples</span>
        {rows
          ? <table><thead><tr><th scope="col">Simplified</th><th scope="col">Traditional</th>{rows.some(row => row.note) && <th scope="col"><span className="sr-only">Note</span></th>}</tr></thead>
              {/* Both columns share one lang so the two spellings render in the same Hanzi font. */}
              <tbody>{rows.map((row, index) => <tr key={index}><td lang="zh-CN">{row.simplified}</td><td lang="zh-CN" className="traditional-character">{row.traditional}</td>{rows.some(item => item.note) && <td>{row.note ?? ''}</td>}</tr>)}</tbody></table>
          : <p>{note.example}</p>}
      </div>}
    </div>
        </PopoverContent>
      </Popover>
    </div>
  </li>;
}

// Related characters: a context-dependent association set (了 ↔ 瞭, 发 ↔ 發/髮).
// These forms never share a library card, so each tile opens that form's own card (pushed, so
// Back returns). Inputs: the shown glyph and its library kind; Traditional forms hide when
// Include traditional is off. The simplified key adds "Simplified & Traditional" only
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
    ? entry.script === 'Traditional' ? 'Traditional' : 'Simplified'
    : entry.script === 'Traditional' ? 'Traditional' : entry.script === 'Simplified' ? 'Simplified' : 'Shared form';
  return <div className="radical-family-section script-forms related-forms">
    <h3 className="eyebrow flex-wrap"><span>RELATED CHARACTERS</span><SourceInfo inline className="detail-footnote">These forms correspond only for some meanings, so each keeps its own card, reading, meaning, strokes and rank.<br/>Simplified ↔ traditional links · {VARIANT_LINK_SOURCE}</SourceInfo></h3>
    <div className="radical-form-list" role="group" aria-label={`Related characters of ${glyph}`}>
      {forms.map(entry => {
        const selected = entry.hanzi === glyph;
        const rank = usageOrder.loaded ? usageRank(entry, kind, preferences.includeTraditional) : null;
        // "Also traditional" only when a note documents the key unchanged in traditional writing.
        const alsoTraditional = entry.hanzi === head && entry.script === 'Simplified' && characterVariants.alsoTraditional.has(head);
        const content = <><strong lang="zh-CN">{entry.hanzi}</strong><span>{entry.pinyin || 'Pinyin not recorded'}</span><small>{label(entry)}{usageOrder.loaded && <> · {rank === null ? 'Unranked' : `Rank #${rank.toLocaleString('en-US')}`}</>}{alsoTraditional && <><br/>Simplified &amp; Traditional</>}</small></>;
        return <Button key={entry.id} asChild variant="ghost" className={`radical-form-choice related-form-choice ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''}`}>
          {selected
            ? <span aria-current="true" title={switchFormHint(entry.hanzi, true)}>{content}</span>
            : <Link to="/characters" search={prev => { const { variant: _variant, ...rest } = prev as CharactersSearch; return { ...rest, tab: kind, id: entry.id }; }} resetScroll={false} title={openDetailsHint(entry.hanzi, kind)} aria-label={openDetailsHint(entry.hanzi, kind)}>{content}</Link>}
        </Button>;
      })}
    </div>
    <AssociationNotes forms={[head, ...forms.map(entry => entry.hanzi).filter(form => form !== head)]}/>
  </div>;
}
