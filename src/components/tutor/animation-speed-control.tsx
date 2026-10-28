import { Button } from '@/components/ui/button';
import { SPEEDS, speedLabel } from '@/lib/practice-speed';

// Animation speed as three grouped buttons (0.25× · 0.5× · 1×) instead of a slider,
// so the choice is one click and the active speed is always visible.
export function AnimationSpeedControl({ speed, onChange }: { speed: number; onChange: (speed: number) => void }) {
  return (
    <span className="writer-speed">
      <span className="writer-speed-label">Animation speed</span>
      <span className="writer-speed-options" role="group" aria-label="Animation speed">
        {SPEEDS.map(option => (
          <Button
            key={option}
            variant="ghost"
            size="sm"
            type="button"
            className={speed === option ? 'active' : ''}
            aria-pressed={speed === option}
            title={`Play at ${speedLabel(option)}`}
            onClick={() => onChange(option)}
          >
            {speedLabel(option)}
          </Button>
        ))}
      </span>
    </span>
  );
}
