import type { CSSProperties, ReactNode } from 'react';
import type { CharacterScript } from '@/lib/learning-preferences';

/** Shared heading for every detail column: pinyin above the characters, English
 *  meaning below. Stacking keeps a long phrase from squeezing the translation
 *  into a one-letter-wide column, and the glyph scales down to fit the panel so
 *  a full sentence still reads on one line. */
export function RecordDetailTitle({ hanzi, pinyin, meaning, script, audio, pinyinFallback = 'Pinyin not recorded', meaningFallback = 'No English meaning recorded yet' }: {
  hanzi: string;
  pinyin?: string | null;
  meaning?: string | null;
  script?: CharacterScript | undefined;
  audio?: ReactNode;
  pinyinFallback?: string;
  meaningFallback?: string;
}) {
  const traditional = script === 'Traditional';
  const headStyle = { '--detail-chars': String(hanzi.length || 1) } as CSSProperties;
  return <div className="catalog-detail-title">
    <div className="catalog-detail-head" style={headStyle}>
      <span className="pinyin">{pinyin || pinyinFallback}</span>
      <strong lang="zh-CN" className={traditional ? 'traditional-character' : ''}>{hanzi}</strong>
      <h2>{meaning || meaningFallback}</h2>
      {traditional && <span className="traditional-label">Traditional</span>}
    </div>
    {audio}
  </div>;
}
