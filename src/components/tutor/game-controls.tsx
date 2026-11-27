import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterSelect } from './filter-select';
import { FilterFormClearButton, FilterWideningToggle } from './filter-form';
import { parseRankRange, rankRangeValue, rankRangeLabel, rankSliderPosition, sliderPositionRank } from '@/lib/rank-range';
import { STROKE_SLIDER_MAX, STROKE_SLIDER_MIN, formatStrokeRangeLabel, formatStrokeRangeValue, parseStrokeRange } from '@/lib/stroke-range';
import { formatSelectedLevels, parseSelectedLevels } from '@/lib/mandarin';

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

/** All game filters stay visible; only individual range editors float behind their buttons.
 *  The clear-all action sits on this heading line (labelled, not an icon on its own row), so
 *  the action row below only has to carry Apply/Reset while a draft edit is waiting. */
export function GameFilters({ count, children }: { count: number; children: ReactNode }) {
  return <div className="game-filter-disclosure">
    <div className="game-filter-heading">
      <SlidersHorizontal/><span>Filters</span>{count > 0 && <span className="game-filter-number">{count}</span>}
      <FilterFormClearButton/>
    </div>
    <div className="game-filter-grid">{children}</div>
  </div>;
}

/** A visible field label is separate from the selectable values and their screen-reader names. */
export function GameField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="game-setting-field"><span className="game-field-label">{label}</span>{children}</div>;
}

/** Multi-select HSK level pills for game setup: sits on its own row above the
 *  secondary dropdowns so learners can combine levels (e.g. HSK 1 + HSK 2).
 *  Empty selection means all levels; drafts still commit only on Apply. */
export function GameLevelPills({ levels, value, onChange, emptyValue = '' }: {
  levels: string[]; value: string; onChange: (value: string) => void; emptyValue?: string;
}) {
  const id = useId();
  const selected = parseSelectedLevels(value);
  const toggle = (level: string) => {
    const next = selected.includes(level) ? selected.filter(l => l !== level) : [...selected, level];
    onChange(formatSelectedLevels(next, emptyValue));
  };
  return <div className="game-setting-field game-level-field">
    <span className="game-field-label" id={id}>Level</span>
    <div className="game-level-pills" role="group" aria-labelledby={id}>
      {levels.map(level => {
        const on = selected.includes(level);
        return <Button key={level} type="button" size="sm" variant="outline"
          className={`game-level-pill${on ? ' is-selected' : ''}`}
          aria-pressed={on} onClick={() => toggle(level)}>
          {on && <Check aria-hidden="true" />}
          <span className={level === 'Unclassified' ? 'unclassified-option' : undefined}>{level}</span>
        </Button>;
      })}
    </div>
  </div>;
}

/** The open panel's own close action. It reaches the disclosure through context so each
 * range editor can place Done inside its own card layout (beside the presets for
 * strokes, under the advanced rank controls) instead of outside the bordered card. */
const GameRangeCloseContext = createContext<() => void>(() => {});

/** Small explicit close for a floating range panel. It commits nothing: the game's Apply
 * stays the only thing that changes the pool, so Done reads as "finished looking". */
function GameRangeDone() {
  const close = useContext(GameRangeCloseContext);
  return <Button type="button" variant="outline" size="sm" className="game-range-done"
    title="Close this filter panel" onClick={close}>Done</Button>;
}

/** Shared anchored popover: outside clicks dismiss it without applying or discarding
 * parent-owned drafts, and Done closes it the same way from inside. Secondary
 * disclosure state lives above the unmounted panel. */
