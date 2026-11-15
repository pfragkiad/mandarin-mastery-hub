import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useMeaningPlacement } from './use-meaning-placement';
import type { CharacterScript } from '@/lib/learning-preferences';
import { MeaningText } from './meaning-text';
import { SourceInfo } from './source-info';

/** Shared heading for every detail column: the main hanzi first (identity pills at its top
 *  right), then the pinyin line, then the English meaning. Stacking keeps a long phrase from squeezing the translation
 *  into a one-letter-wide column, and the glyph scales down to fit the panel so
 *  a full sentence still reads on one line. */
export function RecordDetailTitle({ hanzi, glyphContent, pinyin, meaning, script, audio, chartLink, pinyinContent, meaningContent, readingsInMeaning = false, pinyinFallback = 'Pinyin not recorded', meaningFallback = 'No English meaning recorded yet', forms, formSwitch, glyphClassName = '', pill, source }: {
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
  /** The meaningContent already labels each reading with its own speaker (ReadingMeanings
   *  `speaker`), so the separate pinyin line is omitted rather than repeating the readings. */
  readingsInMeaning?: boolean;
  /** Identity pill (e.g. Radical #N) pinned to the top right of the heading, beside the main hanzi. */
  pill?: ReactNode;
  /** Radical family tiles: when given they replace the single hanzi, sitting between pinyin and meaning (as in Practice). */
  forms?: ReactNode;
  hanzi: string;
  /** Replaces the plain hanzi text inside the main glyph (e.g. phrase characters wrapped for hover pairing). */
  glyphContent?: ReactNode;
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
  const rowRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLSpanElement>(null);
  const meaningRef = useRef<HTMLHeadingElement>(null);
  const placement = useMeaningPlacement(rowRef, readingRef, meaningRef, meaning || meaningFallback);
  const headStyle = { '--detail-chars': String(hanzi.length || 1) } as CSSProperties;
   return <div className="catalog-detail-title">
    <div className="catalog-detail-head" style={headStyle}>
      {/* Glyph row: the main hanzi (or form tiles) with the record's source ⓘ beside it and the
          identity pills pushed to the far right, so they keep the heading's top-right corner. */}
      <div className="catalog-detail-glyph-row">
        {forms ?? <strong lang="zh-CN" className={[traditional ? 'traditional-character' : '', glyphClassName].filter(Boolean).join(' ') || undefined}>{glyphContent ?? hanzi}</strong>}
        {source && <SourceInfo inline className="detail-footnote">{source}</SourceInfo>}
        {/* All header pills share one right-aligned group so Traditional sits tight against the kind pill. */}
        {(traditional || pill) && <span className="catalog-detail-pills">
          {traditional && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
          {pill && <span className="catalog-detail-pill">{pill}</span>}
        </span>}
      </div>
      {!readingsInMeaning && <div ref={rowRef} className="catalog-detail-pinyin-row" data-meaning={meaningContent ? undefined : placement}>
        {/* Pinyin and its audio controls form one unbreakable unit, so a speaker never wraps away from its reading. */}
        <span ref={readingRef} className="catalog-detail-reading">{pinyinContent ?? <><span className="pinyin">{pinyin || pinyinFallback}</span>{audio}{chartLink}</>}</span>
        {/* Translation beside the pinyin when it fits, whole on the next line when it fits a full
            line, otherwise flowing on and wrapping underneath (useMeaningPlacement). */}
        {!meaningContent && <h2 ref={meaningRef}><MeaningText text={meaning || meaningFallback}/></h2>}
      </div>}
      {(meaningContent || readingsInMeaning) && (meaningContent ?? <h2><MeaningText text={meaning || meaningFallback}/></h2>)}
    </div>
    {/* Kept outside the head so the head's large-glyph sizing never reaches the switch tiles. */}
    {formSwitch && <div className="catalog-detail-forms">{formSwitch}</div>}
   </div>;
}
