import type { ReactNode } from 'react';

/** Shared sound-detail heading. Callers provide the exact syllable or tone-group
 * title, contextual description and existing identity pill; no source/readings are
 * inferred here. The same grid keeps long titles clear of the trailing pill. */
export function SoundDetailHeading({ title, description, pill }: { title: ReactNode; description: ReactNode; pill?: ReactNode }) {
  return <header className="sound-detail-heading">
    <div className="pinyin-player-title-row">
      <h2 className="pinyin-player-title pinyin" lang="zh-Latn-pinyin">{title}</h2>
      {pill}
    </div>
    <p className="pinyin-player-tone">{description}</p>
  </header>;
}