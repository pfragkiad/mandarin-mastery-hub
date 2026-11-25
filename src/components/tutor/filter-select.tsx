/**
 * Shared dropdown control for filter, sort, and settings selects across the tutor.
 * Wraps Radix Select so every dropdown shares the same trigger border, arrow inset
 * (--select-arrow-inset), text-to-arrow gap, and themed menu popover — never mixing
 * native OS <select> menus with Radix popovers.
 *
 * Radix forbids empty-string item values and only reads an item's text after the menu
 * mounts, so this component maps "" to an internal sentinel and renders the selected
 * label explicitly inside SelectValue from first paint.
 */
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const EMPTY_SENTINEL = '__empty__';

export interface FilterSelectOption {
  value: string;
  label: string;
  /** Shorter label shown in the closed trigger when menu items carry extra detail. */
  triggerLabel?: string;
  disabled?: boolean;
  /** Explicit hierarchy only: ordinary grouped options retain their flat styling. */
  nested?: boolean;
  parent?: boolean;
}

export interface FilterSelectGroup {
  label: string;
  options: FilterSelectOption[];
}

export type FilterSelectItem = FilterSelectOption | FilterSelectGroup;

function isGroup(item: FilterSelectItem): item is FilterSelectGroup {
  return 'options' in item;
}

/** Preserve ordinary ordering and groups; missing-classification choices are always last. */
export function orderedFilterItems(items: FilterSelectItem[]): FilterSelectItem[] {
  const missing: FilterSelectOption[] = [];
  const ordinary = items.flatMap<FilterSelectItem>(item => {
    if (isGroup(item)) {
      const options = item.options.filter(option => {
        if (option.label === 'Unclassified') { missing.push(option); return false; }
        return true;
      });
      return options.length ? [{ ...item, options }] : [];
    }
    if (item.label === 'Unclassified') { missing.push(item); return []; }
    return [item];
  });
  return [...ordinary, ...missing];
}

const optionClassName = (option: FilterSelectOption) => cn(
  option.nested && 'filter-option-nested', option.parent && 'filter-option-parent',
  option.label === 'Unclassified' && 'filter-option-unclassified',
);

function encode(value: string) {
  return value === '' ? EMPTY_SENTINEL : value;
}

function decode(value: string) {
  return value === EMPTY_SENTINEL ? '' : value;
}

export function FilterSelect({
  value,
  onValueChange,
  items,
  ariaLabel,
  id,
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: FilterSelectItem[];
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const orderedItems = orderedFilterItems(items);
  const flat = orderedItems.flatMap(item => (isGroup(item) ? item.options : [item]));
  // Never render an empty trigger: when `value` is empty (or matches an option with an
  // empty label), fall back to the first labelled option (e.g. "All levels", "All types").
  const hasLabel = (option: FilterSelectOption) => (option.triggerLabel ?? option.label).trim() !== '';
  const selected = flat.find(option => option.value === value && hasLabel(option))
    ?? (!value ? flat.find(hasLabel) : undefined);
  const resolvedValue = selected ? selected.value : value;
  const triggerText = (selected ? (selected.triggerLabel ?? selected.label) : value) || flat.find(hasLabel)?.triggerLabel || flat.find(hasLabel)?.label || '';
  // Radix's hidden form select can emit an empty reset value while options mount.
  // That is not an edit when this dropdown has no explicit empty option: keep the
  // displayed default rather than drafting an invisible, different filter value.
  const changeValue = (next: string) => {
    const decoded = decode(next);
    const option = flat.find(item => item.value === decoded);
    const nextValue = option ? decoded : !decoded ? resolvedValue : decoded;
    if (nextValue !== resolvedValue) onValueChange(nextValue);
  };
  return (
    <Select value={encode(resolvedValue)} onValueChange={changeValue} {...(disabled ? { disabled: true } : {})}>
      <SelectTrigger id={id} className={cn('filter-select gap-3', className)} aria-label={ariaLabel}>
        <SelectValue><span className={selected ? optionClassName(selected) : undefined}>{triggerText}</span></SelectValue>
      </SelectTrigger>
      <SelectContent>
        {orderedItems.map((item, idx) =>
          isGroup(item) ? (
            <SelectGroup key={`${item.label}-${idx}`}>
              <SelectLabel>{item.label}</SelectLabel>
              {item.options.map(opt => (
                <SelectItem key={encode(opt.value)} value={encode(opt.value)} className={optionClassName(opt)} {...(opt.disabled ? { disabled: true } : {})}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <SelectItem key={encode(item.value)} value={encode(item.value)} className={optionClassName(item)} {...(item.disabled ? { disabled: true } : {})}>
              {item.label}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}