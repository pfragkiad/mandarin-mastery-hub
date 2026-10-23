import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { radicalFamily } from '@/lib/radical-strokes';

export function RadicalForms({ familyId, selectedKey }: { familyId: number; selectedKey?: string | undefined }) {
  const family = radicalFamily(familyId);
  if (!family) return null;
  return <div className="radical-family-section">
    <h3 className="eyebrow">RADICAL FAMILY · KANGXI #{family.id}</h3>
    <div className="radical-form-list" role="group" aria-label={`Forms of Kangxi radical ${family.id}`}>
      {family.forms.map(form => <Button key={form.key} asChild variant="ghost" className="radical-form-choice">
        <Link to="/characters" search={{ tab: 'Radicals', id: `Radicals:${family.kangxiHeading}`, variant: form.key }} resetScroll={false} aria-label={`View radical form ${form.character}, ${form.strokeCount} strokes${family.forms.filter(other => other.character === form.character).length > 1 ? `, ${form.aliases.join(' ')}` : ''}`} aria-current={selectedKey === form.key ? 'true' : undefined}>
          <strong lang="zh-CN">{form.character}</strong><span>{form.strokeCount} strokes</span><small>{form.formKind === 'kangxi-heading' ? 'Kangxi heading' : form.character === family.canonical ? 'Mainland form' : 'Variant'}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small>
        </Link>
      </Button>)}
    </div>
    <p className="detail-footnote">Forms · cjklib C-locale · cnchar-order 3.2.6<br/>Family reading · {family.familyPinyin} · not a pronunciation assigned to each variant<br/><a href="/data/radical-families-source.json" target="_blank" rel="noreferrer">Source records and license notices</a></p>
  </div>;
}