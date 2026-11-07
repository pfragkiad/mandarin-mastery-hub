import { useEffect, useState, useTransition, type ReactNode, type SetStateAction } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Draft edits never change the applied URL or result pool. History restores the form. */
export function useDraftFilters<T extends object>(applied: T) {
  const key = JSON.stringify(applied);
  // Filter values are serializable URL fields. Compare their values, not the
  // parent's object identity, so ordinary renders do not erase unsubmitted edits.
  const [draft, setDraft] = useState(applied);
  useEffect(() => { setDraft(JSON.parse(key) as T); }, [key]);
  const patch = (next: Partial<T>) => setDraft(previous => ({ ...previous, ...next }));
  return { draft, patch, setDraft };
}

/** Full-screen wait cursor while an expensive filter update settles. */
function useWaitCursor(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    const style = document.createElement('style');
    style.textContent = '* { cursor: wait !important; }';
    document.head.appendChild(style);
    return () => style.remove();
  }, [pending]);
}

export function FilterForm({ children, onApply, onClear, count, changed, active, autoApply = false, showCount = true }: { children: ReactNode; onApply: () => void; onClear: () => void; count: number; changed: boolean; active: boolean; autoApply?: boolean; showCount?: boolean }) {
  const [pending, startTransition] = useTransition();
  useWaitCursor(pending);
  const run = (action: () => void) => {
    if (pending) return;
    // Without animation frames (e.g. test DOMs) apply immediately.
    if (typeof requestAnimationFrame !== 'function') { startTransition(action); return; }
    startTransition(async () => {
      // Let the waiting cursor paint before the expensive result update begins.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      startTransition(action);
    });
  };
  return <form className="filter-bar shared-filter-form" aria-label="Filters" aria-busy={pending} onSubmit={event => { event.preventDefault(); if (changed) run(onApply); }}>
    {children}
    {/* Auto-apply mode (games) never shows Apply: every edit submits itself; X still clears. */}
    {(changed || active) && <div className="filter-submit">{changed && !autoApply && <Button type="submit" size="sm" variant="outline" disabled={pending}><Check/>Apply</Button>}{active && <Button type="button" size="icon" variant="ghost" disabled={pending} aria-label="Clear filters" title="Clear filters" onClick={() => run(onClear)}><X/></Button>}</div>}
    {showCount && <span className="catalog-results-count" aria-live="polite">{count.toLocaleString('en-US')} matches</span>}
  </form>;
}

/** Own typing state here so draft keystrokes cannot rerender library cards or reference panels.
 * With autoApply, every draft edit (the games' dropdowns) submits immediately through the
 * same wait-cursor transition; libraries keep the explicit Apply button. */
export function DraftFilterForm<T extends object>({ applied, active, count, onApply, onClear, autoApply = false, showCount = true, children }: { applied: T; active: boolean; count: number; onApply: (draft: T) => void; onClear: () => T; autoApply?: boolean; showCount?: boolean; children: (controls: ReturnType<typeof useDraftFilters<T>>) => ReactNode }) {
  const controls = useDraftFilters(applied);
  const changed = JSON.stringify(controls.draft) !== JSON.stringify(applied);
  const [pending, startTransition] = useTransition();
  useWaitCursor(autoApply && pending);
  // Auto-submit an edit with the same painted-wait-cursor pattern as FilterForm's Apply.
  const submit = (draft: T) => {
    if (typeof requestAnimationFrame !== 'function') { startTransition(() => onApply(draft)); return; }
    startTransition(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      startTransition(() => onApply(draft));
    });
  };
  // In auto-apply mode patch/setDraft submit their merged values instead of only drafting.
  const patch = (next: Partial<T>) => {
    const merged = { ...controls.draft, ...next };
    controls.setDraft(merged);
    if (autoApply) submit(merged);
  };
  const setDraft = (next: SetStateAction<T>) => {
    controls.setDraft(next);
    // Updater functions (if any) resolve against the current draft before auto-submitting.
    if (autoApply) submit(typeof next === 'function' ? (next as (previous: T) => T)(controls.draft) : next);
  };
  // Clear applies immediately and returns the cleared values to the local draft;
  // Apply alone submits edited values to the owning page's URL/filter state.
  return <FilterForm count={count} showCount={showCount} active={active} changed={changed} autoApply={autoApply} onApply={() => onApply(controls.draft)} onClear={() => controls.setDraft(onClear())}>{children({ ...controls, patch, setDraft })}</FilterForm>;
}
