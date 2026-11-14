import type { CSSProperties, ReactNode } from 'react';
import type { CharacterScript } from '@/lib/learning-preferences';
import { MeaningText } from './meaning-text';
import { SourceInfo } from './source-info';

/** Shared heading for every detail column: pinyin above the characters, English
 *  meaning below. Stacking keeps a long phrase from squeezing the translation
 *  into a one-letter-wide column, and the glyph scales down to fit the panel so
 *  a full sentence still reads on one line. */
export function RecordDetailTitle({ hanzi, pinyin, meaning, script, audio, chartLink, pinyinContent, meaningContent, pinyinFallback = 'Pinyin not recorded', meaningFallback = 'No English meaning recorded yet', forms, formSwitch, glyphClassName = '', pill, source }: {
  /** Practice-style form switch (RadicalForms layout="switch") shown on its own row below the
   *  meaning, while the single hanzi above shows the selected form. Radical detail cards use it. */
  formSwitch?: ReactNode;
  /** Identity ink for the single hanzi (e.g. card-ink-radical for a radical form's gold). */
  glyphClassName?: string;
  /** Record source note (e.g. "Unicode Unihan 17.0.0 readings and meanings."), shown behind an ⓘ
   *  right beside the main glyph (or the form tiles), replacing the old bottom "… REFERENCE" label. */
  source?: ReactNode;
  /** Replaces the pinyin text + single speaker, e.g. one speaker per reading (MultiReadingSpeakers). */
  pinyinContent?: ReactNode;
  /** Replaces the single meaning line, e.g. one meaning per reading (了 le / liǎo). */
  meaningContent?: ReactNode;
  /** Identity pill (e.g. Radical #N) pinned to the top right of the pinyin row, as in Practice. */
  pill?: ReactNode;
  /** Radical family tiles: when given they replace the single hanzi, sitting between pinyin and meaning (as in Practice). */
  forms?: ReactNode;
  hanzi: string;
  pinyin?: string | null;
  meaning?: string | null;
  script?: CharacterScript | undefined;
  audio?: ReactNode;
  /** Sound chart link (SoundChartLink) placed just after the speaker, single readings only. */
  chartLink?: ReactNode;
  pinyinFallback?: string;
  meaningFallback?: string;
}) {
  const traditional = script === 'Traditional';
  const headStyle = { '--detail-chars': String(hanzi.length || 1) } as CSSProperties;
   return <div className="catalog-detail-title">
    <div className="catalog-detail-head" style={headStyle}>
      <div className="catalog-detail-pinyin-row">
        {pinyinContent ?? <><span className="pinyin">{pinyin || pinyinFallback}</span>{audio}{chartLink}</>}
        {/* All header pills share one right-aligned group so Traditional sits tight against the kind pill. */}
        {(traditional || pill) && <span className="catalog-detail-pills">
          {traditional && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
          {pill && <span className="catalog-detail-pill">{pill}</span>}
        </span>}
      </div>
      {/* Glyph row: the main hanzi (or form tiles) with the record's source ⓘ beside it. */}
      <div className="catalog-detail-glyph-row">
        {forms ?? <strong lang="zh-CN" className={[traditional ? 'traditional-character' : '', glyphClassName].filter(Boolean).join(' ') || undefined}>{hanzi}</strong>}
        {source && <SourceInfo inline className="detail-footnote">{source}</SourceInfo>}
      </div>
      {meaningContent ?? <h2><MeaningText text={meaning || meaningFallback}/></h2>}
    </div>
    {/* Kept outside the head so the head's large-glyph sizing never reaches the switch tiles. */}
    {formSwitch && <div className="catalog-detail-forms">{formSwitch}</div>}
   </div>;
}
