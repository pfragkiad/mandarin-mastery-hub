import { SourceInfo } from '@/components/tutor/source-info';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { historicalRadicalHeading, orderedRadicalForms, radicalFamily } from '@/lib/radical-strokes';
import type { PracticeMode } from '@/lib/practice-mode';

// Variant picker for a Kangxi radical family. The family meaning is not shown
// here: every page that renders this section (reference detail card, Practice)
// already shows the same reading + meaning in its own heading above. Keep the
// family heading to its Kangxi ID and the information note generic across families.
// Practice passes its active mode so changing the exact form does not reset to Watch.
export function RadicalForms({ familyId, selectedKey, destination = 'reference', mode, compact = false }: { familyId: number; selectedKey?: string | undefined; destination?: 'reference' | 'practice'; mode?: PracticeMode; compact?: boolean }) {
  const family = radicalFamily(familyId);
  const navigate = useNavigate();
  if (!family) return null;
  // Compact form: a single dropdown for small screens, rendered above the
  // Practice writing card. It keeps the same Mainland-first order and
  // family-qualified URLs as the tile list, and preserves the writing mode.
  if (compact) {
    const forms = orderedRadicalForms(family);
    const label = (form: (typeof forms)[number]) => `${form.character} · ${form.strokeCount} strokes — ${form.formKind === 'kangxi-heading' ? 'Kangxi heading' : form.character === family.canonical ? 'Mainland form' : 'Variant'}`;
    return <div className="radical-family-section radical-family-compact">
      <label className="radical-family-compact-label" htmlFor={`radical-family-${family.id}`}>Radical family · Kangxi #{family.id}</label>
      <select id={`radical-family-${family.id}`} className="radical-family-select" value={selectedKey ?? ''} onChange={event => {
        const form = forms.find(match => match.key === event.target.value);
        if (!form) return;
        void navigate({ to: '/strokes', search: { character: form.character, family: family.id, variant: form.key, ...(mode ? { mode } : {}) } });
      }}>
        {forms.map(form => <option key={form.key} value={form.key}>{label(form)}</option>)}
      </select>
    </div>;
  }
  return <div className="radical-family-section">
    <h3 className="eyebrow flex-wrap"><span>RADICAL FAMILY · KANGXI #{family.id}</span><SourceInfo inline className="detail-footnote">Family meaning · Unicode Unihan 17.0.0<br/>Forms · cjklib C-locale · cnchar-order 3.2.6<br/>Family readings are shared with variant forms that lack their own recorded name.<br/><a href="/data/radical-families-source.json" target="_blank" rel="noreferrer">Source records and license notices</a></SourceInfo></h3>
    <div className="radical-form-list" role="group" aria-label={`Forms of Kangxi radical ${family.id}`}>
      {orderedRadicalForms(family).map(form => <Button key={form.key} asChild variant="ghost" className={`radical-form-choice ${historicalRadicalHeading(form.character, family.id) ? 'is-traditional' : ''} ${selectedKey === form.key ? 'is-selected' : ''}`}>
        <Link to={destination === 'practice' ? '/strokes' : '/characters'} search={destination === 'practice' ? { character: form.character, family: family.id, variant: form.key, ...(mode ? { mode } : {}) } : { tab: 'Radicals', id: `Radicals:${family.kangxiHeading}`, variant: form.key }} resetScroll={false} aria-label={`${destination === 'practice' ? 'Practice' : 'View'} radical form ${form.character}, ${form.strokeCount} strokes${family.forms.filter(other => other.character === form.character).length > 1 ? `, ${form.aliases.join(' ')}` : ''}`} aria-current={selectedKey === form.key ? 'true' : undefined}>
          <strong lang="zh-CN">{form.character}</strong><span>{form.strokeCount} strokes</span><small>{form.formKind === 'kangxi-heading' ? 'Kangxi heading' : form.character === family.canonical ? 'Mainland form' : 'Variant'}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small>
        </Link>
      </Button>)}
    </div>
  </div>;
}