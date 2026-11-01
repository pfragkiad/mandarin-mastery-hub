import { Eye, EyeOff, Languages, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import type { CardReveal } from '@/lib/learning-preferences';

const OPTIONS: { value: CardReveal; label: string; icon: typeof Eye }[] = [
  { value: 'all', label: 'Show all', icon: Eye },
  { value: 'meaning', label: 'Hide translation', icon: Languages },
  { value: 'hanzi', label: 'Hide hanzi', icon: EyeOff },
  { value: 'pinyin', label: 'Hide pinyin & audio', icon: Volume2 },
];

/** Quick self-test toggle above the card grids: hide one card face at a time. */
export function CardRevealToggle() {
  const { preferences, setPreferences } = useWorkspace();
  const current = preferences.cardReveal;
  return (
    <div className="card-reveal-toggle" role="group" aria-label="Card display">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          aria-pressed={current === value}
          className={current === value ? 'selected' : ''}
          title={label}
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
