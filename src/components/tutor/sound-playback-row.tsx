import type { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';

/** Shared sound-detail playback row. The caller owns recording playback; Slower
 * updates the workspace preference supplied by the page, never a separate speed. */
export function SoundPlaybackRow({ children, slow, onSlow }: { children: ReactNode; slow: boolean; onSlow: (slow: boolean) => void }) {
  return <div className="pinyin-player-actions">
    {children}
    <label className="pinyin-slow"><Switch checked={slow} onCheckedChange={onSlow} aria-label="Slower pronunciation" />Slower</label>
  </div>;
}