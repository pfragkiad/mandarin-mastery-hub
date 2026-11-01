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
      <dl className="space-y-2 text-xs">
        {shortcuts.map(([keys, action]) => <div key={keys} className="flex items-center justify-between gap-4"><dt className="font-mono text-muted-foreground">{keys}</dt><dd>{action}</dd></div>)}
      </dl>
    </PopoverContent>
  </Popover>;
}