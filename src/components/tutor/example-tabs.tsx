import { useContext, useEffect, useId, useMemo, useState, type ReactNode, type Ref } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stableContext } from '@/lib/stable-context';
import { exampleTabSearch, type ExampleTab } from '@/lib/detail-example-tabs';

type Section = { id: ExampleTab; label: string; icon: LucideIcon; hasContent: boolean };
type ExampleContext = { active: ExampleTab | undefined; panelId: string; register: (section: Section) => () => void };
const Context = stableContext<ExampleContext | null>('detailExampleTabs', null);
const order: ExampleTab[] = ['character', 'word', 'phrase', 'idiom'];
/** Layout observers re-arm after a previously hidden example body mounts. */
export const useExampleTab = () => useContext(Context)?.active;

/** One shared examples drawer for glyph, vocabulary and sound details. Sections
 * register availability after exact source loading; only the selected body mounts.
 * URL selection/collapse preserves browser Back and exact record links independently
 * of the Decomposition/Etymology drawer and its remembered open preference. */
export function ExampleTabs({ children, hideEmptyWordPhrase = false }: { children: ReactNode; hideEmptyWordPhrase?: boolean }) {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const selected = exampleTabSearch(search.examples);
  const [sections, setSections] = useState<Section[]>([]);
  const panelId = `example-drawer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const register = useMemo(() => (section: Section) => {
    setSections(current => [...current.filter(item => item.id !== section.id), section].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)));
    return () => setSections(current => current.filter(item => item.id !== section.id));
  }, []);
  // Hide this pair only once both sources have settled empty. Loading still counts as
  // content; an independently available idiom/character section remains selectable.
  const emptyPair = hideEmptyWordPhrase && sections.some(section => section.id === 'word' && !section.hasContent) && sections.some(section => section.id === 'phrase' && !section.hasContent);
  const visibleSections = emptyPair ? sections.filter(section => section.id !== 'word' && section.id !== 'phrase') : sections;
  const chosen = visibleSections.find(section => section.id === selected)?.id ?? visibleSections[0]?.id;
  const active = selected === 'off' ? undefined : chosen;
  const value = useMemo(() => ({ active, panelId, register }), [active, panelId, register]);
  const select = (next: ExampleTab | 'off') => { void navigate({ to: '.', search: prev => ({ ...prev, examples: next }), resetScroll: false }); };
  return <Context.Provider value={value}>
    {visibleSections.length > 0 && <div className={`stroke-guide example-tabs${active ? ' is-open' : ''}`}>
      <div className="stroke-tabs">
        <div className="stroke-tab-list" role="tablist" aria-label="Examples">
          {visibleSections.map(({ id, label, icon: Icon }) => <span className="stroke-tab-item" key={id}>
            <Button variant="ghost" role="tab" id={`${panelId}-${id}`} className="stroke-tab" aria-selected={active === id} aria-controls={active === id ? panelId : undefined} onClick={() => select(active === id ? 'off' : id)}><Icon size={13} aria-hidden="true"/>{label}</Button>
          </span>)}
        </div>
        <Button variant="ghost" size="icon" className="stroke-tabs-collapse" aria-label={active ? 'Collapse examples' : 'Expand examples'} title={active ? 'Collapse' : 'Expand'} aria-expanded={Boolean(active)} onClick={() => { if (active) select('off'); else if (chosen) select(chosen); }}>{active ? <ChevronUp size={18} aria-hidden="true"/> : <ChevronDown size={18} aria-hidden="true"/>}</Button>
      </div>
    </div>}
    {children}
  </Context.Provider>;
}

/** Reuses the original standalone heading outside an examples drawer (fixtures
 * and other consumers). In a drawer, availability registers one tab, avoiding
 * duplicate headings and keeping empty optional source sections hidden. */
export function ExampleSection({ id, label, icon: Icon, available = true, hasContent = true, className = 'glyph-usage-section', sectionRef, children }: { id: ExampleTab; label: string; icon: LucideIcon; available?: boolean; hasContent?: boolean; className?: string; sectionRef?: Ref<HTMLElement>; children: ReactNode }) {
  const context = useContext(Context);
  const register = context?.register;
  useEffect(() => {
    if (!available || !register) return;
    return register({ id, label, icon: Icon, hasContent });
  }, [register, available, hasContent, id, label, Icon]);
  if (!available || (context && context.active !== id)) return null;
  return <section ref={sectionRef} className={`${className}${context ? ' stroke-drawer example-tab-panel' : ''}`} aria-label={label} {...(context ? { id: context.panelId, role: 'tabpanel', 'aria-labelledby': `${context.panelId}-${id}` } : {})}>
    {!context && <h3 className="eyebrow"><Icon size={13} aria-hidden="true"/>{label.toUpperCase()}</h3>}
    {children}
  </section>;
}