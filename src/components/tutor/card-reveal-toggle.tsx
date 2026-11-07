import { useEffect } from 'react';
import { Eye, EyeOff, Languages, Volume2, ChevronDown, Pin } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import type { CardReveal } from '@/lib/learning-preferences';

const OPTIONS: { value: CardReveal; label: string; icon: typeof Eye; shortcut: string }[] = [
  { value: 'all', label: 'Show all', icon: Eye, shortcut: '0' },
  { value: 'meaning', label: 'Hide translation', icon: Languages, shortcut: '1' },
  { value: 'hanzi', label: 'Hide hanzi', icon: EyeOff, shortcut: '2' },
  { value: 'pinyin', label: 'Hide pronunciation', icon: Volume2, shortcut: '3' },
  { value: 'pinyin-meaning', label: 'Hide pronunciation and translation', icon: EyeOff, shortcut: '4' },
];

/** Shared hidden-face menu and optional remembered-reveal toggle for both libraries. */
export function CardRevealToggle() {
  const { preferences, setPreferences } = useWorkspace();
  const current = preferences.cardReveal;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const option = OPTIONS.find(o => o.shortcut === event.key);
      if (option) setPreferences({ ...preferences, cardReveal: option.value });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preferences, setPreferences]);

  // The button names the currently hidden face so the selection stays visible
  // without opening the menu; "Hide" is the neutral label when nothing is hidden.
  const selected = OPTIONS.find(option => option.value === current) ?? { value: 'all', label: 'Show all', icon: Eye, shortcut: '0' };
  const TriggerIcon = current === 'all' ? EyeOff : selected.icon;
  // Hidden modes read as a state ("Hanzi hidden"); 'all' falls back to the plain "Hide" action label.
  const triggerLabel = current === 'all' ? 'Hide' : `${selected.label.replace(/^Hide /, '').replace(/^./, c => c.toUpperCase())} hidden`;
  return <><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className={current !== 'all' ? 'selected' : ''} title={selected.label}><TriggerIcon/>{triggerLabel}<ChevronDown/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start"><DropdownMenuRadioGroup value={current} onValueChange={value => { const option = OPTIONS.find(option => option.value === value); if (option) setPreferences({ ...preferences, cardReveal: option.value }); }}>
      {[...OPTIONS.slice(1), OPTIONS[0]].filter(option => option !== undefined).map(({ value, label, icon: Icon, shortcut }) => <DropdownMenuRadioItem key={value} value={value}><Icon className="mr-2 size-4"/>{value === 'all' ? label : label.replace('Hide ', '')}<span className="ml-auto pl-5 text-xs text-muted-foreground">{shortcut}</span></DropdownMenuRadioItem>)}
    </DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>{current !== 'all' && <Button variant="outline" size="sm" aria-pressed={Boolean(preferences.rememberCardReveals)} title="Remember revealed cards" className={preferences.rememberCardReveals ? 'selected' : ''} onClick={() => setPreferences({ ...preferences, rememberCardReveals: !preferences.rememberCardReveals })}><Pin/>Remember revealed cards</Button>}</>;
}

/** Grid container class for the active reveal mode ('' shows everything). */
export function cardRevealClass(reveal: CardReveal) {
  return reveal === 'all' ? '' : `reveal-hide-${reveal}`;
}
