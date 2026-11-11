import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';

/**
 * Character style picker: three 永 buttons, each drawn in the face it selects
 * (Handwritten kai, Clean sans, Print song), so the choice previews itself.
 * Reads and writes the saved `preferences.font` through the workspace; it holds
 * no state of its own. Used in Settings → Reading & display (the topbar no
 * longer carries it); the per-face fonts come from .font-toggle [data-font] CSS.
 */
const STYLES = [
  { font: 'Handwritten', data: 'handwritten', label: 'Handwritten characters' },
  { font: 'Sans', data: 'sans', label: 'Clean sans characters' },
  { font: 'Print', data: 'print', label: 'Print (song) characters' },
] as const;

export function CharacterStyleToggle({ id }: { id?: string }) {
  const { preferences, setPreferences } = useWorkspace();
  return <div id={id} className="font-toggle" role="group" aria-label="Character style">{STYLES.map(s =>
    <Button key={s.font} variant="ghost" type="button" className={preferences.font === s.font ? 'active' : ''} data-font={s.data} aria-pressed={preferences.font === s.font} aria-label={s.label} title={s.label} onClick={() => setPreferences({ ...preferences, font: s.font })}>永</Button>)}
  </div>;
}
