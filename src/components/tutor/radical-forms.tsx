import { SourceInfo } from '@/components/tutor/source-info';
import { practiceHint, switchFormHint } from '@/lib/tile-hints';
import { formSwitchColumns } from '@/lib/form-switch-columns';
import type { CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { historicalRadicalHeading, orderedRadicalForms, radicalFamily } from '@/lib/radical-strokes';
import { glyphScript } from '@/lib/character-library';
import { radicalFormLabel } from '@/lib/radical-form-label';
import { FormSwitchGlyph } from './script-forms';
import { FormSwitchThumb } from './form-switch-thumb';
import type { PracticeMode } from '@/lib/practice-mode';

// Variant picker for a Kangxi radical family. The family meaning is not shown
// here: every page that renders this section (reference detail card, Practice)
// already shows the same reading + meaning in its own heading above. Keep the
// family heading to its Kangxi ID and the information note generic across families.
// Practice passes its active mode so changing the exact form does not reset to Watch.
// `layout="switch"` / `hideGlyph` match ScriptForms: Practice's header form switch, with the
// hanzi blanked in Recall.
export function RadicalForms({ familyId, selectedKey, destination = 'reference', mode, hideLabel = false, layout = 'tiles', hideGlyph = false }: { familyId: number; selectedKey?: string | undefined; destination?: 'reference' | 'practice'; mode?: PracticeMode; hideLabel?: boolean; layout?: 'tiles' | 'switch'; hideGlyph?: boolean }) {
  const family = radicalFamily(familyId);
  if (!family) return null;
  const forms = orderedRadicalForms(family);
  return <div className={`radical-family-section${layout === 'switch' ? ' form-switch' : ''}`}>
    {/* Practice renders the tiles inside its reading panel, where the Kangxi ID
        already appears as a pill — hideLabel drops the redundant heading there. */}
    {!hideLabel && <h3 className="eyebrow flex-wrap"><span>RADICAL FAMILY · KANGXI #{family.id}</span><SourceInfo inline className="detail-footnote">Family meaning · Unicode Unihan 17.0.0<br/>Forms · cjklib C-locale · cnchar-order 3.2.6<br/>Family readings are shared with variant forms that lack their own recorded name.<br/><a href="/data/radical-families-source.json" target="_blank" rel="noreferrer">Source records and license notices</a></SourceInfo></h3>}
    {/* Switch trays set --form-cols so wrapped rows stay balanced and equal-width
        (formSwitchColumns: five forms wrap 3+2, never 4+1). */}
    <div className="radical-form-list" role="group" aria-label={`Forms of Kangxi radical ${family.id}`} style={layout === 'switch' ? { '--form-cols': formSwitchColumns(forms.length) } as CSSProperties : undefined}>
      {/* Practice's tray: one frame that slides to the chosen form instead of a border appearing. */}
      {layout === 'switch' && <FormSwitchThumb/>}
      {/* Purple marks exact recorded Traditional forms: historical Kangxi headings
          and any variant whose own script metadata says Traditional (e.g. 訁). */}
      {forms.map(form => <Button key={form.key} asChild variant="ghost" className={`radical-form-choice is-radical ${historicalRadicalHeading(form.character, family.id) || glyphScript(form.character) === 'Traditional' ? 'is-traditional' : ''} ${selectedKey === form.key ? 'is-selected' : ''}`}>
        <Link to={destination === 'practice' ? '/strokes' : '/characters'} search={destination === 'practice' ? { character: form.character, family: family.id, variant: form.key, ...(mode ? { mode } : {}) } : { tab: 'Radicals', id: `Radicals:${family.kangxiHeading}`, variant: form.key }} resetScroll={false} title={destination === 'practice' ? practiceHint(form.character, selectedKey === form.key) : switchFormHint(form.character, selectedKey === form.key)} aria-label={`${destination === 'practice' ? 'Practice' : 'View'} radical form ${form.character}, ${form.strokeCount} ${form.strokeCount === 1 ? 'stroke' : 'strokes'}${family.forms.filter(other => other.character === form.character).length > 1 ? `, ${form.aliases.join(' ')}` : ''}`} aria-current={selectedKey === form.key ? 'true' : undefined}>
          {layout === 'switch'
            ? <><FormSwitchGlyph glyph={form.character} hidden={hideGlyph}/><span className="form-switch-text"><b>{radicalFormLabel(form, family, glyphScript(form.character))}</b><small>{form.strokeCount} {form.strokeCount === 1 ? 'stroke' : 'strokes'}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small></span></>
            : <><strong lang="zh-CN">{form.character}</strong><span>{form.strokeCount} {form.strokeCount === 1 ? 'stroke' : 'strokes'}</span><small>{radicalFormLabel(form, family, glyphScript(form.character))}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small></>}
        </Link>
      </Button>)}
    </div>
  </div>;
}