import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { radicalFamily } from '@/lib/radical-strokes';
import { libraryEntries } from '@/lib/character-library';

export function RadicalForms({ familyId, selectedKey, destination = 'reference' }: { familyId: number; selectedKey?: string | undefined; destination?: 'reference' | 'practice' }) {
  const family = radicalFamily(familyId);
  if (!family) return null;
  const heading = libraryEntries('Radicals').find(entry => entry.kangxiIndex === familyId);
  return <div className="radical-family-section">
    <h3 className="eyebrow">RADICAL FAMILY · KANGXI #{family.id}</h3>
    {heading?.meaning && <p className="radical-family-meaning"><span lang="zh-CN">{heading.hanzi}</span> · {heading.meaning}</p>}
    <div className="radical-form-list" role="group" aria-label={`Forms of Kangxi radical ${family.id}`}>
      {family.forms.map(form => <Button key={form.key} asChild variant="ghost" className={`radical-form-choice ${selectedKey === form.key ? 'is-selected' : ''}`}>
        <Link to={destination === 'practice' ? '/strokes' : '/characters'} search={destination === 'practice' ? { character: form.character, family: family.id, variant: form.key } : { tab: 'Radicals', id: `Radicals:${family.kangxiHeading}`, variant: form.key }} resetScroll={false} aria-label={`${destination === 'practice' ? 'Practice' : 'View'} radical form ${form.character}, ${form.strokeCount} strokes${family.forms.filter(other => other.character === form.character).length > 1 ? `, ${form.aliases.join(' ')}` : ''}`} aria-current={selectedKey === form.key ? 'true' : undefined}>
          <strong lang="zh-CN">{form.character}</strong><span>{form.strokeCount} strokes</span><small>{form.formKind === 'kangxi-heading' ? 'Kangxi heading' : form.character === family.canonical ? 'Mainland form' : 'Variant'}{family.forms.filter(other => other.character === form.character).length > 1 && <span lang="zh-CN"> · {form.aliases.join(' ')}</span>}</small>
        </Link>
      </Button>)}
    </div>
    <p className="detail-footnote">Family meaning · Unicode Unihan 17.0.0<br/>Forms · cjklib C-locale · cnchar-order 3.2.6<br/>Family reading · {family.familyPinyin} · not a pronunciation assigned to each variant<br/><a href="/data/radical-families-source.json" target="_blank" rel="noreferrer">Source records and license notices</a></p>
  </div>;
}