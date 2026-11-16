import { isPlainCardDoubleClick } from './card-peek';
import { MeaningText } from './meaning-text';
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Volume2, MessageSquareText } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { vocabularyKind, words as vocabularyWords, type Word } from '@/lib/mandarin';
import { phraseParts } from '@/lib/vocabulary-decomposition';
import { matchedWordSpans, phraseTileLines } from '@/lib/phrase-tile-fit';
import { playPronunciation, audioCandidates, audioMessage } from '@/lib/audio';
import { useWorkspace } from './workspace';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { CardTopMeta, DetailRecordActions, RecordCardFooter } from './record-card-footer';
import { TileSpeaker } from './tile-speaker';
import { SoundChartLink } from './sound-chart-link';
import { VocabularyDecomposition } from './vocabulary-decomposition';
import { SentenceExample } from './sentence-example';
import { MoreExamples, SentenceSection, TileExamplesLink } from './sentence-section';
import { RecordDetailTitle } from './record-detail-title';
import { useSideFit } from './use-side-fit';
import { useCardTopRowFit } from './use-card-top-row-fit';
import { useCardFooterFit } from './use-card-footer-fit';
import { usePhrasePairing } from './phrase-pairing';
import { examplePinyin, orderExamples, phraseStyle } from '@/lib/data-contract';

/** Recorded sentence style of a phrase (Conversational / Written) as a card or detail pill.
 *  Input: the phrase's Word. Unclassified phrases render nothing, so no pill implies a style
 *  that was never recorded. */
