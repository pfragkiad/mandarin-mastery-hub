import { Switch } from '@/components/ui/switch';
import { isLastShownFace, nextFaceView, type Face, type FaceView } from '@/lib/face-view';

/**
 * The one Hanzi · Pinyin · EN button row (on = shown) used wherever a learner hides study
 * faces: the lesson sidebar and phone Settings sheet, and the Glyphs/Vocabulary tools row and
 * phone Study sheet. Inputs: the current `view`, `onChange` with the next view, an accessible
 * group `label`, and `size`: 'toolbar' (the grid tools row, the lesson sidebar and the phone
 * bottom sheets — one look, sized per Compact/Comfortable like the row's outline buttons) or
 * 'sheet' (legacy full width with 42px touch targets, kept for any sheet that wants it).
 * Each surface keeps its own saved choice; only the control and its rules are shared.
 * The last shown face cannot be switched off (nextFaceView), so a page never goes blank; its
 * button stays focusable and says why in its title.
 */
const FACES: { key: Face; mark: string; label: string; name: string }[] = [
  { key: 'hanzi', mark: '汉', label: 'Hanzi', name: 'hanzi' },
  { key: 'pinyin', mark: 'pīn', label: 'Pinyin', name: 'pinyin' },
  { key: 'translations', mark: '', label: 'EN', name: 'translation' },
];

export function FaceToggles({ view, onChange, label, size = 'sheet' }: { view: FaceView; onChange: (next: FaceView) => void; label: string; size?: 'sheet' | 'toolbar' }) {
  return <div className={`face-toggles is-${size}`} role="group" aria-label={label}>
    {FACES.map(f => {
      const locked = isLastShownFace(view, f.key);
      return <button key={f.key} type="button" className="face-toggle" aria-pressed={view[f.key]} aria-disabled={locked || undefined}
        title={locked ? `Keep at least one shown` : view[f.key] ? `Hide ${f.name}` : `Show ${f.name}`}
        onClick={() => { const next = nextFaceView(view, f.key); if (next !== view) onChange(next); }}>
        {f.mark && <span className="face-toggle-mark" lang={f.key === 'hanzi' ? 'zh-CN' : undefined} aria-hidden="true">{f.mark}</span>}{f.label}
      </button>;
    })}
  </div>;
}

/**
 * The one Glyph quick cards switch (hover ring + click quick card on any glyph form), beside
 * FaceToggles in lessons and the grids. Inputs: `checked`, `onChange`, `size`: 'toolbar'
 * (switch + one-line label, no frame — the grid tools row and the lesson sidebar share it)
 * or 'sheet' (a phone sheet row: label left, switch right, as in the other sheet rows).
 * Each surface keeps its own saved switch (lessons `lessonHints`, grids `gridHints`).
 * "Glyph", not "character": the ring also lands on components and radicals, which are not
 * characters. The label names the payoff (a quick card opens), not the gesture, because the
 * switch also decides whether a tapped glyph reveals its other records (character / component / radical).
 */
export function CharacterHintsToggle({ checked, onChange, size = 'toolbar' }: { checked: boolean; onChange: (on: boolean) => void; size?: 'sheet' | 'toolbar' }) {
  const control = <Switch checked={checked} onCheckedChange={onChange} aria-label="Glyph quick cards"/>;
  return <label className={`lesson-hints-toggle is-${size}`} title="Hover a glyph for a ring; click or tap it for a quick card with its reading, meaning and other records">
    {size === 'toolbar' && control}<strong>Glyph quick cards</strong>{size === 'sheet' && control}
  </label>;
}
