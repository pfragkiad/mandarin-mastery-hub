import { isPlainCardDoubleClick } from './card-peek';
import { MeaningText } from './meaning-text';
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Volume2, Quote } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { vocabularyKind, wordCollections, words as vocabularyWords, type Word } from '@/lib/mandarin';
import { phraseParts, wordCharacters } from '@/lib/vocabulary-decomposition';
import { wordEtymologyRequests } from './word-etymology';
import { matchedWordSpans, phraseTileLines } from '@/lib/phrase-tile-fit';
import { playPronunciation, audioCandidates, audioMessage } from '@/lib/audio';
import { useWorkspace } from './workspace';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { CardTopMeta, DetailRecordActions, RecordCardFooter } from './record-card-footer';
import { TileSpeaker } from './tile-speaker';
import { SoundChartLink } from './sound-chart-link';
import { VocabularyDecomposition, VocabularyDecompositionInfo } from './vocabulary-decomposition';
import { GlyphDetailTabs } from './detail-tabs';
import { WordLessonIndicator, WordLessonsSection, wordLessonCount } from './lesson-links';
import { SentenceExample } from './sentence-example';
import { MoreExamples, SentenceHints, SentenceSection, TileExamplesLink } from './sentence-section';
import { HintChar, useLessonHints, type HintWord } from './lesson-hints';
import { isHanziChar } from '@/lib/sentence-align';
import { RecordDetailTitle } from './record-detail-title';
import { WordIdentityPills, wordHskPill } from './word-identity-pills';
import { wordInk, wordRadicalNumber } from '@/lib/card-ink';
import { useSideFit } from './use-side-fit';
import { useSenseTrim } from './use-sense-trim';
import { useCardTopRowFit } from './use-card-top-row-fit';
import { useCardFooterFit } from './use-card-footer-fit';
import { usePhrasePairing } from './phrase-pairing';
import { examplePinyin, orderExamples, phraseStyle } from '@/lib/data-contract';

/**
 * Detail heading glyphs of a multi-character word or phrase.
 * Inputs: the record and its character ↔ syllable `pairing` (usePhrasePairing).
 * Hover keeps the per-character pairing ring; with the remembered "Character hints" switch
 * on, each Han character is also a quick-card target (the same popup as lessons and
 * "In a sentence"), so a tap reaches that character's Characters/Components/Radicals cards.
 * Word context: a word's characters sit in that exact record (shown unlinked, it is the open
 * card); a phrase's characters get the words-first words it contains, never itself.
 * Hints off: the plain pairing glyphs, unchanged.
 */
function HeadwordGlyphs({ word, pairing }: { word: Word; pairing: ReturnType<typeof usePhrasePairing> }) {
  const hints = useLessonHints();
  const phrase = vocabularyKind(word) === 'phrase' || vocabularyKind(word) === 'idiom';
  const chars = Array.from(word.hanzi);
  const own: HintWord = { hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, search: { tab: vocabularyKind(word), word: word.id }, audio: word.audio ?? null };
  const contexts = useMemo(() => (hints?.enabled && phrase ? hints.wordsFor(word.hanzi, false, word.hanzi) : null), [hints, phrase, word.hanzi]);
  // shows this word (unlinked, the open card) plus the Character/Component/Radical rows.
  if (!phrase && chars.length === 1) return hints?.enabled && isHanziChar(word.hanzi) ? <HintChar glyph={word.hanzi} word={own}/> : <>{word.hanzi}</>;
  if (!hints?.enabled) return <>{chars.map(pairing.glyph)}</>;
  return <>{chars.map((ch, i) => isHanziChar(ch)
    ? <HintChar key={i} glyph={ch} word={phrase ? contexts?.[i] ?? null : own} {...pairing.glyphProps(i)}/>
    : pairing.glyph(ch, i))}</>;
}

/**
 * Grid card headword glyphs with the grids' Character hints (gridHints, provider in the
 * Vocabulary results): each Han character becomes a quick-card target — not a tab stop, since
 * it sits inside the card's own button — with the same word context as the detail headword
 * (a word's characters in that exact record, a phrase's characters in the words-first words
 * it contains). Hints off or outside a provider (Start page cards): the plain pairing glyphs.
 */
