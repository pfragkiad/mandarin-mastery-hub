import { SourceInfo } from '@/components/tutor/source-info';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { historicalRadicalHeading, orderedRadicalForms, radicalFamily } from '@/lib/radical-strokes';

// Variant picker for a Kangxi radical family. The family meaning is not shown
// here: every page that renders this section (reference detail card, Practice)
// already shows the same reading + meaning in its own heading above.
export function RadicalForms({ familyId, selectedKey, destination = 'reference' }: { familyId: number; selectedKey?: string | undefined; destination?: 'reference' | 'practice' }) {
  const family = radicalFamily(familyId);
  if (!family) return null;
  return <div className="radical-family-section">
    <h3 className="eyebrow">RADICAL FAMILY · KANGXI #{family.id}<SourceInfo inline className="detail-footnote">Family meaning · Unicode Unihan 17.0.0<br/>Forms · cjklib C-locale · cnchar-order 3.2.6<br/>Family reading · {family.familyPinyin} · shared with variant forms that lack their own recorded name<br/><a href="/data/radical-families-source.json" target="_blank" rel="noreferrer">Source records and license notices</a></SourceInfo></h3>
    <div className="radical-form-list" role="group" aria-label={`Forms of Kangxi radical ${family.id}`}>
      {orderedRadicalForms(family).map(form => <Button key={form.key} asChild variant="ghost" className={`radical-form-choice ${historicalRadicalHeading(form.character, family.id) ? 'is-traditional' : ''} ${selectedKey === form.key ? 'is-selected' : ''}`}>
        <Link to={destination === 'practice' ? '/strokes' : '/characters'} search={destination === 'practice' ? { character: form.character, family: family.id, variant: form.key } : { tab: 'Radicals', id: `Radicals:${family.kangxiHeading}`, variant: form.key }} resetScroll={false} aria-label={`${destination === 'practice' ? 'Practice' : 'View'} radical form ${form.character}, ${form.strokeCount} strokes${family.forms.filter(other => other.character === form.character).length > 1 ? `, ${form.aliases.join(' ')}` : ''}`} aria-current={selectedKey === form.key ? 'true' : undefined}>
          <strong lang="zh-CN">{form.character}</strong><span>{form.strokeCount} strokes</span><small>{form.formKind === 'kangxi-heading' ? 'Kangxi heading' : form.character === family.canonical ? 'Mainland form' : 'Variant'}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small>
        </Link>
      </Button>)}
    </div>
  </div>;
}