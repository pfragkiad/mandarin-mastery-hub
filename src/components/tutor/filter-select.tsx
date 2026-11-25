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
}

export interface FilterSelectGroup {
  label: string;
  options: FilterSelectOption[];
}

export type FilterSelectItem = FilterSelectOption | FilterSelectGroup;

function isGroup(item: FilterSelectItem): item is FilterSelectGroup {
  return 'options' in item;
}

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
  const flat = items.flatMap(item => (isGroup(item) ? item.options : [item]));
  // Never render an empty trigger: when `value` is empty (or matches an option with an
  // empty label), fall back to the first labelled option (e.g. "All levels", "All types").
  const hasLabel = (option: FilterSelectOption) => (option.triggerLabel ?? option.label).trim() !== '';
  const selected = flat.find(option => option.value === value && hasLabel(option))
    ?? (!value ? flat.find(hasLabel) : undefined);
  const resolvedValue = selected ? selected.value : value;
  const triggerText = (selected ? (selected.triggerLabel ?? selected.label) : value) || flat.find(hasLabel)?.triggerLabel || flat.find(hasLabel)?.label || '';
  return (
    <Select value={encode(resolvedValue)} onValueChange={next => onValueChange(decode(next))} {...(disabled ? { disabled: true } : {})}>
      <SelectTrigger id={id} className={cn('filter-select gap-3', className)} aria-label={ariaLabel}>
        <SelectValue>{triggerText}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item, idx) =>
          isGroup(item) ? (
            <SelectGroup key={`${item.label}-${idx}`}>
              <SelectLabel>{item.label}</SelectLabel>
              {item.options.map(opt => (
                <SelectItem key={encode(opt.value)} value={encode(opt.value)} {...(opt.disabled ? { disabled: true } : {})}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <SelectItem key={encode(item.value)} value={encode(item.value)} {...(item.disabled ? { disabled: true } : {})}>
              {item.label}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}