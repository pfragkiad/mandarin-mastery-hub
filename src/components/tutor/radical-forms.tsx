import { SourceInfo } from '@/components/tutor/source-info';
import { practiceHint, switchFormHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { historicalRadicalHeading, orderedRadicalForms, radicalFamily } from '@/lib/radical-strokes';
import { glyphScript } from '@/lib/character-library';
import type { PracticeMode } from '@/lib/practice-mode';

// Variant picker for a Kangxi radical family. The family meaning is not shown
// here: every page that renders this section (reference detail card, Practice)
// already shows the same reading + meaning in its own heading above. Keep the
// family heading to its Kangxi ID and the information note generic across families.
// Practice passes its active mode so changing the exact form does not reset to Watch.
export function RadicalForms({ familyId, selectedKey, destination = 'reference', mode, hideLabel = false }: { familyId: number; selectedKey?: string | undefined; destination?: 'reference' | 'practice'; mode?: PracticeMode; hideLabel?: boolean }) {
  const family = radicalFamily(familyId);
  if (!family) return null;
  return <div className="radical-family-section">
    {/* Practice renders the tiles inside its reading panel, where the Kangxi ID
        already appears as a pill — hideLabel drops the redundant heading there. */}
    {!hideLabel && <h3 className="eyebrow flex-wrap"><span>RADICAL FAMILY · KANGXI #{family.id}</span><SourceInfo inline className="detail-footnote">Family meaning · Unicode Unihan 17.0.0<br/>Forms · cjklib C-locale · cnchar-order 3.2.6<br/>Family readings are shared with variant forms that lack their own recorded name.<br/><a href="/data/radical-families-source.json" target="_blank" rel="noreferrer">Source records and license notices</a></SourceInfo></h3>}
    <div className="radical-form-list" role="group" aria-label={`Forms of Kangxi radical ${family.id}`}>
      {/* Purple marks exact recorded Traditional forms: historical Kangxi headings
          and any variant whose own script metadata says Traditional (e.g. 訁). */}
      {orderedRadicalForms(family).map(form => <Button key={form.key} asChild variant="ghost" className={`radical-form-choice is-radical ${historicalRadicalHeading(form.character, family.id) || glyphScript(form.character) === 'Traditional' ? 'is-traditional' : ''} ${selectedKey === form.key ? 'is-selected' : ''}`}>
        <Link to={destination === 'practice' ? '/strokes' : '/characters'} search={destination === 'practice' ? { character: form.character, family: family.id, variant: form.key, ...(mode ? { mode } : {}) } : { tab: 'Radicals', id: `Radicals:${family.kangxiHeading}`, variant: form.key }} resetScroll={false} title={destination === 'practice' ? practiceHint(form.character, selectedKey === form.key) : switchFormHint(form.character, selectedKey === form.key)} aria-label={`${destination === 'practice' ? 'Practice' : 'View'} radical form ${form.character}, ${form.strokeCount} ${form.strokeCount === 1 ? 'stroke' : 'strokes'}${family.forms.filter(other => other.character === form.character).length > 1 ? `, ${form.aliases.join(' ')}` : ''}`} aria-current={selectedKey === form.key ? 'true' : undefined}>
          <strong lang="zh-CN">{form.character}</strong><span>{form.strokeCount} {form.strokeCount === 1 ? 'stroke' : 'strokes'}</span><small>{form.formKind === 'kangxi-heading' ? 'Kangxi heading' : form.character === family.canonical ? 'Mainland form' : 'Variant'}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small>
        </Link>
      </Button>)}
    </div>
  </div>;
}