import { isPlainCardDoubleClick } from './card-peek';
import { SourceInfo } from '@/components/tutor/source-info';
import { MeaningText } from './meaning-text';
import { useMemo, useState, type CSSProperties } from 'react';
import { Bookmark, Volume2, Check, MessageSquareText } from 'lucide-react';
import { PracticeIcon } from './practice-icons';
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
import { CardTopMeta, DetailRecordActions, RecordCardFooter, TileBookmark } from './record-card-footer';
import { TileSpeaker } from './tile-speaker';
import { SoundChartLink } from './sound-chart-link';
import { VocabularyDecomposition } from './vocabulary-decomposition';
import { SentenceExample } from './sentence-example';
import { RecordDetailTitle } from './record-detail-title';

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
  return <>
    <RecordDetailTitle hanzi={word.hanzi} pinyin={word.pinyin} meaning={word.meaning} script={word.script} audio={<Button variant="ghost" size="icon" className={hasRecording ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${word.hanzi}` : `No audio available for ${word.hanzi}`} title={audioAvailable ? `Listen · ${source}` : undefined} onClick={() => listen()}><Volume2/></Button>}/>
    {audioError && <p role="status" className="library-note">{audioError}{canTts && <> <Button variant="link" size="sm" className="h-auto p-0" onClick={() => listen(true)}>Use Browser TTS</Button></>}</p>}
    <dl className="catalog-facts">
      <div><dt>Level</dt><dd className="catalog-record-value">{word.level}{word.hskId != null && <span className="word-hsk-id" title="Official ID in the HSK 3.0 syllabus">ID {word.hskId}</span>}</dd></div>
      <div><dt>Record</dt><dd className="catalog-record-value">{word.type}</dd></div>
      {word.collection && <div><dt>Collection</dt><dd className="catalog-record-value">{word.collection}</dd></div>}
    </dl>
    {word.sentence && <SentenceExample sentence={word.sentence} pinyin={word.sentencePinyin} translation={word.translation} onNavigate={close} audioRequest={{ text: word.sentence, reading: word.sentencePinyin ?? null, audio: word.entry?.examples[0]?.audio ?? null }} />}
    <VocabularyDecomposition word={word}/>
    {/* Reference label and the record actions share the bottom row: label left, actions right. */}
    <div className="detail-reference-row"><div className="eyebrow detail-reference-label">{vocabularyKind(word) === 'phrase' ? 'PHRASE REFERENCE' : 'WORD REFERENCE'}<SourceInfo inline className="detail-footnote">{word.entry?.sourceName ?? 'Added this session'} · {source}</SourceInfo></div><DetailRecordActions practice={{ character: word.hanzi }} hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)} onNavigate={close}/></div>
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
    const size = count <= 2 ? 64 : Math.min(64, Math.floor(maxInner / count));
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
export function WordCard({ word, list = false, initiallyOpen = false, open: controlledOpen, onOpenChange, panel = false, revealed = false, onDetails }: { word: Word; list?: boolean; initiallyOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; panel?: boolean; revealed?: boolean; onDetails?: () => void }) {
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
  // Word (not phrase) cards use the same top-row labels in Compact and Comfortable;
  // only the Comfortable class changes the layout around them.
  const headword = vocabularyKind(word) === 'word';
  const singleGlyph = Array.from(word.hanzi.replace(/\s/g, '')).length === 1;
  const isPhrase = vocabularyKind(word) === 'phrase';
  // Comfortable phrases share the Words top row (type, merged HSK pill, sentence icon)
  // and the 2×2 action block; only their stacked pinyin/box/translation body differs.
  const comfortablePhrase = preferences.libraryView === 'list' && isPhrase;
  const comfortableWord = preferences.libraryView === 'list' && (headword || isPhrase);
  // Every Comfortable card (words, phrases, session additions) uses the labelled action row + face bookmark.
  const comfortableView = preferences.libraryView === 'list';
  const wordStyleTop = headword || comfortablePhrase;
  const tileFit = wordTileFit(word.hanzi);
  // Phrases: up to 12 glyphs per line, breaking after punctuation or at matched word edges
  // (the same textual word matching as the phrase breakdown); CSS sizes the box from the longest line.
  const phraseLines = useMemo(() => isPhrase ? phraseTileLines(word.hanzi, matchedWordSpans(phraseParts(word, vocabularyWords).map(part => ({ text: part.text, matched: Boolean(part.word) })))) : [], [isPhrase, word]);
  const phraseLongest = Math.max(1, ...phraseLines.map(line => Array.from(line).length));
  // Recorded HSK level and official id only; either part is omitted when not supplied.
  const hskLevel = word.entry?.hskLevel ?? null;
  // The Words/Phrases tab already names the kind, so word and Comfortable phrase cards carry no
  // WORD/PHRASE label; Compact phrases keep their recorded level label.
  const levelLabel = wordStyleTop ? '' : word.level.toUpperCase();
  const hskPill = hskLevel != null || word.hskId != null ? `HSK${hskLevel != null ? ` L${hskLevel}` : ''}${word.hskId != null ? `${hskLevel != null ? '/' : ' '}#${word.hskId}` : ''}` : null;
  return <><article data-entry-id={word.id} className={`word-card ${headword ? 'headword-card' : ''} ${comfortableWord ? 'comfortable-word-card' : ''} ${list ? 'word-list-item' : ''} ${word.script === 'Traditional' ? 'is-traditional card-ink' : ''} ${open && panel ? 'is-selected' : ''} ${revealed ? 'is-revealed' : ''}`} onDoubleClick={event => { if (onDetails && isPlainCardDoubleClick(preferences.cardReveal, event.target)) onDetails(); }}>
    {/* Word cards (Compact and Comfortable): the HSK level is already a filter, so the top row reads
        the type, then one "HSK L<level>/#<id>" pill merging the recorded level and official id, with a sentence indicator on the right
        (like the "In a character" icon on glyph cards). Comfortable phrases use the same row;
        Compact phrases keep the level and their footer type. */}
    <div className="word-card-top"><span className="word-level-wrap">{levelLabel && <span className="word-level">{levelLabel}</span>}{word.type && <CardTopMeta lead={!levelLabel}><span className="card-top-pos">{word.type}</span></CardTopMeta>}{wordStyleTop ? hskPill && <span className="word-hsk-id" title="HSK 3.0 level / official ID in the syllabus">{hskPill}</span> : word.hskId != null && <span className="word-hsk-id" title="Official ID in the HSK 3.0 syllabus">ID {word.hskId}</span>}{word.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}</span>{wordStyleTop && word.sentence && <span className="catalog-card-indicators"><span title="In a sentence available"><MessageSquareText className="catalog-source-icon" aria-label="In a sentence available"/></span></span>}</div>
    <Button variant="ghost" className="word-open" onClick={() => setOpen(true)} aria-label={`Study ${word.hanzi}`}><span className="word-character">{preferences.pinyin && <span className="pinyin"><span className="pinyin-text">{word.pinyin}</span><TileSpeaker available={audioAvailable} hasRecording={hasRecording} label={`Listen to ${word.hanzi}`} unavailableLabel={`No audio available for ${word.hanzi}`} title={`Listen · ${source}`} onActivate={() => { void listen(); }}/>{/* Single-character words read exactly like their glyph, so they get the same
    Sound chart link as Glyphs cards (the link renders only for one attested
    syllable + tone, and honours the "Sound chart links on cards" setting). */}
    {singleGlyph && preferences.soundChartLinks !== false && <SoundChartLink reading={word.pinyin} from={word.hanzi} variant="tile"/>}</span>}{isPhrase ? <span lang="zh-CN" className="word-hanzi-tile phrase-hanzi-tile" style={{ '--tile-per-line': phraseLongest } as CSSProperties}>{phraseLines.map((line, index) => <span key={index} className="word-hanzi-line">{line}</span>)}</span> : <span lang="zh-CN" className={`word-hanzi-tile${tileFit.lines === 2 ? ' is-two-line' : ''}`} style={tileFit.style}>{tileFit.lines === 2 ? <><span className="word-hanzi-line">{tileFit.parts[0]}</span><span className="word-hanzi-line">{tileFit.parts[1]}</span></> : word.hanzi}</span>}</span>{preferences.meaning && <span className="word-meaning" title={word.meaning}><MeaningText text={word.meaning}/></span>}{/* Comfortable: Save at the far right of the pinyin line (CSS places it). */}{comfortableView && <TileBookmark hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)}/>}</Button>
    <RecordCardFooter metadata={word.type} hanzi={word.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(word.id)} comfortable={comfortableView} onOpen={() => setOpen(true)} {...(onDetails ? { onDetails } : {})}/>
  </article>{!panel && <Dialog open={open} onOpenChange={setOpen}><DialogContent className="word-dialog"><DialogTitle className="sr-only">{word.meaning}</DialogTitle><DialogDescription className="sr-only">{word.hanzi} · {word.pinyin}</DialogDescription><WordDetailContent word={word} onNavigate={() => setOpen(false)} /></DialogContent></Dialog>}</>;
}
