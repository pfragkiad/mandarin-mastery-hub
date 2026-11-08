import { useEffect, useRef, useState, useTransition, type ReactNode, type SetStateAction } from 'react';
import { Check, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSmallLibraryScreen } from './use-small-library-screen';

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
    {(changed || active) && <div className="filter-submit">{changed && !autoApply && <Button type="submit" size="sm" variant="outline" disabled={pending}><Check/>Apply</Button>}{active && <Button type="button" size="icon" variant="ghost" className="close-x" disabled={pending} aria-label="Clear filters" title="Clear filters" onClick={() => run(onClear)}><X/></Button>}</div>}
    {showCount && <span className="catalog-results-count" aria-live="polite">{count.toLocaleString('en-US')} matches</span>}
  </form>;
}

/** Own typing state here so draft keystrokes cannot rerender library cards or reference panels.
 * With autoApply, every draft edit (the games' dropdowns) submits immediately through the
 * same wait-cursor transition; libraries keep the explicit Apply button. With live (small,
 * cheap result sets such as the Sound chart's syllables), every edit — keystrokes included —
 * applies synchronously with no wait cursor or frame delay, so the applied value catches
 * up before the next keystroke and the draft-sync effect never rolls typing back. */
export function DraftFilterForm<T extends object>({ applied, active, count, onApply, onClear, autoApply: autoApplyProp = false, live = false, showCount = true, children, filterFields, chips = [], searchKey }: { applied: T; active: boolean; count: number; onApply: (draft: T) => void; onClear: () => T; autoApply?: boolean; live?: boolean; showCount?: boolean; children: (controls: ReturnType<typeof useDraftFilters<T>>) => ReactNode; filterFields?: (controls: ReturnType<typeof useDraftFilters<T>>) => ReactNode; chips?: { label: string; clear: Partial<T> }[]; /** Text field cleared by the phone search-box X (only the text; other filters and search modes stay). */ searchKey?: keyof T }) {
  const controls = useDraftFilters(applied);
  const formRef = useRef<HTMLFormElement>(null);
  const autoApply = autoApplyProp || live;
  const small = useSmallLibraryScreen();
  const [sheetOpen, setSheetOpen] = useState(false);
  const changed = JSON.stringify(controls.draft) !== JSON.stringify(applied);
  const [pending, startTransition] = useTransition();
  useWaitCursor(autoApply && pending);
  // Auto-submit an edit with the same painted-wait-cursor pattern as FilterForm's Apply.
  const submit = (draft: T) => {
    if (live) { onApply(draft); return; }
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
  const renderControls = { ...controls, patch, setDraft };
  // Phone search-box X: phones hide the desktop clear-all X, so typed or applied search text
  // needs its own one-tap clear. It clears only the text: an applied search re-applies the
  // applied filters without it (discarding nothing else); unapplied typing just empties the draft.
  const draftSearch = searchKey ? String(controls.draft[searchKey] ?? '') : '';
  const appliedSearch = searchKey ? String(applied[searchKey] ?? '') : '';
  const clearSearch = () => {
    if (!searchKey) return;
    if (appliedSearch) { const next = { ...applied, [searchKey]: '' } as T; controls.setDraft(next); submit(next); }
    else controls.setDraft(previous => ({ ...previous, [searchKey]: '' }));
    // Keep the keyboard on the search box so the next query can be typed straight away.
    formRef.current?.querySelector<HTMLInputElement>('.search-field input')?.focus();
  };
  // The same isolated drafts feed either desktop fields or a phone sheet.
  if (small && filterFields) return <div className="mobile-library-filters">
    <form ref={formRef} className="filter-bar shared-filter-form" aria-label="Search filters" onSubmit={event => { event.preventDefault(); submit(controls.draft); }}>{children(renderControls)}{(changed || draftSearch || appliedSearch) && <span className="mobile-search-actions">{changed && <Button type="submit" variant="ghost" size="sm" disabled={pending}><Check/>Apply</Button>}{(draftSearch || appliedSearch) && <Button type="button" variant="ghost" size="icon" className="close-x" disabled={pending} aria-label="Clear search" title="Clear search" onClick={clearSearch}><X/></Button>}</span>}</form>
    <div className="mobile-filter-actions"><Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}><SlidersHorizontal/>Filters{chips.length > 0 && <span className="mobile-filter-count">{chips.length}</span>}</Button>{chips.map(chip => <Button key={chip.label} variant="ghost" size="sm" className="mobile-state-chip" aria-label={`Remove ${chip.label} filter`} onClick={() => { const next = { ...applied, ...chip.clear }; controls.setDraft(next); submit(next); }}>{chip.label}<X/></Button>)}</div>
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent side="bottom" className="library-control-sheet" aria-describedby={undefined}><SheetTitle>Filters</SheetTitle><div className="library-sheet-fields">{filterFields(renderControls)}</div><div className="library-sheet-actions">{active && <Button variant="ghost" disabled={pending} onClick={() => { controls.setDraft(onClear()); setSheetOpen(false); }}><X/>Clear filters</Button>}{changed && <Button disabled={pending} onClick={() => { submit(controls.draft); setSheetOpen(false); }}><Check/>Apply</Button>}</div></SheetContent></Sheet>
  </div>;
  return <FilterForm count={count} showCount={showCount} active={active} changed={changed} autoApply={autoApply} onApply={() => onApply(controls.draft)} onClear={() => controls.setDraft(onClear())}>{children(renderControls)}{filterFields?.(renderControls)}</FilterForm>;
}
