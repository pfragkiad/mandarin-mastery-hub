import { useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { MeaningText } from './meaning-text';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import type { AudioRequest } from '@/lib/audio';
import { ExamplePronunciation } from './example-pronunciation';
import { HintChar, useLessonHints } from './lesson-hints';
import { alignSentencePinyin, isHanziChar } from '@/lib/sentence-align';
import { alignSentenceEnding } from '@/lib/data-contract';
import { alignSentence } from '@/lib/phrase-pinyin-align';
import { useSyllableInventory } from './use-syllable-inventory';
import { useSentenceWords } from './use-sentence-words';
import { SourceInfo } from './source-info';

/**
 * One recorded example sentence: pinyin line with its speaker, the hanzi line
 * (each known character linked to its record), the translation and, when the source
 * records one, its editorial note (`note`) collapsed behind the card's shared (i)
 * trigger instead of a fourth text line.
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
export function SentenceExample({ sentence, pinyin, translation, note, heading = 'IN A PHRASE', onNavigate, audioRequest, sourceDetails }: { sentence: string; pinyin?: string | undefined; translation?: string; note?: string | null | undefined; heading?: string; onNavigate?: () => void; audioRequest?: AudioRequest; sourceDetails?: ReactNode }) {
  const { preferences } = useWorkspace();
  const hints = useLessonHints();
  // Pairing state: the index of the hovered/focused pair, or null. Both sides
  // (character and syllable) set and clear it, so leaving either removes the border.
  const [hoveredPair, setHoveredPair] = useState<number | null>(null);
  const positional = useMemo(() => (pinyin ? alignSentencePinyin(sentence, pinyin) != null : true), [sentence, pinyin]);
  const syllables = useSyllableInventory(!positional);
  const inventory = useMemo(() => (syllables ? new Set(syllables.map(s => s.base)) : null), [syllables]);
  const pairing = useMemo(() => (pinyin ? alignSentence(sentence, pinyin, inventory) : null), [sentence, pinyin, inventory]);

  // Lesson pages: identified words (words-first, lesson-segments.ts via the hints provider)
  // give each character its popup word and group the hover, so 学生 and xuésheng ring together.
  // Everywhere (lessons and detail cards) the same shared words-first rule groups the hover
  // and, outside lesson hints, sends a word's characters to that word's Vocabulary card.
  const { wordsFor } = useSentenceWords();
  const words = useMemo(() => wordsFor(sentence, false), [wordsFor, sentence]);
  const pairKey = useMemo(() => {
    const keys = new Map<number, number>();
    if (pairing && words) {
      let group = -1; let prev: unknown = null;
      Array.from(sentence).forEach((_, i) => {
        const w = words[i] ?? null;
        if (w && w !== prev) group = Math.min(group, -1) - 1;
        prev = w;
        const pair = pairing.glyphPairs[i];
        if (w && pair != null) keys.set(pair, group);
      });
    }
    return (pair: number) => keys.get(pair) ?? pair;
  }, [pairing, words, sentence]);
  const pairHandlers = (pair: number) => {
    const key = pairKey(pair);
    return {
      onMouseEnter: () => setHoveredPair(key),
      onMouseLeave: () => setHoveredPair(current => (current === key ? null : current)),
      onFocus: () => setHoveredPair(key),
      onBlur: () => setHoveredPair(current => (current === key ? null : current)),
    };
  };
  const pairClass = (pair: number | null | undefined) =>
    pair != null && hoveredPair === pairKey(pair) ? ' sentence-pair-hover' : '';

  // The pinyin line exists only when the reader shows pinyin and the record has one.
  const showPinyinLine = Boolean(preferences.pinyin && pinyin);

  // The source's editorial note stays verbatim (never generated, never trimmed), but it
  // collapses behind the shared (i) trigger in the card's header row — the same treatment
  // sentence sources and spelling notes use — so the card body shows only the sentence.
  const noteInfo = note
    ? <SourceInfo inline className="detail-footnote" label="About this sentence" align="end">{note}</SourceInfo>
    : null;
  // The note's (i) always reads as the pill's companion: it sits immediately left of the
  // Conversational/Written pill, on the pill's own line (the pinyin line when it exists,
  // otherwise the header row that carries the fallback pill).
  const headerNote = showPinyinLine ? null : noteInfo;

  {/* Line order follows the shared sentence pattern: hanzi first, then a row holding
      the pinyin with its speaker and the translation. The row wraps, so the translation
      shares the pinyin line only when it fits; otherwise it takes its own third line. */}
  return <div className="sentence">
    {/* Source details keep their own header row. The style pill (Conversational/Written)
        rides the pinyin line's far right whenever that line exists — the card has the space
        there — and only falls back to this row when there is no pinyin line to carry it;
        the note's (i) falls back with it, staying on the pill's left. */}
    {(sourceDetails || headerNote || (heading && !showPinyinLine)) && <div className="sentence-card-header">
      {sourceDetails}
      {headerNote}
      {heading && !showPinyinLine && <span className="sentence-style-pill">{heading}</span>}
    </div>}
    <div className="sentence-hanzi-row">
    <p className="sentence-hanzi" lang="zh-CN">{Array.from(sentence).map((ch, i) => {
      const pair = pairing?.glyphPairs[i] ?? undefined;
      const pairProps = pair !== undefined ? pairHandlers(pair) : {};
      if (hints) return hints.enabled && isHanziChar(ch)
        ? <HintChar key={i} glyph={ch} word={words[i] ?? null} focusable={false} className={`sentence-char${pairClass(pair)}`} {...pairProps}/>
        : <span key={i} className={pair !== undefined ? `sentence-char-plain${pairClass(pair)}` : undefined} {...pairProps}>{ch}</span>;
      const word = words[i];
      if (word) return <Link key={i} to="/vocabulary" search={word.search} className={`sentence-char${pairClass(pair)}`} title={openDetailsHint(word.hanzi, word.search.tab)} onClick={onNavigate} {...pairProps}>{ch}</Link>;
      const dest = isHanziChar(ch) ? libraryDestination(ch, preferences.includeTraditional) : undefined;
      return dest
        ? <Link key={i} to="/characters" search={dest} className={`sentence-char${pairClass(pair)}`} title={openDetailsHint(ch, dest.tab)} onClick={onNavigate} {...(pair !== undefined ? pairHandlers(pair) : {})}>{ch}</Link>
        : <span key={i} className={pair !== undefined ? `sentence-char-plain${pairClass(pair)}` : undefined} {...(pair !== undefined ? pairHandlers(pair) : {})}>{ch}</span>;
    })}</p>
    </div>
    <span className="sentence-reading">
      {showPinyinLine && <span className="pinyin sentence-pinyin">
        {pairing ? <span>{pairing.tokens.map((t, i) => <span key={i}>
          {i > 0 && ' '}
          {t.leading}
          {t.pieces.map((piece, p) => piece.pair == null ? <span key={p}>{piece.text}</span> : <span key={p} className={`sentence-syllable${pairClass(piece.pair)}`} {...pairHandlers(piece.pair)}>{piece.text}</span>)}
          {t.trailing}
        </span>)}</span> : <span>{pinyin}</span>}
        <ExamplePronunciation request={audioRequest ?? { text: sentence, reading: pinyin ?? null, audio: null }} label={`sentence ${sentence}`}/>
        {/* The note's (i) and the style label are one unit at the line's right edge: the
            (i) first, so it reads as the pill's companion, and the pair wraps together so
            a narrow card never strands the (i) away from the pill it explains. */}
        {(noteInfo || heading) && <span className="sentence-card-tail">
          {noteInfo}
          {heading && <span className="sentence-style-pill">{heading}</span>}
        </span>}
      </span>}
      {/* The translation ends with the pinyin's terminal mark (. ! ?) — display rule
          from alignSentenceEnding; the recorded text is never rewritten. */}
      {translation && <span className="sentence-meaning"><MeaningText text={pinyin ? alignSentenceEnding(pinyin, translation) : translation} sentence/></span>}
    </span>
  </div>;
}