function useCardHintGlyph(word: Word, pairing: ReturnType<typeof usePhrasePairing>) {
  const hints = useLessonHints();
  const phrase = vocabularyKind(word) === 'phrase' || vocabularyKind(word) === 'idiom';
  const contexts = useMemo(() => (hints?.enabled && phrase ? hints.wordsFor(word.hanzi, false, word.hanzi) : null), [hints, phrase, word.hanzi]);
  const own: HintWord = { hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, search: { tab: vocabularyKind(word), word: word.id }, audio: word.audio ?? null };
  return (ch: string, index: number): ReactNode => hints?.enabled && isHanziChar(ch)
    ? <HintChar key={index} glyph={ch} word={phrase ? contexts?.[index] ?? null : own} focusable={false} {...pairing.glyphProps(index)}/>
    : pairing.glyph(ch, index);
}

/** Full word detail, shared by the floating dialog (mobile) and the side panel (desktop).
 *  Mirrors the catalog-detail structure used on the Characters page so both side
 *  columns read the same way. */
export function WordDetailContent({ word, onNavigate }: { word: Word; onNavigate?: () => void }) {
  const [audioError, setAudioError] = useState<string | null>(null);
  const [canTts, setCanTts] = useState(false);
  const request = { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null };
  const source = audioCandidates(request)[0]?.label ?? 'Browser TTS';
  const hasRecording = audioCandidates(request).some(c => c.kind === 'recording');
  const audioAvailable = usePronunciationAvailability(hasRecording, word.pinyin);
  const { saved, toggleSaved, preferences } = useWorkspace();
  const bookmarked = saved.includes(word.id);
  const listen = async (preferTts = false) => { const r = await playPronunciation(request, preferences.slow, preferTts); setAudioError(audioMessage(r)); setCanTts(!r.ok && r.canUseTts); };
  const close = onNavigate ?? (() => {});
  // Etymology is inherited from the word's own characters (exact Characters:<glyph> requests);
  // a one-character word asks exactly like that character's card, so both show the same notes.
  const etymology = useMemo(() => {
    if (vocabularyKind(word) !== 'word') return null;
    // Every word lists its characters under headings, as its Decomposition does — even a
    // one-character word (百) and a repeated one (爸爸, listed once).
    const requests = wordEtymologyRequests(wordCharacters(word).map(part => part.text));
    return requests.length ? requests : null;
  }, [word]);
  // Same pills as the grid card's top row (word-identity-pills.tsx): merged HSK L<level>/#<id>,
  // gold Radical #N, phrase style; Traditional comes from the title's own `script` pill.
  const hskPill = wordHskPill(word);
  const idiom = word.idiomMeta;
  const hasPills = hskPill !== null || idiom != null || wordRadicalNumber(word.hanzi) !== undefined || (vocabularyKind(word) === 'phrase' && phraseStyle(word.entry) !== 'Unclassified');
  const topics = wordCollections(word).filter(Boolean);
  // Phrases pair each heading character with its pinyin syllable on hover (as in "In a sentence").
  // Multi-character words pair the same way; single glyphs have nothing to pair.
  const pairing = usePhrasePairing(word.hanzi, word.pinyin, vocabularyKind(word) === 'phrase' || vocabularyKind(word) === 'idiom' || Array.from(word.hanzi.replace(/\s/g, '')).length > 1);
  const speaker = <Button variant="ghost" size="icon" className={hasRecording ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${word.hanzi}` : `No audio available for ${word.hanzi}`} title={audioAvailable ? `Listen · ${source}` : undefined} onClick={() => listen()}><Volume2/></Button>;
  // Every heading is a hint target: multi-character headings per character, one-character
  // words as a whole, so 八 reaches its Character/Component/Radical cards in one tap.
  const headwordHints = true;
  // One hints provider for the whole card: the heading and "In a sentence" share one popup.
  return <SentenceHints backLabel={word.hanzi}>
    <RecordDetailTitle hanzi={word.hanzi} {...(headwordHints ? { glyphContent: <HeadwordGlyphs word={word} pairing={pairing}/> } : {})} {...(pairing.paired ? { pinyinContent: <><span className="pinyin">{pairing.pinyinText}</span>{speaker}</> } : {})} source={<>{idiom?.source ?? word.entry?.sourceName ?? 'Added this session'} · {source}</>} {...(hasPills ? { pill: <WordIdentityPills word={word} traditional={false}/> } : {})}{...(wordInk(word) === 'card-ink-radical' ? { glyphClassName: 'card-ink-radical' } : {})} pinyin={word.pinyin} meaning={word.meaning} script={word.script} audio={speaker}/>
    {audioError && <p role="status" className="library-note">{audioError}{canTts && <> <Button variant="link" size="sm" className="h-auto p-0" onClick={() => listen(true)}>Use Browser TTS</Button></>}</p>}
    {/* Facts use the grid's and filters' names: the HSK level lives in the top-right pill, so the
        row reads Part of speech and Topic(s); only records without an HSK pill keep a Level fact. */}
    {(word.type || topics.length > 0 || (!hskPill && word.level) || idiom) && <dl className="catalog-facts">
      {idiom && <div><dt>Frequency rank</dt><dd className="catalog-record-value">#{idiom.rank.toLocaleString()}</dd></div>}
      {idiom?.traditional && <div><dt>Traditional</dt><dd className="catalog-record-value" lang="zh-Hant">{idiom.traditional}</dd></div>}
      {idiom?.score != null && <div><dt>Frequency score</dt><dd className="catalog-record-value">{idiom.score}</dd></div>}
      {!hskPill && !idiom && word.level && <div><dt>Level</dt><dd className="catalog-record-value">{word.level}</dd></div>}
      {word.type && <div><dt>Part of speech</dt><dd className="catalog-record-value">{word.type}</dd></div>}
      {topics.length > 0 && <div><dt>{topics.length > 1 ? 'Topics' : 'Topic'}</dt><dd className="catalog-record-value">{topics.join(' · ')}</dd></div>}
    </dl>}
    {word.entry?.studyMetadata?.posNote && <p className="library-note">{word.entry.studyMetadata.posNote}</p>}
    {/* Words always show "In a sentence" (with "Find more examples"), even with no recorded
        sentence; a phrase is itself a sentence, so it shows the section only when one is recorded. */}
    {(word.sentence || vocabularyKind(word) === 'word') && <SentenceSection hanzi={word.hanzi}>
      {/* The first conversational example is always visible (orderExamples, stable);
          further ones open from the show-more arrow. Each keeps its own exact audio and note. */}
      {word.entry?.examples.length ? <MoreExamples key={word.id} examples={orderExamples(word.entry.examples).map(example => <div className="glyph-usage-example" key={example.id}>
        <SentenceExample heading={example.style === 'conversational' ? 'Conversational' : example.style === 'written' ? 'Written' : ''} sentence={example.simplified} pinyin={examplePinyin(example)} translation={example.english} note={example.notes} onNavigate={close} audioRequest={{ text: example.simplified, reading: examplePinyin(example), audio: example.audio ?? null }}/>
      </div>)}/> : word.sentence && <div className="glyph-usage-example"><SentenceExample heading="" sentence={word.sentence} pinyin={word.sentencePinyin} translation={word.translation} onNavigate={close} audioRequest={{ text: word.sentence, reading: word.sentencePinyin ?? null, audio: null }} /></div>}
    </SentenceSection>}
    {/* Course lessons that teach this exact HSK word (recorded entry number, never spelling). */}
    <WordLessonsSection word={word}/>
    {/* Same collapsed Decomposition | Etymology drawer as the character cards (detail-tabs.tsx),
        sharing the remembered open choice. Words inherit etymology from their characters
        (one headed block per unique character, like the Decomposition list); phrases have none. */}
    <GlyphDetailTabs cardKey={`word-${word.id}`} etymology={etymology}
      decomposition={{ info: <VocabularyDecompositionInfo word={word}/>, body: <VocabularyDecomposition word={word} bare/> }}/>
    {/* Bottom row: Trace/Recall left, Bookmark alone at the right (the source ⓘ sits beside the title glyph). */}
    <div className="detail-reference-row"><DetailRecordActions practice={{ character: word.hanzi }} hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)} onNavigate={close}/></div>
  </SentenceHints>;
}

/**
 * Fits a Comfortable word headword inside the fixed-height (82px) hanzi box:
 * up to 4 characters stay on one line, shrinking as the count grows; longer words
 * split evenly over two lines with a smaller size so they never need a third line.
 * Returns CSS variables only (read by `.word-hanzi-tile` in Comfortable word cards),
 * so Compact and Phrase cards ignore them.
 */
export function wordTileFit(hanzi: string): { lines: 1 | 2; style: CSSProperties; parts: string[] } {
  const glyphs = Array.from(hanzi.replace(/\s/g, ''));
  const count = glyphs.length;
  const maxInner = 160; // widest box content, leaving room for the pinyin/translation column
  if (count <= 4) {
    // 60px = the glyph cards' Comfortable tile size, so one- and two-character words match them.
    const size = count <= 2 ? 60 : Math.min(60, Math.floor(maxInner / count));
    return { lines: 1, style: { '--tile-size': `${size}px`, '--tile-per-line': count } as CSSProperties, parts: [hanzi] };
  }
  const perLine = Math.ceil(count / 2);
  const size = Math.min(32, Math.floor(maxInner / perLine));
  // Explicit balanced split, top-heavy (5 → 3+2, 7 → 4+3): CSS text-wrap: balance alone
  // puts the shorter line first (2+3), which reads as an orphan at the top.
  const parts = [glyphs.slice(0, perLine).join(''), glyphs.slice(perLine).join('')];
  return { lines: 2, style: { '--tile-size': `${size}px`, '--tile-per-line': perLine } as CSSProperties, parts };
}

// `revealed` marks a card peeked in a Hide mode; in panel mode clicks never open the panel —
// the page's onOpenChange reveals only, and `onDetails` is the sole way into the detail sheet.
// `header` (Start's random cards only) replaces the top label row (type, HSK pill, sentence icon)
// with the caller's own row (section link + shuffle); body and footer stay the exact grid card.
export function WordCard({ word, list = false, initiallyOpen = false, open: controlledOpen, onOpenChange, panel = false, revealed = false, onDetails, header }: { word: Word; list?: boolean; initiallyOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; panel?: boolean; revealed?: boolean; onDetails?: () => void; header?: ReactNode }) {
  const [internalOpen, setInternalOpen] = useState(initiallyOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const request = { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null };
  const source = audioCandidates(request)[0]?.label ?? 'Browser TTS';
  const hasRecording = audioCandidates(request).some(c => c.kind === 'recording');
  const audioAvailable = usePronunciationAvailability(hasRecording, word.pinyin);
  const { saved, toggleSaved, preferences } = useWorkspace();
  const bookmarked = saved.includes(word.id);
  const listen = async () => { await playPronunciation(request, preferences.slow); };
  // Word and phrase cards use the same top-row labels in Compact and Comfortable;
  // only the Comfortable class changes the layout around them.
  const headword = vocabularyKind(word) === 'word';
  const singleGlyph = Array.from(word.hanzi.replace(/\s/g, '')).length === 1;
  const isPhrase = vocabularyKind(word) === 'phrase' || vocabularyKind(word) === 'idiom';
  const comfortableWord = preferences.libraryView === 'list' && (headword || isPhrase);
  // Every Comfortable card (words, phrases, session additions) uses the labelled action row, bookmark icon at its right end.
  const comfortableView = preferences.libraryView === 'list';
  // Compact phrases share the exact Words/Comfortable top row (type, merged HSK pill, sentence
  // icon) and hide the footer type, so the labels sit in the same place in every view.
  const wordStyleTop = headword || isPhrase;
  // A book joins the top-right icons when a course lesson teaches this exact HSK word.
  const hasLessons = wordLessonCount(word) > 0;
  const tileFit = wordTileFit(word.hanzi);
  // Phrases: up to 12 glyphs per line, breaking after punctuation or at matched word edges
  // (the same textual word matching as the phrase breakdown); CSS sizes the box from the longest line.
  const phraseLines = useMemo(() => isPhrase ? phraseTileLines(word.hanzi, matchedWordSpans(phraseParts(word, vocabularyWords).map(part => ({ text: part.text, matched: Boolean(part.word) })))) : [], [isPhrase, word]);
  const phraseLongest = Math.max(1, ...phraseLines.map(line => Array.from(line).length));
  // Phrase cards pair each box character with its pinyin syllable on hover; line glyphs are
  // indexed through the whole headword so the pairing survives the box's line breaks.
  const pairing = usePhrasePairing(word.hanzi, word.pinyin, isPhrase || !singleGlyph);
  const cardGlyph = useCardHintGlyph(word, pairing);
  const hintsOn = Boolean(useLessonHints()?.enabled);
  const lineStarts = phraseLines.reduce<number[]>((starts, line, i) => [...starts, i === 0 ? 0 : starts[i - 1]! + Array.from(phraseLines[i - 1]!).length], []);
  // Recorded HSK level and official id only; either part is omitted when not supplied.
  const hskLevel = word.entry?.hskLevel ?? null;
  // The Words/Phrases tab already names the kind, so word and phrase cards carry no
  // WORD/PHRASE label; only session additions (neither kind) keep their level label.
  const levelLabel = wordStyleTop ? '' : word.level.toUpperCase();
  // Every Words/Phrases card (Compact and Comfortable) puts pinyin+audio and the translation beside
  // the hanzi box when both fit uncut; otherwise useSideFit marks the body data-stacked and CSS
  // stacks box / pinyin+audio / translation, as on glyph cards.
  const bodyRef = useRef<HTMLButtonElement>(null);
  // Before stacking, the pinyin and translation may shrink a few pixels; and once any card of a
  // grid row stacks, the whole row stacks so neighbouring cards never mix layouts.
  // A translation that overflows the card's line limit (two lines clamped in the Compact grid,
  // three in Comfortable) drops its last semicolon senses on the card only; the first always stays.
  const cardMeaning = useSenseTrim(bodyRef, word.meaning);
  useSideFit(bodyRef, true, [word.hanzi, word.pinyin, word.meaning, preferences.pinyin, preferences.meaning, preferences.font, preferences.libraryView], { shrinkText: true, rowSync: true });
  // The HSK, Radical, Traditional and phrase-style pills come from WordIdentityPills, shared with the detail card.
  // One-character words that are sourced radicals (八, 门) share their Characters card's gold
  // ink and Radical #N pill (card-ink.ts wordInk/wordRadicalNumber, the one central rule).
  const ink = wordInk(word);
  const radicalNumber = wordRadicalNumber(word.hanzi);
  // Words/Phrases top rows keep one line too: the header font steps down before the row
  // wraps (use-card-top-row-fit.ts). Only words with a Radical pill allow its abbreviation
  // step; the rest use the font steps alone.
  const rowRef = useRef<HTMLSpanElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  useCardTopRowFit(rowRef, radicalNumber !== undefined, [word.id, word.type, word.hskId, hskLevel, word.script, wordStyleTop, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning]);
  // The button row gets its own, independent attempt: a smaller button font before Recall and
  // the bookmark drop to a second line.
  useCardFooterFit(footerRef, [word.id, word.type, word.hskId, hskLevel, word.script, wordStyleTop, comfortableView, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning]);
  return <><article data-entry-id={word.id} className={`word-card ${wordStyleTop ? 'headword-card' : ''} ${comfortableWord ? 'comfortable-word-card' : ''} ${list ? 'word-list-item' : ''} ${ink ? `${ink} card-ink` : ''} ${open && panel ? 'is-selected' : ''} ${revealed ? 'is-revealed' : ''}`} onDoubleClick={event => { if (onDetails && isPlainCardDoubleClick(preferences.cardReveal, event.target)) onDetails(); }}>
    {/* Word cards (Compact and Comfortable): the HSK level is already a filter, so the top row reads
        the type, then one "HSK L<level>/#<id>" pill merging the recorded level and official id, with a sentence indicator on the right
        (like the "In a character" icon on glyph cards). Phrases use the same row in both views. */}
    {header !== undefined ? header : <div className="word-card-top"><span className="word-level-wrap" ref={rowRef}>{levelLabel && <span className="word-level">{levelLabel}</span>}{word.type && <CardTopMeta lead={!levelLabel}><span className="card-top-pos">{word.type}</span></CardTopMeta>}<WordIdentityPills word={word}/></span>{wordStyleTop && (word.sentence || hasLessons) && <span className="catalog-card-indicators">{hasLessons && <WordLessonIndicator word={word}/>}{word.sentence && <span title="In a sentence available"><Quote className="catalog-source-icon" aria-label="In a sentence available"/></span>}</span>}</div>}
    <Button ref={bodyRef} variant="ghost" className="word-open" onClick={() => setOpen(true)} aria-label={`Study ${word.hanzi}`}><span className="word-character">{preferences.pinyin && <span className="pinyin"><span className="pinyin-text">{pairing.pinyinText ?? word.pinyin}</span><TileSpeaker available={audioAvailable} hasRecording={hasRecording} label={`Listen to ${word.hanzi}`} unavailableLabel={`No audio available for ${word.hanzi}`} title={`Listen · ${source}`} onActivate={() => { void listen(); }}/>{/* Single-character words read exactly like their glyph, so they get the same
    Sound chart link as Glyphs cards (the link renders only for one attested
    syllable + tone, and honours the "Sound chart links on cards" setting). */}
    {singleGlyph && preferences.soundChartLinks !== false && <SoundChartLink reading={word.pinyin} from={word.hanzi} variant="tile"/>}{!isPhrase && preferences.cardExamplesLinks === true && <TileExamplesLink hanzi={word.hanzi}/>}</span>}{isPhrase ? <span lang="zh-CN" className="word-hanzi-tile phrase-hanzi-tile" style={{ '--tile-per-line': phraseLongest } as CSSProperties}>{phraseLines.map((line, index) => <span key={index} className="word-hanzi-line">{pairing.paired || hintsOn ? Array.from(line).map((ch, i) => cardGlyph(ch, lineStarts[index]! + i)) : line}</span>)}</span> : <span lang="zh-CN" className={`word-hanzi-tile${tileFit.lines === 2 ? ' is-two-line' : ''}`} style={tileFit.style}>{(() => { const g = (text: string, start: number) => pairing.paired || hintsOn ? Array.from(text).map((ch, i) => cardGlyph(ch, start + i)) : text; return tileFit.lines === 2 ? <><span className="word-hanzi-line">{g(tileFit.parts[0]!, 0)}</span><span className="word-hanzi-line">{g(tileFit.parts[1]!, Array.from(tileFit.parts[0]!).length)}</span></> : g(word.hanzi, 0); })()}</span>}</span>{preferences.meaning && <span className="word-meaning" title={word.meaning}><MeaningText text={cardMeaning}/></span>}</Button>
    <RecordCardFooter footerRef={footerRef} metadata={word.type} hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)} comfortable={comfortableView} onOpen={() => setOpen(true)} {...(onDetails ? { onDetails } : {})}/>
  </article>{!panel && <Dialog open={open} onOpenChange={setOpen}><DialogContent className="word-dialog"><DialogTitle className="sr-only">{word.meaning}</DialogTitle><DialogDescription className="sr-only">{word.hanzi} · {word.pinyin}</DialogDescription><WordDetailContent word={word} onNavigate={() => setOpen(false)} /></DialogContent></Dialog>}</>;
}
