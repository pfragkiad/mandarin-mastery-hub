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

export function FilterForm({ children, onApply, onClear, count }: { children: ReactNode; onApply: () => void; onClear: () => void; count: number }) {
  return <form className="filter-bar shared-filter-form" aria-label="Filters" onSubmit={event => { event.preventDefault(); onApply(); }}>
    {children}
    <div className="filter-submit"><Button type="submit" size="sm" variant="outline"><Check/>Apply</Button><Button type="button" size="icon" variant="ghost" aria-label="Clear filters" title="Clear filters" onClick={onClear}><X/></Button></div>
    <span className="catalog-results-count" aria-live="polite">{count.toLocaleString('en-US')} matches</span>
  </form>;
}