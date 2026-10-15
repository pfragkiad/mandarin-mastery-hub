import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ArrowUpRight, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { includeScript, type CharacterScript } from '@/lib/learning-preferences';
import { useWorkspace } from './workspace';
import { catalog, type CatalogRow } from '@/lib/catalog-store';
type ReferenceEntry = CatalogRow;
const radicals = catalog.radicals, components = catalog.components, characters = catalog.characters;
export type ReferenceKind = 'Radical' | 'Component' | 'Character';
export const referenceCatalog: { kind: ReferenceKind; entries: ReferenceEntry[] }[] = [
  { kind: 'Radical', entries: radicals },
  { kind: 'Component', entries: components },
  { kind: 'Character', entries: characters },
];
export function ReferencesPage() {
  const { preferences } = useWorkspace();
  const [limit,setLimit] = useState(120);
  const [tab,setTab] = useState('Radicals');
  const [query,setQuery] = useState('');
  const [strokes,setStrokes] = useState('All stroke counts');
  const data = tab === 'Radicals' ? radicals : tab === 'Components' ? components : characters;
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filtered = data.filter(row => includeScript(row[4], preferences.includeTraditional) && normalize(row.join(' ')).includes(normalize(query)) && (strokes === 'All stroke counts' || row[3].startsWith(`${strokes} stroke`)));
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">LOOK CLOSER · UNDERSTAND MORE</div><h1>The shape of the language.</h1><p>From the smallest component to a world of characters.</p></div><span className="heading-hanzi">字<span>zì</span></span></div><div className="collection-tabs" role="tablist" aria-label="Reference catalog">{['Radicals','Components','Characters'].map(t => <Button key={t} variant="ghost" className={t === tab ? 'selected' : ''} role="tab" aria-selected={t === tab} onClick={() => { setTab(t); setLimit(120); setStrokes('All stroke counts'); setQuery(''); }}>{t}</Button>)}</div><div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search references" placeholder="Search character, pinyin, meaning, or radical number…" value={query} onChange={e => { setQuery(e.target.value); setLimit(120); }}/></div>{tab !== 'Components' && <select className="filter-select" value={strokes} onChange={e => setStrokes(e.target.value)} aria-label="Stroke count"><option>All stroke counts</option>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n} {n === 1 ? 'stroke' : 'strokes'}</option>)}</select>}</div><div className="result-row"><span>{filtered.length} {tab.toLowerCase()} in this selection</span><span>{tab === 'Radicals' ? 'KANGXI RADICALS · 康熙部首' : 'CHARACTER REFERENCE · 汉字'}</span></div>{filtered.length ? <div className="reference-grid">{filtered.slice(0, limit).map(([hanzi,pinyin,meaning,note,script]) => <article className={`reference-card ${script === 'Traditional' ? 'is-traditional' : ''}`} key={hanzi}><span className="pinyin">{pinyin}</span><strong lang="zh-CN">{hanzi}</strong>{script === 'Traditional' && <span className="traditional-label">Traditional</span>}<h3>{meaning}</h3><p>{note}</p><Button variant="link" asChild><Link to="/strokes" search={{ character: hanzi }}>Practice <ArrowUpRight size={12}/></Link></Button></article>)}{filtered.length > limit && <Button variant="outline" className="reference-more" onClick={() => setLimit(l => l + 240)}>Show more ({(filtered.length - limit).toLocaleString('en-US')} left)</Button>}</div> : <div className="empty-state"><Library/><h3>No matching references.</h3><p>Try a different character, meaning, or stroke count.</p><Button variant="outline" onClick={() => { setQuery(''); setStrokes('All stroke counts'); }}>Clear filters</Button></div>}<p className="library-note">{tab === 'Radicals' ? 'The 214 Kangxi indexing radicals from Unicode Unihan 17.0.0.' : tab === 'Components' ? 'Components from Make Me a Hanzi decompositions. A component’s role depends on the character it belongs to.' : 'Characters with Unihan readings and meanings. Traditional forms are marked from Unihan variant data.'}</p></div>;
}