function GameRangeDisclosure({ label, summary, active, labelled = true, children }: {
  label: string; summary: string; active: boolean; labelled?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const popover = <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" size="sm"
      className={`filter-select game-range-trigger${active ? ' filter-select-active' : ''}`}
      aria-label={`${label}: ${summary}`}>
      <span>{label}: {summary}</span><ChevronDown className={open ? 'is-open' : ''}/>
    </Button></PopoverTrigger>
    <PopoverContent side="bottom" align="start" sideOffset={4} collisionPadding={12}
      className="game-range-popover" aria-label={`${label} filter`}>
      <GameRangeCloseContext.Provider value={close}>{children}</GameRangeCloseContext.Provider>
    </PopoverContent>
  </Popover>;
  return labelled ? <GameField label={label === 'Strokes' ? 'Stroke count' : 'Frequency'}>{popover}</GameField> : popover;
}

export type GameRankGroup = { value: string; label: string; min: number; max: number };

/** Source-defined rank groups remain the quick choices. Advanced uses exact inclusive
 * numeric ranks (not class positions); unranked is an independent, explicit inclusion.
 * The parent owns URL-backed drafts and Apply; panel state never changes the pool. */
export function FrequencyRangeControl({ value, upTo = false, groups, maxRank, allowUnranked = true, labelled = true, onChange }: {
  value: string; upTo?: boolean; groups: readonly GameRankGroup[]; maxRank: number;
  allowUnranked?: boolean; labelled?: boolean; onChange: (value: string, upTo: boolean) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const advancedId = useId();
  const custom = parseRankRange(value);
  const group = groups.find(candidate => candidate.value === value);
  const max = Math.max(1, maxRank);
  const lo = custom?.min ?? (group && group.value !== 'unranked' && !upTo ? group.min : 1);
  const hi = custom?.max ?? (group && group.value !== 'unranked' ? Math.min(group.max, max) : max);
  const unranked = custom?.unranked ?? value === 'unranked';
  const summary = custom ? rankRangeLabel(custom) : value === 'unranked' ? 'Unranked' : group ? Number.isFinite(group.max) ? `${upTo ? 1 : group.min}–${group.max}` : `${upTo ? 1 : group.min}+` : 'Any';
  const update = (min: number, end: number, include = unranked) => {
    if (!Number.isFinite(min) || !Number.isFinite(end)) return;
    onChange(rankRangeValue(Math.max(1, Math.min(max, Math.round(min))), Math.max(1, Math.min(max, Math.round(end))), max, include), false);
  };
  const ticks = [...new Set([1, ...groups.filter(g => g.value !== 'unranked' && Number.isFinite(g.max)).map(g => g.max), max])].filter(n => n <= max).sort((a, b) => a - b);
  const finiteGroups = groups.filter(g => g.value !== 'unranked' && Number.isFinite(g.max) && g.max <= max);
  // Three quick "Top N" choices only: a fourth pill (e.g. Top 2,000) overflows the
  // 400px panel and pushes Done — or the pill itself — onto a wrapped second line.
  const presets = finiteGroups.length >= 4 ? [finiteGroups[0], finiteGroups[1], finiteGroups[3]].filter((g): g is GameRankGroup => Boolean(g)) : finiteGroups.slice(0, 3);
  return <GameRangeDisclosure label="Rank" summary={summary} active={Boolean(value)} labelled={labelled}>
    <div className={`stroke-range-card${value ? ' is-active' : ''}`}>
      <div className="stroke-range-header"><span className="stroke-range-label">Frequency rank · {summary}</span>
        <Button type="button" variant="ghost" className="stroke-range-any" disabled={!value} onClick={() => onChange('', false)}>Clear</Button>
      </div>
      <GameField label="Frequency"><FilterSelect ariaLabel="Frequency" value={value} onValueChange={v => onChange(v, false)}
        items={[{ value: '', label: 'All ranks' }, ...groups.map(g => ({ value: g.value, label: g.label })), ...(custom ? [{ value, label: `Rank ${rankRangeLabel(custom)}` }] : [])]}/></GameField>
      {group && group.value !== 'unranked' && <FilterWideningToggle active={upTo} onToggle={() => onChange(value, !upTo)} label="+ lower ranks" title="Also include every more frequent rank above the selected group"/>}
      <Button type="button" variant="ghost" size="sm" className="game-range-advanced-toggle" aria-expanded={advanced} aria-controls={advancedId} onClick={() => setAdvanced(previous => !previous)}>
        Advanced<ChevronDown className={advanced ? 'is-open' : ''}/>
      </Button>
      {advanced && <div id={advancedId} className="game-rank-advanced">
        <div className="game-rank-inputs">
          <GameField label="From rank"><Input type="number" aria-label="From rank" min={1} max={max} value={lo} disabled={!maxRank}
            onChange={e => { if (e.target.value) { const next = Math.max(1, Math.min(max, Number(e.target.value))); update(next, Math.max(next, hi)); } }}/></GameField>
          <GameField label="To rank"><Input type="number" aria-label="To rank" min={1} max={max} value={hi} disabled={!maxRank}
            onChange={e => { if (e.target.value) { const next = Math.max(1, Math.min(max, Number(e.target.value))); update(Math.min(lo, next), next); } }}/></GameField>
          {allowUnranked && <Button type="button" size="sm" variant="outline" aria-pressed={unranked} className={unranked ? 'filter-select-active' : ''} disabled={!maxRank} onClick={() => update(lo, hi, !unranked)}>+ Unranked</Button>}
        </div>
        <SliderPrimitive.Root className="stroke-range-slider" min={0} max={Math.max(1, (ticks.length - 1) * 1000)} step={1} disabled={!maxRank}
          value={[rankSliderPosition(lo, ticks), rankSliderPosition(hi, ticks)]} onValueChange={([min, end]) => { if (min !== undefined && end !== undefined) update(sliderPositionRank(min, ticks), sliderPositionRank(end, ticks)); }} aria-label="Frequency rank range">
          <SliderPrimitive.Track className="stroke-range-track"><SliderPrimitive.Range className="stroke-range-fill"/></SliderPrimitive.Track>
          {/* Inner hit layer lets Radix Slider pick the nearest thumb synchronously via pointer position instead of relying on focus timing. */}
          <SliderPrimitive.Thumb className="stroke-range-thumb" aria-label="Minimum rank" aria-valuetext={String(lo)}><span className="stroke-range-thumb-hit" aria-hidden="true"/></SliderPrimitive.Thumb>
          <SliderPrimitive.Thumb className="stroke-range-thumb" aria-label="Maximum rank" aria-valuetext={String(hi)}><span className="stroke-range-thumb-hit" aria-hidden="true"/></SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
        <div className="game-rank-ticks" aria-hidden="true">{ticks.map(tick => <span key={tick}>{tick.toLocaleString('en-US')}{groups.find(g => g.max === tick)?.label.split(' · ')[1] && <small>{groups.find(g => g.max === tick)?.label.split(' · ')[1]}</small>}</span>)}</div>
      </div>}
      {/* Presets and Done share the panel's bottom row, exactly like the stroke panel,
          so Done never sits alone on a line of its own. */}
      <div className="game-range-footer">
        {advanced && <div className="stroke-range-presets" role="group" aria-label="Rank presets">{presets.map(preset => <Button key={preset.value} type="button" size="sm" variant="ghost"
          className={lo === 1 && hi === preset.max && Boolean(value) ? 'active' : ''} onClick={() => update(1, preset.max)}>Top {preset.max.toLocaleString('en-US')}</Button>)}</div>}
        <GameRangeDone/>
      </div>
    </div>
  </GameRangeDisclosure>;
}

const STROKE_PRESETS = [
  { value: '1-5', label: '1–5' },
  { value: '6-10', label: '6–10' },
  { value: '11+', label: '11+' },
] as const;

/** Dual-thumb stroke range slider with quick presets and a dedicated draft-only Clear. */
export function StrokeRangeControl({ value, strokesUpTo = false, labelled = true, minStrokes, maxStrokes, onChange }: {
  value: string; strokesUpTo?: boolean; labelled?: boolean; minStrokes?: number | undefined; maxStrokes?: number | undefined; onChange: (value: string) => void;
}) {
  const sliderMin = Math.max(STROKE_SLIDER_MIN, minStrokes ?? STROKE_SLIDER_MIN);
  const sliderMax = Math.max(sliderMin, maxStrokes ?? STROKE_SLIDER_MAX);
  const range = parseStrokeRange(value, strokesUpTo);
  const lo = range ? Math.min(sliderMax, Math.max(sliderMin, range.min)) : sliderMin;
  const hi = range ? (range.max === null ? sliderMax : Math.min(sliderMax, Math.max(lo, range.max))) : sliderMax;
  const normalized = range ? formatStrokeRangeValue(range.min, range.max) : '';
  const active = Boolean(range);

  const handleSlider = ([nextLo, nextHi]: number[]) => {
    if (nextLo === undefined || nextHi === undefined) return;
    if (nextLo <= sliderMin && nextHi >= sliderMax) { onChange(''); return; }
    const max = nextHi >= sliderMax ? null : nextHi;
    onChange(formatStrokeRangeValue(nextLo, max));
  };

  return <GameRangeDisclosure label="Strokes" summary={active ? formatStrokeRangeLabel(value, strokesUpTo).replace(/ strokes?$/, '') : 'Any'} active={active} labelled={labelled}><div className={`stroke-range-card${active ? ' is-active' : ''}`}>
    <div className="stroke-range-header">
      <span className="stroke-range-label">{formatStrokeRangeLabel(value, strokesUpTo, sliderMin, sliderMax)}</span>
      {/* Clear resets only the stroke draft; the game's Apply still commits it. */}
      <Button type="button" variant="ghost" className={`stroke-range-any${active ? ' is-reset' : ''}`}
        disabled={!active} onClick={() => onChange('')}>
        Clear
      </Button>
    </div>
    <SliderPrimitive.Root
      className="stroke-range-slider"
      min={sliderMin}
      max={sliderMax}
      step={1}
      value={[lo, hi]}
      disabled={sliderMin === sliderMax}
      onValueChange={handleSlider}
      aria-label="Stroke count range"
    >
      <SliderPrimitive.Track className="stroke-range-track">
        <SliderPrimitive.Range className="stroke-range-fill" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="stroke-range-thumb" aria-label="Minimum strokes"><span className="stroke-range-thumb-hit" aria-hidden="true"/></SliderPrimitive.Thumb>
      <SliderPrimitive.Thumb className="stroke-range-thumb" aria-label="Maximum strokes"><span className="stroke-range-thumb-hit" aria-hidden="true"/></SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
    {/* Presets and Done share the panel's bottom row: presets pick a range, Done closes it. */}
    <div className="game-range-footer">
      <div className="stroke-range-presets" role="group" aria-label="Stroke count presets">
        {STROKE_PRESETS.map(preset => {
          const isSelected = normalized === preset.value;
          const parsed = parseStrokeRange(preset.value);
          const outOfRange = !isSelected && Boolean(parsed && (parsed.min > sliderMax || (parsed.max !== null && parsed.max < sliderMin)));
          return <Button key={preset.value} type="button" size="sm" variant="ghost"
            className={isSelected ? 'active' : ''} aria-pressed={isSelected} disabled={outOfRange}
            onClick={() => onChange(isSelected ? '' : preset.value)}>{preset.label}</Button>;
        })}
      </div>
      <GameRangeDone/>
    </div>
  </div></GameRangeDisclosure>;
}