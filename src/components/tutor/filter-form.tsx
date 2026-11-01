import { useEffect, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Draft edits never change the applied URL or result pool. History restores the form. */
export function useDraftFilters<T extends object>(applied: T) {
  const key = JSON.stringify(applied);
  const [draft, setDraft] = useState(applied);
  useEffect(() => { setDraft(JSON.parse(key) as T); }, [key]);
  const patch = (next: Partial<T>) => setDraft(previous => ({ ...previous, ...next }));
  return { draft, patch, setDraft };
}

export function FilterForm({ children, onApply, onClear, count, changed, active }: { children: ReactNode; onApply: () => void; onClear: () => void; count: number; changed: boolean; active: boolean }) {
  return <form className="filter-bar shared-filter-form" aria-label="Filters" onSubmit={event => { event.preventDefault(); if (changed) onApply(); }}>
    {children}
    {(changed || active) && <div className="filter-submit">{changed && <Button type="submit" size="sm" variant="outline"><Check/>Apply</Button>}{active && <Button type="button" size="icon" variant="ghost" aria-label="Clear filters" title="Clear filters" onClick={onClear}><X/></Button>}</div>}
    <span className="catalog-results-count" aria-live="polite">{count.toLocaleString('en-US')} matches</span>
  </form>;
}

/** Own typing state here so draft keystrokes cannot rerender library cards or reference panels. */
export function DraftFilterForm<T extends object>({ applied, active, count, onApply, onClear, children }: { applied: T; active: boolean; count: number; onApply: (draft: T) => void; onClear: () => T; children: (controls: ReturnType<typeof useDraftFilters<T>>) => ReactNode }) {
  const controls = useDraftFilters(applied);
  const changed = JSON.stringify(controls.draft) !== JSON.stringify(applied);
  return <FilterForm count={count} active={active} changed={changed} onApply={() => onApply(controls.draft)} onClear={() => controls.setDraft(onClear())}>{children(controls)}</FilterForm>;
}