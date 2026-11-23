import { isLastShownFace, nextFaceView, type Face, type FaceView } from '@/lib/face-view';

/**
 * The one Hanzi · Pinyin · EN button row (on = shown) used wherever a learner hides study
 * faces: the lesson sidebar and phone Settings sheet, and the Glyphs/Vocabulary tools row and
 * phone Study sheet. Inputs: the current `view`, `onChange` with the next view, an accessible
 * group `label`, and `size` ('toolbar' matches the height of the grid's outline buttons).
 * Each surface keeps its own saved choice; only the control and its rules are shared.
 * The last shown face cannot be switched off (nextFaceView), so a page never goes blank; its
 * button stays focusable and says why in its title.
 */
const FACES: { key: Face; mark: string; label: string; name: string }[] = [
  { key: 'hanzi', mark: '汉', label: 'Hanzi', name: 'hanzi' },
  { key: 'pinyin', mark: 'pīn', label: 'Pinyin', name: 'pinyin' },
  { key: 'translations', mark: '', label: 'EN', name: 'translation' },
];

export function FaceToggles({ view, onChange, label, size = 'panel' }: { view: FaceView; onChange: (next: FaceView) => void; label: string; size?: 'panel' | 'toolbar' }) {
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
