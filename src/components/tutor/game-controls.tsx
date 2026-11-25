import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Single-choice buttons reuse the Preferences segmented control; values remain owned by the game. */
export function GameChoices({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  const id = useId();
  return <div className="game-choice-field"><span className="game-setup-label" id={id}>{label}</span>
    <div className="writer-speed-options game-choice-options" role="group" aria-labelledby={id}>
      {options.map(option => <Button key={option.value} type="button" size="sm" variant="ghost"
        className={option.value === value ? 'active' : ''} aria-pressed={option.value === value}
        onClick={() => { if (option.value !== value) onChange(option.value); }}>{option.label}</Button>)}
    </div></div>;
}

/** Optional filters stay mounted behind a disclosure so opening it never resets URL-backed drafts. */
export function GameFilters({ count, children }: { count: number; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(count > 0);
  return <div className="game-filter-disclosure">
    <Button type="button" variant="ghost" className={`game-filter-heading${count ? ' active' : ''}`}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(previous => !previous)}>
      <SlidersHorizontal/>Filters{count > 0 && <span className="game-filter-number">{count}</span>}<ChevronDown className={open ? 'is-open' : ''}/>
    </Button>
    <div id={id} className="game-filter-grid" hidden={!open}>{children}</div>
  </div>;
}

/** A visible field label is separate from the selectable values and their screen-reader names. */
export function GameField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="game-setting-field"><span className="game-field-label">{label}</span>{children}</div>;
}