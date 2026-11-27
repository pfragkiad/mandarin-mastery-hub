import { createContext, useContext, useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode, type SetStateAction } from 'react';
import { Check, Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSmallLibraryScreen } from './use-small-library-screen';
import { SavedFilterRow, SavedFilterToggle, type SavedFilter } from './saved-filter';

/** Dashed-outline filter toggle shared by "+ lower ranks", "+ fewer strokes", and "Hide radicals". */
export function FilterWideningToggle({ active, onToggle, label, title }: { active: boolean; onToggle: () => void; label: string; title: string }) {
  return <button type="button" className={`filter-upto-toggle${active ? ' active' : ''}`} aria-pressed={active} title={title} onClick={onToggle}>{label}</button>;
}

/** Where the clear-all (X) control lives: in the shared action row beside Apply/Reset
 *  (libraries, Sound chart) or in a section heading of its own (game filters). */
export type FilterClearPlacement = 'actions' | 'heading';

/** The form owns applied-filter state and the wait-cursor transition, so a clear-all button
 *  placed outside the action row can reach both without knowing which page it sits on. */
const FilterFormClearContext = createContext<{ active: boolean; pending: boolean; clear: () => void } | null>(null);

/** Labelled clear-all for a heading row (games show it on the "Filters" line). It renders
 *  nothing while no filter is applied, so the heading stays a plain label until there is
 *  something to undo, and it keeps the same accessible name as the action-row X. */
export function FilterFormClearButton() {
  const clear = useContext(FilterFormClearContext);
  if (!clear?.active) return null;
  return <Button type="button" size="sm" variant="ghost" className="filter-clear-heading" disabled={clear.pending}
    title="Clear every applied filter" onClick={clear.clear}><X/>Clear filters</Button>;
}

/** Shared search input with embedded Pinyin and Exact mode toggles. */
export function PinyinSearchInput({ value, onChange, py, onPyChange, ariaLabel, placeholder, autoFocus, onKeyDown }: { value: string; onChange: (value: string) => void; py: 'pinyin' | 'exact' | undefined; onPyChange: (next: 'pinyin' | 'exact' | undefined) => void; ariaLabel: string; placeholder: string; autoFocus?: boolean; onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void }) {
  return <div className="search-field"><Search/><input autoFocus={autoFocus} aria-label={ariaLabel} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}/><Button type="button" variant="ghost" className={`search-toggle${py ? ' on' : ''}`} aria-pressed={Boolean(py)} title="Search pinyin only" onClick={() => onPyChange(py ? undefined : 'pinyin')}>Pinyin</Button>{py && <Button type="button" variant="ghost" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => onPyChange(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>;
}

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

export function FilterForm({ children, onApply, onReset, onClear, count, changed, active, autoApply = false, showCount = true, resetLabel, clearPlacement = 'actions' }: { children: ReactNode; onApply: () => void; onReset: () => void; onClear: () => void; count: number; changed: boolean; active: boolean; autoApply?: boolean; showCount?: boolean; resetLabel?: string; clearPlacement?: FilterClearPlacement }) {
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
  // With the clear-all living in a heading (game filters), the action row exists only while a
  // draft edit waits for Apply: an always-mounted row would leave a blank band under the
  // filters. It sits on its own grid row below the filter fields, so mounting it on the first
  // edit cannot move an anchored range panel mid-drag.
  const showActions = clearPlacement === 'heading' ? changed && !autoApply : !autoApply || changed || active || Boolean(resetLabel);
  return <form className="filter-bar shared-filter-form" data-filters-changed={changed && !autoApply ? '' : undefined} aria-label="Filters" aria-busy={pending} onSubmit={event => { event.preventDefault(); if (changed) run(onApply); }}>
    <FilterFormClearContext.Provider value={{ active, pending, clear: () => run(onClear) }}>{children}</FilterFormClearContext.Provider>
    {/* Auto-apply mode (games) never shows Apply: every edit submits itself; X still clears. */}
    {showActions && <div className="filter-submit">
      {changed && !autoApply && <Button type="submit" size="sm" variant="outline" disabled={pending}><Check/>Apply</Button>}
      {/* Reset only abandons unapplied edits. Applied filters and the result pool stay
          untouched; the separate X remains the explicit clear-all action. */}
      {changed && !autoApply && resetLabel && <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onReset}><RotateCcw/>{resetLabel}</Button>}
      {active && clearPlacement !== 'heading' && <Button type="button" size="icon" variant="ghost" className="close-x" disabled={pending} aria-label="Clear filters" title="Clear filters" onClick={() => run(onClear)}><X/></Button>}
    </div>}
    {showCount && <span className="catalog-results-count" aria-live="polite">{count.toLocaleString('en-US')} matches</span>}
  </form>;
}

