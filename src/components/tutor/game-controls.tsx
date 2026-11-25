import { useId, useState, type ReactNode } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STROKE_SLIDER_MAX, STROKE_SLIDER_MIN, formatStrokeRangeLabel, formatStrokeRangeValue, parseStrokeRange } from '@/lib/stroke-range';

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

const STROKE_PRESETS = [
  { value: '1-5', label: '1–5' },
  { value: '6-10', label: '6–10' },
  { value: '11+', label: '11+' },
] as const;

/** Dual-thumb stroke range slider with quick presets (1–5, 6–10, 11+) and an "any: 1 – 20+" reset. */
export function StrokeRangeControl({ value, strokesUpTo = false, onChange }: {
  value: string; strokesUpTo?: boolean; onChange: (value: string) => void;
}) {
  const range = parseStrokeRange(value, strokesUpTo);
  const lo = range ? Math.min(STROKE_SLIDER_MAX, Math.max(STROKE_SLIDER_MIN, range.min)) : STROKE_SLIDER_MIN;
  const hi = range ? (range.max === null ? STROKE_SLIDER_MAX : Math.min(STROKE_SLIDER_MAX, Math.max(lo, range.max))) : STROKE_SLIDER_MAX;
  const normalized = range ? formatStrokeRangeValue(range.min, range.max) : '';
  const active = Boolean(range);

  const handleSlider = ([nextLo, nextHi]: number[]) => {
    if (nextLo === undefined || nextHi === undefined) return;
    const max = nextHi >= STROKE_SLIDER_MAX ? null : nextHi;
    onChange(formatStrokeRangeValue(nextLo, max));
  };

  return <div className={`stroke-range-card${active ? ' is-active' : ''}`}>
    <div className="stroke-range-header">
      <span className="stroke-range-label">{formatStrokeRangeLabel(value, strokesUpTo)}</span>
      {active ? (
        <button type="button" className="stroke-range-any is-reset" onClick={() => onChange('')} aria-label="Reset stroke range to any">
          any: {STROKE_SLIDER_MIN} – {STROKE_SLIDER_MAX}+
        </button>
      ) : (
        <span className="stroke-range-any">any: {STROKE_SLIDER_MIN} – {STROKE_SLIDER_MAX}+</span>
      )}
    </div>
    <SliderPrimitive.Root
      className="stroke-range-slider"
      min={STROKE_SLIDER_MIN}
      max={STROKE_SLIDER_MAX}
      step={1}
      value={[lo, hi]}
      onValueChange={handleSlider}
      aria-label="Stroke count range"
    >
      <SliderPrimitive.Track className="stroke-range-track">
        <SliderPrimitive.Range className="stroke-range-fill" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="stroke-range-thumb" aria-label="Minimum strokes" />
      <SliderPrimitive.Thumb className="stroke-range-thumb" aria-label="Maximum strokes" />
    </SliderPrimitive.Root>
    <div className="stroke-range-presets" role="group" aria-label="Stroke count presets">
      {STROKE_PRESETS.map(preset => {
        const isSelected = normalized === preset.value;
        return <Button key={preset.value} type="button" size="sm" variant="ghost"
          className={isSelected ? 'active' : ''} aria-pressed={isSelected}
          onClick={() => onChange(isSelected ? '' : preset.value)}>{preset.label}</Button>;
      })}
    </div>
  </div>;
}