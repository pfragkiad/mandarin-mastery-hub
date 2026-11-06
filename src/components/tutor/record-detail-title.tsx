import type { CSSProperties, ReactNode } from 'react';
import type { CharacterScript } from '@/lib/learning-preferences';
import { MeaningText } from './meaning-text';

/** Shared heading for every detail column: pinyin above the characters, English
 *  meaning below. Stacking keeps a long phrase from squeezing the translation
 *  into a one-letter-wide column, and the glyph scales down to fit the panel so
 *  a full sentence still reads on one line. */
export function RecordDetailTitle({ hanzi, pinyin, meaning, script, audio, pinyinFallback = 'Pinyin not recorded', meaningFallback = 'No English meaning recorded yet', forms }: {
  /** Radical family tiles: when given they replace the single hanzi, sitting between pinyin and meaning (as in Practice). */
  forms?: ReactNode;
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
      <div className="catalog-detail-pinyin-row">
        <span className="pinyin">{pinyin || pinyinFallback}</span>
        {audio}
        {traditional && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
      </div>
      {forms ?? <strong lang="zh-CN" className={traditional ? 'traditional-character' : ''}>{hanzi}</strong>}
      <h2><MeaningText text={meaning || meaningFallback}/></h2>
    </div>
   </div>;
}
