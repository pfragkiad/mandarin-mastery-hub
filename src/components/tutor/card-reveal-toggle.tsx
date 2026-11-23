import { useEffect, useState, type ReactNode } from 'react';
import { EyeOff, ChevronDown, Pin, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import type { CardReveal } from '@/lib/learning-preferences';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { faceViewToReveal, revealToFaceView, type FaceView } from '@/lib/face-view';
import { CharacterHintsToggle, FaceToggles } from './face-toggles';

/**
 * Glyphs/Vocabulary hidden-face controls: the shared Hanzi · Pinyin · EN buttons (FaceToggles,
 * the same row lessons use) writing the grids' own saved `cardReveal`, plus the optional
 * "Remember revealed cards" toggle in any hidden mode. Phones get the same buttons inside the
 * Study sheet and a chip outside naming the state; its X restores Show all.
 * Shortcuts (outside text fields): 0 shows all; 1 / 2 / 3 flip translation / hanzi / pinyin
 * like their buttons; 4 / 5 / 6 jump to hanzi only / translation only / pinyin only.
 */
const CHIPS: Record<CardReveal, string> = {
  all: 'Show all', meaning: 'Translation hidden', hanzi: 'Hanzi hidden', pinyin: 'Pinyin hidden',
  'pinyin-meaning': 'Hanzi only', 'hanzi-pinyin': 'Translation only', 'hanzi-meaning': 'Pinyin only',
};
const FLIP_KEYS: Record<string, keyof FaceView> = { '1': 'translations', '2': 'hanzi', '3': 'pinyin' };
const JUMP_KEYS: Record<string, CardReveal> = { '0': 'all', '4': 'pinyin-meaning', '5': 'hanzi-pinyin', '6': 'hanzi-meaning' };

/** Shared hidden-face buttons and optional remembered-reveal toggle for both libraries. */
export function CardRevealToggle({ study, playOptions }: { study?: boolean; playOptions?: ReactNode } = {}) {
  const { preferences, setPreferences } = useWorkspace();
  const [open, setOpen] = useState(false);
  const current = preferences.cardReveal;
  const view = revealToFaceView(current);
  const setView = (next: FaceView) => { const reveal = faceViewToReveal(next); if (reveal) setPreferences({ ...preferences, cardReveal: reveal }); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      const jump = JUMP_KEYS[event.key];
      if (jump) { setPreferences({ ...preferences, cardReveal: jump }); return; }
      const face = FLIP_KEYS[event.key];
      if (!face) return;
      const now = revealToFaceView(preferences.cardReveal);
      const reveal = faceViewToReveal({ ...now, [face]: !now[face] });
      if (reveal) setPreferences({ ...preferences, cardReveal: reveal });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preferences, setPreferences]);

  const chip = CHIPS[current] ?? CHIPS.all;
  const toggles = (size: 'panel' | 'toolbar') => <FaceToggles view={view} onChange={setView} label="Show on cards" size={size}/>;
  // The grids' own Character hints switch (gridHints, absent = off), beside the face buttons as in lessons.
  const hints = (size: 'panel' | 'toolbar') => <CharacterHintsToggle checked={preferences.gridHints === true} onChange={gridHints => setPreferences({ ...preferences, gridHints })} size={size}/>;
  if (study) return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}><GraduationCap/>Study<ChevronDown/></Button>{current !== 'all' && <Button variant="ghost" size="sm" className="mobile-state-chip" aria-label={`${chip} — show all`} title="Show all" onClick={() => setPreferences({ ...preferences, cardReveal: 'all' })}><EyeOff/>{chip}<X/></Button>}<Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="library-control-sheet" aria-describedby={undefined}><SheetTitle>Study</SheetTitle>{playOptions && <section className="library-study-section"><h3>Play</h3>{playOptions}</section>}<section className="library-study-section"><h3>Show</h3>{toggles('panel')}{hints('panel')}</section>{current !== 'all' && <label className="library-remember-row">Remember revealed cards<Switch checked={Boolean(preferences.rememberCardReveals)} onCheckedChange={rememberCardReveals => setPreferences({ ...preferences, rememberCardReveals })}/></label>}</SheetContent></Sheet></>;
  return <>{toggles('toolbar')}{hints('toolbar')}{current !== 'all' && <Button variant="outline" size="sm" aria-pressed={Boolean(preferences.rememberCardReveals)} title="Remember revealed cards" className={preferences.rememberCardReveals ? 'selected' : ''} onClick={() => setPreferences({ ...preferences, rememberCardReveals: !preferences.rememberCardReveals })}><Pin/>Remember revealed cards</Button>}</>;
}

/** Grid container class for the active reveal mode ('' shows everything). */
export function cardRevealClass(reveal: CardReveal) {
  return reveal === 'all' ? '' : `reveal-hide-${reveal}`;
}