/** Own typing state here so draft keystrokes cannot rerender library cards or reference panels.
 * With autoApply, every draft edit (the games' dropdowns) submits immediately through the
 * same wait-cursor transition; libraries keep the explicit Apply button. With live (small,
 * cheap result sets such as the Sound chart's syllables), every edit — keystrokes included —
 * applies synchronously with no wait cursor or frame delay, so the applied value catches
 * up before the next keystroke and the draft-sync effect never rolls typing back. */
export function DraftFilterForm<T extends object>({ applied, active, count, onApply, onClear, autoApply: autoApplyProp = false, live = false, showCount = true, resetLabel, clearPlacement = 'actions', children, filterFields, chips = [], searchKey, searchModeKey, saved }: { applied: T; active: boolean; count: number; onApply: (draft: T) => void; onClear: () => T; autoApply?: boolean; live?: boolean; showCount?: boolean; resetLabel?: string; /** 'heading' lets a section heading (the games' "Filters" line) carry the clear-all instead of the action row. */ clearPlacement?: FilterClearPlacement; children: (controls: ReturnType<typeof useDraftFilters<T>>) => ReactNode; filterFields?: (controls: ReturnType<typeof useDraftFilters<T>>) => ReactNode; chips?: { label: string; clear: Partial<T> }[]; /** Text field cleared by the phone search-box X (only the text; other filters and search modes stay). */ searchKey?: keyof T; /** Search-mode field (Pinyin/Exact) that alone never offers Apply while the search text is empty. */ searchModeKey?: keyof T; /** Saved-only browsing: an immediate toggle (never drafted) after the dropdowns, beside the phone Filters button and first in its drawer. */ saved?: SavedFilter }) {
  const controls = useDraftFilters(applied);
  const formRef = useRef<HTMLFormElement>(null);
  const autoApply = autoApplyProp || live;
  const small = useSmallLibraryScreen();
  const [sheetOpen, setSheetOpen] = useState(false);
  // A search mode (Pinyin/Exact) only matters once there is text to search: with an empty
  // search box, toggling it alone filters nothing, so it must not offer Apply. The toggled
  // mode stays in the draft and is applied together with the next typed text or filter.
  const comparable = (values: T) => searchKey && searchModeKey && !String(controls.draft[searchKey] ?? '') ? { ...values, [searchModeKey]: undefined } : values;
  const changed = JSON.stringify(comparable(controls.draft)) !== JSON.stringify(comparable(applied));
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
    <form ref={formRef} className="filter-bar shared-filter-form" aria-label="Search filters" onSubmit={event => { event.preventDefault(); submit(controls.draft); }}>{children(renderControls)}{(changed || draftSearch || appliedSearch) && <span className="mobile-search-actions">{changed && <Button type="submit" variant="ghost" size="sm" disabled={pending}><Check/>Apply</Button>}{changed && resetLabel && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => controls.setDraft(applied)}><RotateCcw/>{resetLabel}</Button>}{(draftSearch || appliedSearch) && <Button type="button" variant="ghost" size="icon" className="close-x" disabled={pending} aria-label="Clear search" title="Clear search" onClick={clearSearch}><X/></Button>}</span>}</form>
    <div className="mobile-filter-actions"><Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}><SlidersHorizontal/>Filters{chips.length > 0 && <span className="mobile-filter-count">{chips.length}</span>}</Button>{saved && <SavedFilterToggle {...saved}/>}{chips.map(chip => <Button key={chip.label} variant="ghost" size="sm" className="mobile-state-chip" aria-label={`Remove ${chip.label} filter`} onClick={() => { const next = { ...applied, ...chip.clear }; controls.setDraft(next); submit(next); }}>{chip.label}<X/></Button>)}</div>
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent side="bottom" className="library-control-sheet" aria-describedby={undefined}><SheetTitle>Filters</SheetTitle><div className="library-sheet-fields">{saved && <SavedFilterRow {...saved}/>}{filterFields(renderControls)}</div>{/* The actions row is always rendered with a reserved button height, so Apply,
      Reset and Clear appearing after an edit never resize the sheet or shift its fields. */}<div className="library-sheet-actions">{active && <Button variant="ghost" disabled={pending} onClick={() => { controls.setDraft(onClear()); setSheetOpen(false); }}><X/>Clear filters</Button>}{changed && <Button disabled={pending} onClick={() => { submit(controls.draft); setSheetOpen(false); }}><Check/>Apply</Button>}{changed && resetLabel && <Button variant="ghost" disabled={pending} onClick={() => controls.setDraft(applied)}><RotateCcw/>{resetLabel}</Button>}</div></SheetContent></Sheet>
  </div>;
  return <FilterForm count={count} showCount={showCount} {...(resetLabel ? { resetLabel } : {})} clearPlacement={clearPlacement} active={active} changed={changed} autoApply={autoApply} onApply={() => onApply(controls.draft)} onReset={() => controls.setDraft(applied)} onClear={() => controls.setDraft(onClear())}>{children(renderControls)}{filterFields?.(renderControls)}{saved && <SavedFilterToggle {...saved}/>}</FilterForm>;
}
