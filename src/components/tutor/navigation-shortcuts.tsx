import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Shared keyboard help beside navigation. Context chooses page or record keys;
 * the popover owns only its open state and never changes a library selection. */
export function NavigationShortcuts({ context }: { context: 'pages' | 'records' }) {
  const shortcuts = context === 'pages'
    ? [['← / →', 'Previous / next page'], ['PageUp / PageDown', 'Back / forward 10 pages'], ['Home / End', 'First / last page']]
    : [['← / →', 'Previous / next record'], ['Esc', 'Close']];
  return <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" title="Keyboard shortcuts"><Keyboard className="size-4"/></Button>
    </PopoverTrigger>
    <PopoverContent align="start" aria-label="Keyboard shortcuts" onKeyDown={event => event.stopPropagation()}>
      <p className="mb-3 text-sm font-semibold">{context === 'pages' ? 'Page navigation' : 'Record navigation'}</p>
      {/* Two-column grid keeps every key label and description in fixed columns,
          so wrapped rows stay vertically aligned instead of drifting apart. */}
      <dl className="grid grid-cols-[minmax(7.5rem,auto)_1fr] gap-x-5 gap-y-2 text-xs">
        {shortcuts.map(([keys, action]) => <Fragment key={keys}><dt className="whitespace-nowrap font-mono text-muted-foreground">{keys}</dt><dd className="self-center">{action}</dd></div>)}
      </dl>
    </PopoverContent>
  </Popover>;
}
