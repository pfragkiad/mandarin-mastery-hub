import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { MeaningText } from './meaning-text';
import { MessageSquareText } from 'lucide-react';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import type { AudioRequest } from '@/lib/audio';
import { ExamplePronunciation } from './example-pronunciation';
import { alignSentencePinyin, isHanziChar, splitPinyinTokens } from '@/lib/sentence-align';

/**
 * One recorded example sentence: pinyin line with its speaker, the hanzi line
 * (each known character linked to its record) and the translation.
 *
 * Cross-highlight: hovering (or keyboard-focusing) a hanzi character or a pinyin
 * syllable draws a small border around its counterpart, using the positional
 * pairing from alignSentencePinyin. The pairing is presentation only and fails
 * closed — when the recorded pinyin token count does not match the hanzi count,
 * the sentence renders exactly as before with no pairing.
 */
export function SentenceExample({ sentence, pinyin, translation, heading = 'IN A SENTENCE', onNavigate, audioRequest }: { sentence: string; pinyin?: string | undefined; translation?: string; heading?: string; onNavigate?: () => void; audioRequest?: AudioRequest }) {
  const { preferences } = useWorkspace();
  // Pairing state: the index of the hovered/focused pair, or null. Both sides
  // (character and syllable) set and clear it, so leaving either removes the border.
  const [hoveredPair, setHoveredPair] = useState<number | null>(null);
  const pairs = useMemo(() => (pinyin ? alignSentencePinyin(sentence, pinyin) : null), [sentence, pinyin]);
  const tokens = useMemo(() => (pairs && pinyin ? splitPinyinTokens(pinyin) : null), [pairs, pinyin]);
  const pairByChar = useMemo(() => {
    const map = new Map<number, number>();
    pairs?.forEach((p, i) => map.set(p.charIndex, i));
    return map;
  }, [pairs]);

  const pairHandlers = (pair: number) => ({
    onMouseEnter: () => setHoveredPair(pair),
    onMouseLeave: () => setHoveredPair(current => (current === pair ? null : current)),
    onFocus: () => setHoveredPair(pair),
    onBlur: () => setHoveredPair(current => (current === pair ? null : current)),
  });
  const pairClass = (pair: number | undefined) =>
    pair !== undefined && hoveredPair === pair ? ' sentence-pair-hover' : '';

  return <div className="sentence">
    {heading && <span className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>{heading}</span>}
    {preferences.pinyin && pinyin && <span className="pinyin sentence-pinyin">
      {tokens ? <span>{tokens.map((t, i) => <span key={i}>
        {i > 0 && ' '}
        {t.leading}
        <span className={`sentence-syllable${pairClass(i)}`} {...pairHandlers(i)}>{t.syllable}</span>
        {t.trailing}
      </span>)}</span> : <span>{pinyin}</span>}
      <ExamplePronunciation request={audioRequest ?? { text: sentence, reading: pinyin ?? null, audio: null }} label={`sentence ${sentence}`}/>
    </span>}
    <p className="sentence-hanzi" lang="zh-CN">{Array.from(sentence).map((ch, i) => {
      const pair = pairByChar.get(i);
      const dest = isHanziChar(ch) ? libraryDestination(ch, preferences.includeTraditional) : undefined;
      return dest
        ? <Link key={i} to="/characters" search={dest} className={`sentence-char${pairClass(pair)}`} title={openDetailsHint(ch, dest.tab)} onClick={onNavigate} {...(pair !== undefined ? pairHandlers(pair) : {})}>{ch}</Link>
        : <span key={i} className={pair !== undefined ? `sentence-char-plain${pairClass(pair)}` : undefined} {...(pair !== undefined ? pairHandlers(pair) : {})}>{ch}</span>;
    })}</p>
    {translation && <span className="sentence-meaning"><MeaningText text={translation} sentence/></span>}
  </div>;
}