function PhraseStylePill({ word }: { word: Word }) {
  const style = phraseStyle(word.entry);
  if (style === 'Unclassified') return null;
  return <span className="word-hsk-id phrase-style-pill" title={`${style} style, as recorded with the sentence`}>{style}</span>;
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
  // Phrases pair each heading character with its pinyin syllable on hover (as in "In a sentence").
  // Multi-character words pair the same way; single glyphs have nothing to pair.
  const pairing = usePhrasePairing(word.hanzi, word.pinyin, vocabularyKind(word) === 'phrase' || Array.from(word.hanzi.replace(/\s/g, '')).length > 1);
  const speaker = <Button variant="ghost" size="icon" className={hasRecording ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${word.hanzi}` : `No audio available for ${word.hanzi}`} title={audioAvailable ? `Listen · ${source}` : undefined} onClick={() => listen()}><Volume2/></Button>;
  return <>
    <RecordDetailTitle hanzi={word.hanzi} {...(pairing.paired ? { glyphContent: Array.from(word.hanzi).map(pairing.glyph), pinyinContent: <><span className="pinyin">{pairing.pinyinText}</span>{speaker}</> } : {})} source={<>{word.entry?.sourceName ?? 'Added this session'} · {source}</>} {...(vocabularyKind(word) === 'phrase' && phraseStyle(word.entry) !== 'Unclassified' ? { pill: <PhraseStylePill word={word}/> } : {})} pinyin={word.pinyin} meaning={word.meaning} script={word.script} audio={speaker}/>
    {audioError && <p role="status" className="library-note">{audioError}{canTts && <> <Button variant="link" size="sm" className="h-auto p-0" onClick={() => listen(true)}>Use Browser TTS</Button></>}</p>}
    <dl className="catalog-facts">
      <div><dt>Level</dt><dd className="catalog-record-value">{word.level}{word.hskId != null && <span className="word-hsk-id hsk-level-pill" title={word.entry?.sentenceSource?.hskFromWord ? `HSK 3.0 ID recorded for ${word.entry.sentenceSource.hskFromWord}, the word this sentence comes from` : 'Official ID in the HSK 3.0 syllabus'}>ID {word.hskId}</span>}</dd></div>
      <div><dt>Record</dt><dd className="catalog-record-value">{word.type}</dd></div>
      {word.collection && <div><dt>Collection</dt><dd className="catalog-record-value">{word.collections?.join(' · ') || word.collection}</dd></div>}
    </dl>
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
    <VocabularyDecomposition word={word}/>
    {/* Bottom row: Trace/Recall left, Bookmark alone at the right (the source ⓘ sits beside the title glyph). */}
    <div className="detail-reference-row"><DetailRecordActions practice={{ character: word.hanzi }} hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)} onNavigate={close}/></div>
  </>;
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
  const isPhrase = vocabularyKind(word) === 'phrase';
  const comfortableWord = preferences.libraryView === 'list' && (headword || isPhrase);
  // Every Comfortable card (words, phrases, session additions) uses the labelled action row, bookmark icon at its right end.
  const comfortableView = preferences.libraryView === 'list';
  // Compact phrases share the exact Words/Comfortable top row (type, merged HSK pill, sentence
  // icon) and hide the footer type, so the labels sit in the same place in every view.
  const wordStyleTop = headword || isPhrase;
  const tileFit = wordTileFit(word.hanzi);
  // Phrases: up to 12 glyphs per line, breaking after punctuation or at matched word edges
  // (the same textual word matching as the phrase breakdown); CSS sizes the box from the longest line.
  const phraseLines = useMemo(() => isPhrase ? phraseTileLines(word.hanzi, matchedWordSpans(phraseParts(word, vocabularyWords).map(part => ({ text: part.text, matched: Boolean(part.word) })))) : [], [isPhrase, word]);
  const phraseLongest = Math.max(1, ...phraseLines.map(line => Array.from(line).length));
  // Phrase cards pair each box character with its pinyin syllable on hover; line glyphs are
  // indexed through the whole headword so the pairing survives the box's line breaks.
  const pairing = usePhrasePairing(word.hanzi, word.pinyin, isPhrase || !singleGlyph);
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
  useSideFit(bodyRef, true, [word.hanzi, word.pinyin, word.meaning, preferences.pinyin, preferences.meaning, preferences.font, preferences.libraryView]);
  const hskPill = hskLevel != null || word.hskId != null ? `HSK${hskLevel != null ? ` L${hskLevel}` : ''}${word.hskId != null ? `${hskLevel != null ? '/' : ' '}#${word.hskId}` : ''}` : null;
  // A sentence phrase shows the level and syllabus index recorded for its owning parent word.
  const hskFrom = word.entry?.sentenceSource?.hskFromWord ?? null;
  const hskTitle = hskFrom ? `HSK 3.0 level and ID recorded for ${hskFrom}, the word this sentence comes from` : 'HSK 3.0 level / official ID in the syllabus';
  // Words/Phrases top rows keep one line too: the header font steps down before the row
  // wraps (use-card-top-row-fit.ts). No Radical pill on these cards, so the abbreviation step
  // is switched off and only the font steps apply.
  const rowRef = useRef<HTMLSpanElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  useCardTopRowFit(rowRef, false, [word.id, word.type, word.hskId, hskLevel, word.script, wordStyleTop, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning]);
  // The button row gets its own, independent attempt: a smaller button font before Recall and
  // the bookmark drop to a second line.
  useCardFooterFit(footerRef, [word.id, word.type, word.hskId, hskLevel, word.script, wordStyleTop, comfortableView, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning]);
  return <><article data-entry-id={word.id} className={`word-card ${wordStyleTop ? 'headword-card' : ''} ${comfortableWord ? 'comfortable-word-card' : ''} ${list ? 'word-list-item' : ''} ${word.script === 'Traditional' ? 'is-traditional card-ink' : ''} ${open && panel ? 'is-selected' : ''} ${revealed ? 'is-revealed' : ''}`} onDoubleClick={event => { if (onDetails && isPlainCardDoubleClick(preferences.cardReveal, event.target)) onDetails(); }}>
    {/* Word cards (Compact and Comfortable): the HSK level is already a filter, so the top row reads
        the type, then one "HSK L<level>/#<id>" pill merging the recorded level and official id, with a sentence indicator on the right
        (like the "In a character" icon on glyph cards). Phrases use the same row in both views. */}
    {header !== undefined ? header : <div className="word-card-top"><span className="word-level-wrap" ref={rowRef}>{levelLabel && <span className="word-level">{levelLabel}</span>}{word.type && <CardTopMeta lead={!levelLabel}><span className="card-top-pos">{word.type}</span></CardTopMeta>}{wordStyleTop ? hskPill && <span className="word-hsk-id hsk-level-pill" title={hskTitle}>{hskPill}</span> : word.hskId != null && <span className="word-hsk-id hsk-level-pill" title="Official ID in the HSK 3.0 syllabus">ID {word.hskId}</span>}{word.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}{isPhrase && <PhraseStylePill word={word}/>}</span>{wordStyleTop && word.sentence && <span className="catalog-card-indicators"><span title="In a sentence available"><MessageSquareText className="catalog-source-icon" aria-label="In a sentence available"/></span></span>}</div>}
    <Button ref={bodyRef} variant="ghost" className="word-open" onClick={() => setOpen(true)} aria-label={`Study ${word.hanzi}`}><span className="word-character">{preferences.pinyin && <span className="pinyin"><span className="pinyin-text">{pairing.pinyinText ?? word.pinyin}</span><TileSpeaker available={audioAvailable} hasRecording={hasRecording} label={`Listen to ${word.hanzi}`} unavailableLabel={`No audio available for ${word.hanzi}`} title={`Listen · ${source}`} onActivate={() => { void listen(); }}/>{/* Single-character words read exactly like their glyph, so they get the same
    Sound chart link as Glyphs cards (the link renders only for one attested
    syllable + tone, and honours the "Sound chart links on cards" setting). */}
    {singleGlyph && preferences.soundChartLinks !== false && <SoundChartLink reading={word.pinyin} from={word.hanzi} variant="tile"/>}{!isPhrase && preferences.cardExamplesLinks === true && <TileExamplesLink hanzi={word.hanzi}/>}</span>}{isPhrase ? <span lang="zh-CN" className="word-hanzi-tile phrase-hanzi-tile" style={{ '--tile-per-line': phraseLongest } as CSSProperties}>{phraseLines.map((line, index) => <span key={index} className="word-hanzi-line">{pairing.paired ? Array.from(line).map((ch, i) => pairing.glyph(ch, lineStarts[index]! + i)) : line}</span>)}</span> : <span lang="zh-CN" className={`word-hanzi-tile${tileFit.lines === 2 ? ' is-two-line' : ''}`} style={tileFit.style}>{(() => { const g = (text: string, start: number) => pairing.paired ? Array.from(text).map((ch, i) => pairing.glyph(ch, start + i)) : text; return tileFit.lines === 2 ? <><span className="word-hanzi-line">{g(tileFit.parts[0]!, 0)}</span><span className="word-hanzi-line">{g(tileFit.parts[1]!, Array.from(tileFit.parts[0]!).length)}</span></> : g(word.hanzi, 0); })()}</span>}</span>{preferences.meaning && <span className="word-meaning" title={word.meaning}><MeaningText text={word.meaning}/></span>}</Button>
    <RecordCardFooter footerRef={footerRef} metadata={word.type} hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)} comfortable={comfortableView} onOpen={() => setOpen(true)} {...(onDetails ? { onDetails } : {})}/>
  </article>{!panel && <Dialog open={open} onOpenChange={setOpen}><DialogContent className="word-dialog"><DialogTitle className="sr-only">{word.meaning}</DialogTitle><DialogDescription className="sr-only">{word.hanzi} · {word.pinyin}</DialogDescription><WordDetailContent word={word} onNavigate={() => setOpen(false)} /></DialogContent></Dialog>}</>;
}
