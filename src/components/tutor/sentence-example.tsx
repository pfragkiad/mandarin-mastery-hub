import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { MeaningText } from './meaning-text';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import type { AudioRequest } from '@/lib/audio';
import { ExamplePronunciation } from './example-pronunciation';
import { HintChar, useLessonHints } from './lesson-hints';
import { alignSentencePinyin, isHanziChar } from '@/lib/sentence-align';
import { alignSentence } from '@/lib/phrase-pinyin-align';
import { useSyllableInventory } from './use-syllable-inventory';

/**
 * One recorded example sentence: pinyin line with its speaker, the hanzi line
 * (each known character linked to its record), the translation and, when the source
 * records one, its editorial note (`note`).
 *
 * Cross-highlight: hovering (or keyboard-focusing) a hanzi character or a pinyin
 * syllable draws a small border around its counterpart, using alignSentence: one
 * pinyin token per character pairs by position; word-by-word pinyin ("Běijīng") is
 * split at syllable edges against the Sound chart inventory, which is fetched only
 * for such sentences. The pairing is presentation only and fails closed — on any
 * count mismatch or ambiguous split the sentence renders plain, with no pairing.
 *
 * On a lesson page (LessonHintsProvider) characters become lesson hint targets instead of
 * links while hints are on, and plain text while they are off; pairing works either way.
 */
export function SentenceExample({ sentence, pinyin, translation, note, heading = 'IN A SENTENCE', onNavigate, audioRequest }: { sentence: string; pinyin?: string | undefined; translation?: string; note?: string | null | undefined; heading?: string; onNavigate?: () => void; audioRequest?: AudioRequest }) {
  const { preferences } = useWorkspace();
  const hints = useLessonHints();
  // Pairing state: the index of the hovered/focused pair, or null. Both sides
  // (character and syllable) set and clear it, so leaving either removes the border.
  const [hoveredPair, setHoveredPair] = useState<number | null>(null);
  const positional = useMemo(() => (pinyin ? alignSentencePinyin(sentence, pinyin) != null : true), [sentence, pinyin]);
  const syllables = useSyllableInventory(!positional);
  const inventory = useMemo(() => (syllables ? new Set(syllables.map(s => s.base)) : null), [syllables]);
  const pairing = useMemo(() => (pinyin ? alignSentence(sentence, pinyin, inventory) : null), [sentence, pinyin, inventory]);

  const pairHandlers = (pair: number) => ({
    onMouseEnter: () => setHoveredPair(pair),
    onMouseLeave: () => setHoveredPair(current => (current === pair ? null : current)),
    onFocus: () => setHoveredPair(pair),
    onBlur: () => setHoveredPair(current => (current === pair ? null : current)),
  });
  const pairClass = (pair: number | null | undefined) =>
    pair != null && hoveredPair === pair ? ' sentence-pair-hover' : '';

  {/* Line order follows the shared sentence pattern: hanzi first, then a row holding
      the pinyin with its speaker and the translation. The row wraps, so the translation
      shares the pinyin line only when it fits; otherwise it takes its own third line. */}
  return <div className="sentence">
    {/* The style label (Conversational/Written) is a pill on the hanzi line's right,
        not an eyebrow above it, so the sentence block stays hanzi → pinyin → translation. */}
    <div className="sentence-hanzi-row">
    <p className="sentence-hanzi" lang="zh-CN">{Array.from(sentence).map((ch, i) => {
      const pair = pairing?.glyphPairs[i] ?? undefined;
      const pairProps = pair !== undefined ? pairHandlers(pair) : {};
      if (hints) return hints.enabled && isHanziChar(ch)
        ? <HintChar key={i} glyph={ch} focusable={false} className={`sentence-char${pairClass(pair)}`} {...pairProps}/>
        : <span key={i} className={pair !== undefined ? `sentence-char-plain${pairClass(pair)}` : undefined} {...pairProps}>{ch}</span>;
      const dest = isHanziChar(ch) ? libraryDestination(ch, preferences.includeTraditional) : undefined;
      return dest
        ? <Link key={i} to="/characters" search={dest} className={`sentence-char${pairClass(pair)}`} title={openDetailsHint(ch, dest.tab)} onClick={onNavigate} {...(pair !== undefined ? pairHandlers(pair) : {})}>{ch}</Link>
        : <span key={i} className={pair !== undefined ? `sentence-char-plain${pairClass(pair)}` : undefined} {...(pair !== undefined ? pairHandlers(pair) : {})}>{ch}</span>;
    })}</p>
    {heading && <span className="sentence-style-pill">{heading}</span>}
    </div>
    <span className="sentence-reading">
      {preferences.pinyin && pinyin && <span className="pinyin sentence-pinyin">
        {pairing ? <span>{pairing.tokens.map((t, i) => <span key={i}>
          {i > 0 && ' '}
          {t.leading}
          {t.pieces.map((piece, p) => piece.pair == null ? <span key={p}>{piece.text}</span> : <span key={p} className={`sentence-syllable${pairClass(piece.pair)}`} {...pairHandlers(piece.pair)}>{piece.text}</span>)}
          {t.trailing}
        </span>)}</span> : <span>{pinyin}</span>}
        <ExamplePronunciation request={audioRequest ?? { text: sentence, reading: pinyin ?? null, audio: null }} label={`sentence ${sentence}`}/>
      </span>}
      {translation && <span className="sentence-meaning"><MeaningText text={translation} sentence/></span>}
    </span>
    {/* The source's editorial note for this sentence, shown exactly as recorded (never
        generated). A div, not a span/p, so the translation keeps its own styling rules. */}
    {note && <div className="sentence-note"><span className="sentence-note-label">Note</span>{note}</div>}
  </div>;
}
