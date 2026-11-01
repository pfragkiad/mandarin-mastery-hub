import { useEffect } from 'react';
import { Eye, EyeOff, Languages, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import type { CardReveal } from '@/lib/learning-preferences';

const OPTIONS: { value: CardReveal; label: string; icon: typeof Eye; shortcut: string }[] = [
  { value: 'all', label: 'Show all', icon: Eye, shortcut: '0' },
  { value: 'meaning', label: 'Hide translation', icon: Languages, shortcut: '1' },
  { value: 'hanzi', label: 'Hide hanzi', icon: EyeOff, shortcut: '2' },
  { value: 'pinyin', label: 'Hide pronunciation', icon: Volume2, shortcut: '3' },
];

/** Quick self-test toggle above the card grids: hide one card face at a time. */
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

  return (
    <div className="card-reveal-toggle" role="group" aria-label="Card display">
      {OPTIONS.map(({ value, label, icon: Icon, shortcut }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          aria-pressed={current === value}
          className={current === value ? 'selected' : ''}
          title={`${label} (${shortcut})`}
          onClick={() => setPreferences({ ...preferences, cardReveal: value })}
        >
          <Icon />
          {label}
        </Button>
      ))}
    </div>
  );
}

/** Grid container class for the active reveal mode ('' shows everything). */
export function cardRevealClass(reveal: CardReveal) {
  return reveal === 'all' ? '' : `reveal-hide-${reveal}`;
}
