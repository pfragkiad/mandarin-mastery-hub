import { useEffect, useState, type ReactNode, type ComponentType } from 'react';
import { Eye, EyeOff, Languages, Volume2, ChevronDown, Pin } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import type { CardReveal } from '@/lib/learning-preferences';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

// A hanzi glyph stands in for an icon so "Hide hanzi" reads as the face it hides.
function HanziIcon({ className }: { className?: string }) {
  return <span aria-hidden className={`inline-flex size-4 shrink-0 items-center justify-center leading-none ${className ?? ''}`}>汉</span>;
}

type OptionIcon = ComponentType<{ className?: string }>;
const OPTIONS: { value: CardReveal; label: string; icon: OptionIcon; shortcut: string }[] = [
  { value: 'all', label: 'Show all', icon: Eye, shortcut: '0' },
  { value: 'meaning', label: 'Hide translation', icon: Languages, shortcut: '1' },
  { value: 'hanzi', label: 'Hide hanzi', icon: HanziIcon, shortcut: '2' },
  { value: 'pinyin', label: 'Hide pronunciation', icon: Volume2, shortcut: '3' },
  { value: 'pinyin-meaning', label: 'Hide pronunciation and translation', icon: EyeOff, shortcut: '4' },
];

/** Shared hidden-face menu and optional remembered-reveal toggle for both libraries. */
export function CardRevealToggle({ study, playOptions }: { study?: boolean; playOptions?: ReactNode } = {}) {
  const { preferences, setPreferences } = useWorkspace();
  const [open, setOpen] = useState(false);
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
  // Phone presentation reuses the exact preferences and shortcut handling above.
  if (study) return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}>Study<ChevronDown/></Button>{current !== 'all' && <span className="mobile-state-chip"><TriggerIcon/>{triggerLabel}</span>}<Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="library-control-sheet" aria-describedby={undefined}><SheetTitle>Study</SheetTitle>{playOptions && <section className="library-study-section"><h3>Play</h3>{playOptions}</section>}<section className="library-study-section"><h3>Hide</h3><div role="group" aria-label="Hidden card faces">{OPTIONS.map(({ value, label, icon: Icon }) => <Button key={value} variant="ghost" aria-pressed={current === value} onClick={() => setPreferences({ ...preferences, cardReveal: value })}><Icon/>{label}</Button>)}</div></section>{current !== 'all' && <label className="library-remember-row">Remember revealed cards<Switch checked={Boolean(preferences.rememberCardReveals)} onCheckedChange={rememberCardReveals => setPreferences({ ...preferences, rememberCardReveals })}/></label>}</SheetContent></Sheet></>;
  return <><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className={`card-visibility-menu ${current !== 'all' ? 'selected' : ''}`} title={selected.label}><TriggerIcon/><span>{triggerLabel}</span><ChevronDown/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start"><DropdownMenuRadioGroup value={current} onValueChange={value => { const option = OPTIONS.find(option => option.value === value); if (option) setPreferences({ ...preferences, cardReveal: option.value }); }}>
      {[...OPTIONS.slice(1), OPTIONS[0]].filter(option => option !== undefined).map(({ value, label, icon: Icon, shortcut }) => <DropdownMenuRadioItem key={value} value={value}><Icon className="mr-2 size-4"/>{value === 'all' ? label : label.replace('Hide ', '')}<span className="ml-auto pl-5 text-xs text-muted-foreground">{shortcut}</span></DropdownMenuRadioItem>)}
    </DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>{current !== 'all' && <Button variant="outline" size="sm" aria-pressed={Boolean(preferences.rememberCardReveals)} title="Remember revealed cards" className={preferences.rememberCardReveals ? 'selected' : ''} onClick={() => setPreferences({ ...preferences, rememberCardReveals: !preferences.rememberCardReveals })}><Pin/>Remember revealed cards</Button>}</>;
}

/** Grid container class for the active reveal mode ('' shows everything). */
export function cardRevealClass(reveal: CardReveal) {
  return reveal === 'all' ? '' : `reveal-hide-${reveal}`;
}
