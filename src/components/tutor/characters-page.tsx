import { orderLibrary, newShuffleSeed, type LibrarySort as Sort } from '@/lib/library-order';
import { LibrarySort } from './library-sort';
import { MeaningText } from './meaning-text';
import { revealToFaceView } from '@/lib/face-view';
import { cardMnemonic, mnemonicFor } from '@/lib/mnemonics';
import { MnemonicPreview, TileMnemonicButton, type MnemonicChoice, type MnemonicFacts, type MnemonicFamily } from './mnemonic';
import { pronunciationAvailable, ttsAvailable } from '@/lib/audio';
import { CharacterLessonIndicator, CharacterLessonsSection } from './lesson-links';
import { UsageLabel } from './usage-label';
import { DetailSheet } from './detail-sheet';
import { HintBody, SourceInfo } from '@/components/tutor/source-info';
import { Fragment, memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSideFit } from './use-side-fit';
import { useSenseTrim } from './use-sense-trim';
import { characterMeaning, uniqueFormSenses, vocabularyLedMeaning } from '@/lib/vocabulary-meaning';
import { useCardTopRowFit } from './use-card-top-row-fit';
import { useCardFooterFit } from './use-card-footer-fit';
import { RadicalPill } from './radical-pill';
import { CatalogPagination, StickyPagination } from './catalog-pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { nearestRecordedRank } from '@/lib/rank-jump';
import { useLibraryDensity } from './use-library-density';
import { useFooterFitColumns } from './use-footer-fit-columns';
import { useKeyboardPaging } from '@/lib/keyboard-paging';
import { Link } from '@tanstack/react-router';
import { Search, Volume2, GitBranch, Quote, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UNRANKED, usageGroups, usageGroupLabel, usagePercentage, formatUsagePercentage, usageGroupFor, usageRank, parseUsageGroup, usageOrder } from '@/lib/usage-frequency';
import { libraryEntries, glyphDecomposition, filterLibrary, libraryPage, libraryDestination, glyphIndex, glyphScript, plannedCounts, radicalCardRecord, radicalVariantFallback, radicalVariantMeaning, radicalVariantEntry, savedGlyphEntry, savedGlyphDestination, type LibraryKind, type LibraryEntry } from '@/lib/character-library';
import { playCharacter, characterRecording, catalog, readingMeanings } from '@/lib/catalog-store';
import { strokeSpeech } from '@/lib/stroke-names';
import { useRecordScroll, focusRecordCard } from '@/lib/selection-scroll';
import { CharacterSentenceIndicator } from './character-sentence-indicator';
import { includeSelectedRecord } from '@/lib/record-selection';
import { glyphUsage } from '@/lib/glyph-usage';
import { radicalCardAvailability } from '@/lib/radical-card-availability';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { CardTopMeta, DetailRecordActions, RecordCardFooter } from './record-card-footer';
import { finderCoversGlyph } from '@/lib/hanzi-finder-records';
import { TileSpeaker } from './tile-speaker';
import { CharacterIdiomsSection, GlyphUsageExamples, useGSourceParents } from './glyph-usage';
import { TileExamplesLink } from './sentence-section';
import { externalExampleSources } from '@/lib/external-examples';
import { RecordDetailTitle } from './record-detail-title';
import { PointedMeaning, PointedParts } from './pointed-meaning';
import { cardMeaningPointers, meaningPointers } from '@/lib/meaning-pointers';
import { CharacterDecomposition, useCharacterEnrichment } from './character-enrichment';
import { decompositionHasContent } from '@/lib/character-enrichment';
import { hasKnownDecomposition } from '@/lib/ids-tree';
import { RadicalIdentityNote } from './radical-identity';
import { RadicalVariantEtymology } from './radical-variant-etymology';
import { GlyphDetailTabs } from './detail-tabs';
import { EtymologyIndicator } from './etymology-section';
import { radicalIdentity } from '@/lib/radical-identities';
import { glyphTitleInk, isRadicalGlyph } from '@/lib/card-ink';
import { glyphRecordInk } from '@/lib/record-ink';
import { cardMeaning, cardReadingSplit, glyphPresentation } from '@/lib/glyph-presentation';
import { historicalRadicalHeading, orderedRadicalForms, radicalStrokes, radicalFamily, radicalForm } from '@/lib/radical-strokes';
import { isRadicalSubstitute, radicalSubstituteEntries } from '@/lib/radical-substitute';
import { DetailLoading, useDetailLoading } from './detail-loading';
import { StrokeDrawingTile } from './stroke-drawing-tile';
import { strokeExamples } from '@/lib/stroke-examples';
import { GridCardPlaceholder } from './section-placeholder';
import { DraftFilterForm, FilterWideningToggle, PinyinSearchInput } from './filter-form';
import { LibraryTools } from './library-tools';
import { cardRevealClass } from './card-reveal-toggle';
import { HintChar, LessonHintsProvider, useLessonHints } from './lesson-hints';
import { useCardPeek, isPlainCardDoubleClick } from './card-peek';
import { libraryFilterOptions } from '@/lib/library-filter-options';
import { RadicalForms } from './radical-forms';
import { useScriptFormsSourceNote, ScriptForms, RelatedWrittenForms, cardFormRecords } from './script-forms';
import { GlyphReadingSpeaker, MultiReadingSpeakers, isMultiReading, splitReadings } from './reading-speakers';
import { SoundChartLink } from './sound-chart-link';
import { InlineReadingMeanings, ReadingMeanings } from './reading-meanings';
import { componentCardGlyphs, componentCardHead } from '@/lib/component-families';
import { collapseScriptForms, scriptGroup, scriptHead } from '@/lib/character-variants';
import { usePublishSections } from '@/lib/section-switch';
import { useOneLineTitle } from './one-line-title';
import { shownGlyph } from '@/lib/radical-display-glyph';

const kinds: LibraryKind[] = ['Characters', 'Components', 'Radicals', 'Strokes'];
const kindNotes: Record<LibraryKind, string> = { Characters: 'Traditional forms marked from Unihan variant data', Radicals: 'Kangxi families · Unihan 17.0.0 · variants: cjklib C-locale', Components: 'Make Me a Hanzi components', Strokes: 'Unicode 18.0 stroke inventory' };
// Motivational small-caps line shared by every tab of the Glyphs section;
// per-tab provenance stays in the (i) beside the title (kindNotes).
const glyphsMotto = 'STUDY THE BLOCKS · ONE CHARACTER AT A TIME';
/** Strokes speak their recorded Chinese name (㇐ → 横); other glyphs speak themselves. */
/** Hint for the purple "+N" tab count: `shared` Traditional forms folded into a
 * Simplified card, plus `standalone` Traditional records with no linked Simplified
 * form that keep their own card and are already part of the `cards` total. */
export function traditionalCountHint(shared: number, standalone: number, cards: number) {
  const n = (v: number) => v.toLocaleString('en-US');
  const sharedLine = `${n(shared)} Traditional ${shared === 1 ? 'form shares' : 'forms share'} a card with ${shared === 1 ? 'its' : 'their'} Simplified form`;
  if (!standalone) return sharedLine;
  return `${sharedLine}. ${n(standalone)} other Traditional ${standalone === 1 ? 'form has' : 'forms have'} no linked Simplified form and ${standalone === 1 ? 'keeps its' : 'keep their'} own card, included in the ${n(cards)}`;
}

/** Purple rule for a radical family card's forms: the first (head) form is purple only
 * when it is the family's historical Kangxi heading (貝 beside 贝); later forms are also
 * purple when their exact glyph is a Traditional-script record (糹, 釒, 飠). The card and
 * the Radicals tab "+N" both use this, so the count always equals the purple forms shown. */
function radicalFormIsTraditional(glyph: string, familyId: number, head: boolean) {
  return historicalRadicalHeading(glyph, familyId) || (!head && glyphScript(glyph) === 'Traditional');
}
/** Distinct forms shown on a radical family card, in the reference selector's order,
 * each flagged with the purple rule above. Substitutes (radical-substitute.ts, 西 under 襾)
 * have their own card, so the family card never shows them beside its own reading. */
function radicalCardForms(familyId: number) {
  const family = radicalFamily(familyId);
  const glyphs = family ? [...new Set(orderedRadicalForms(family).filter(form => !isRadicalSubstitute(familyId, form.key)).map(form => form.character))] : [];
  return glyphs.map((glyph, index) => ({ glyph, traditional: radicalFormIsTraditional(glyph, familyId, index === 0) }));
}
/**
 * Memory-picture popup choices for a radical family card (MnemonicFamily in mnemonic.tsx): one
 * per distinct family form that owns its exact picture, in the selector's order. Each choice's
 * pinyin, translation and speech follow the detail card's rules for that exact form (the form's
 * own record, else radicalVariantFallback with the exact family + form key, else the family's
 * component-form meaning), so a variant never borrows another form's facts. The opening card's
 * own glyph keeps exactly the facts that card shows (`own`). Built lazily, when the popup opens.
 */
function radicalMnemonicFamily(heading: LibraryEntry, slow: boolean, onError: (error: string | null) => void, own: { glyph: string; facts: MnemonicFacts | undefined }): MnemonicFamily | undefined {
  const family = heading.kangxiIndex ? radicalFamily(heading.kangxiIndex) : undefined;
  if (!family) return undefined;
  const seen = new Set<string>();
  // Substitutes keep their own picture on their own card, never in the family's popup.
  const pictured = orderedRadicalForms(family).filter(form => !isRadicalSubstitute(family.id, form.key) && !seen.has(form.character) && seen.add(form.character) && mnemonicFor(form.character));
  if (pictured.length < 2) return undefined;
  return { familyId: family.id, choices: () => pictured.map((form): MnemonicChoice => {
    const mnemonic = mnemonicFor(form.character)!;
    if (form.character === own.glyph) return { formKey: form.key, mnemonic, facts: own.facts };
    const exact = form.character === heading.hanzi ? heading : (['Radicals', 'Characters', 'Components'] as LibraryKind[]).flatMap(kind => libraryEntries(kind)).find(item => item.hanzi === form.character);
    const fallback = form.character !== heading.hanzi ? radicalVariantFallback(form.character, exact?.pinyin ?? '', family.id, form.key) : null;
    const info = glyphPresentation(form.character, 'Radicals', exact?.pinyin ?? '', exact?.meaning ?? '');
    const meaning = fallback ? `${fallback.meaning}; component form of ${fallback.headingGlyph}` : radicalVariantMeaning(form.character, info.meaning, family.id) ?? info.meaning;
    const spoken = fallback ? fallback.spoken : info.speech;
    const reading = fallback ? fallback.reading : info.reading || null;
    const speech = spoken && pronunciationAvailable(Boolean(characterRecording(spoken, reading)), reading, ttsAvailable()) ? spoken : null;
    return { formKey: form.key, mnemonic, facts: { pinyin: (fallback ? fallback.pinyin : info.reading) || undefined, meaning: meaning || undefined, ...(speech ? { onListen: () => { void playCharacter(speech, slow, reading).then(onError); }, listenLabel: `Listen to ${speech}` } : {}) } };
  }) };
}
/**
 * Purple Traditional "+N" hints. Both share TraditionalHintContent, so the tab
 * hint (hover/focus, desktop) and the small-screen page-total hint (tap, phones
 * hide the tabs) read and look identical. Inputs: shared count and hint text.
 * The tab version is a span with a tooltip because it sits inside the tab
 * button (a nested popover button would be invalid and would switch tabs).
 */
const traditionalHintClass = 'source-info-popover count-hint w-auto';
// `tone` 'family' marks the Components radical-family count (刂, ⺈ on 刀's card), coloured
// like the Radical # pill instead of Traditional purple.
type HintTone = 'traditional' | 'family';
const hintNoun = (tone: HintTone) => tone === 'family' ? 'radical-family forms' : 'Traditional forms';
/** Shared (i)-style card body for the "+N" hints: a coloured title row naming the count,
 *  then the explanation as a separated muted row (HintBody), matching every other hint. */
function CountHintBody({ count, hint, tone }: { count: number; hint: string; tone: HintTone }) {
  return <HintBody><strong className={`count-hint-title count-hint-${tone}`}>+{count.toLocaleString('en-US')} {hintNoun(tone)}</strong><br/>{hint}</HintBody>;
}
/** Page-total "+N" beside the card count, the only place these extras show (the header dropdown lists plain counts). */
function TraditionalTotalHint({ count, hint, tone = 'traditional' }: { count: number; hint: string; tone?: HintTone }) {
  return <Popover>
    <PopoverTrigger className={`catalog-total-traditional${tone === 'family' ? ' catalog-total-family' : ''}`} aria-label={`Plus ${count.toLocaleString('en-US')} ${hintNoun(tone)}. ${hint}`}>+{count.toLocaleString('en-US')}</PopoverTrigger>
    <PopoverContent side="bottom" align="start" collisionPadding={12} className={traditionalHintClass}><CountHintBody count={count} hint={hint} tone={tone}/></PopoverContent>
  </Popover>;
}

/** Hint for the Components family "+N" (component-families.ts membership rules). */
export function familyCountHint(shared: number) {
  return `${shared.toLocaleString('en-US')} radical-family ${shared === 1 ? 'form shares' : 'forms share'} a card with ${shared === 1 ? 'its' : 'their'} main form, such as 刂 and ⺈ on 刀's card. Forms with their own sound, such as 王 (wáng), keep their own card`;
}

/** Hint for the Radicals tab "+N": Traditional forms always share their family's card. */
export function radicalTraditionalCountHint(shared: number) {
  return `${shared.toLocaleString('en-US')} Traditional ${shared === 1 ? 'form shares' : 'forms share'} a card with ${shared === 1 ? 'its' : 'their'} radical family, shown in purple beside the other forms`;
}

function speechTarget(entry: LibraryEntry, kind: LibraryKind) {
  if (kind !== 'Strokes') { const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning); return { text: info.speech, reading: info.reading || null }; }
  const { name, reading } = strokeSpeech(entry);
  return { text: name, reading };
}
export function CharacterDetails({ entry: input, kind, variant }: { entry: LibraryEntry; kind: LibraryKind; variant?: string | undefined }) {
  const heading = input.radicalHeadingId ? savedGlyphEntry(input.radicalHeadingId) ?? input : input;
  const selectedVariant = variant ?? input.radicalVariant;
  const form = kind === 'Radicals' && heading.kangxiIndex ? radicalForm(heading.kangxiIndex, selectedVariant) : undefined;
  const exact = form ? ['Radicals', 'Characters', 'Components'].flatMap(k => libraryEntries(k as LibraryKind)).find(item => item.hanzi === form.character) : undefined;
  // An exact variant never inherits the heading's script classification.
  // Nor its breakdown: the selected form shows only its own exact glyph's recorded tree.
  const { script: headingScript, decomposition: headingTree, ...headingWithoutScript } = heading;
  const entry = form ? { ...headingWithoutScript, ...glyphDecomposition(form.character), ...(exact?.script ? { script: exact.script } : {}), hanzi: form.character, strokes: form.strokeCount, pinyin: exact?.pinyin ?? '', meaning: exact?.meaning ?? '', note: `${form.strokeCount} ${form.strokeCount === 1 ? 'stroke' : 'strokes'} · Kangxi family #${heading.kangxiIndex} · ${form.formKind}` } : heading;
  const { preferences, saved, toggleSaved } = useWorkspace();
  // Resolve alternatives only for an otherwise unknown tree; raw trees stay checksum-bound.
  const unknownTreeRecord = useCharacterEnrichment(entry.hanzi, entry.decomposition && !hasKnownDecomposition(entry.decomposition.root) ? entry.decomposition.root : undefined);
  const hasBreakdown = decompositionHasContent(entry.decomposition?.root, unknownTreeRecord);
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  const noteRadical = entry.note.match(/·\s*(.+?) radical$/)?.[1] ?? (kind === 'Components' ? catalog.componentRadicals[entry.hanzi] : undefined);
  const kangxiNumber = kind === 'Radicals' ? heading.kangxiIndex : radicalIdentity(entry.hanzi).radicals[0]?.number;
  const radicalFact = (() => {
    if (kind === 'Strokes') return null;
    if (noteRadical && !(info.canonicalRadical && noteRadical === entry.hanzi)) {
      const identity = radicalIdentity(entry.hanzi).radicals.find(radical => radical.glyph === noteRadical);
      const destination = libraryDestination(noteRadical, preferences.includeTraditional);
      return <span className="facts-radical">{destination
        ? <Button asChild variant="ghost" className="decomposition-glyph is-radical"><Link to="/characters" search={destination} resetScroll={false} aria-label={identity ? `Open Kangxi radical ${identity.number}` : `Open radical ${noteRadical}`}><strong lang="zh-CN">{noteRadical}</strong></Link></Button>
        : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static is-radical">{noteRadical}</strong>}</span>;
    }
    return (info.canonicalRadical?.number ?? kangxiNumber) ? <span className="word-hsk-id radical-tag">Radical #{kangxiNumber}</span> : null;
  })();
  const strokeNameFact = (() => {
    if (kind !== 'Strokes') return null;
    const { name } = strokeSpeech(entry);
    if (!name) return null;
    return <div><dt>Name</dt><dd><span className="facts-radical">{[...name].map((glyph, index) => {
      const destination = libraryDestination(glyph, preferences.includeTraditional);
      return destination
        ? <Button asChild key={index} variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open the record for ${glyph}`}><strong lang="zh-CN">{glyph}</strong></Link></Button>
        : <strong key={index} lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{glyph}</strong>;
    })}</span></dd></div>;
  })();
  const bookmarkId = form ? radicalVariantEntry(heading, form).id : heading.id;
  const bookmarked = saved.includes(bookmarkId);
  const [audioError, setAudioError] = useState<string | null>(null);
  // The exact family + form key lets a reviewed contextual identity (#96 jade 王) apply here only.
  const fallback = form && form.character !== heading.hanzi ? radicalVariantFallback(entry.hanzi, entry.pinyin, heading.kangxiIndex, form.key) : kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null);
  // A Characters record with a reviewed split (了 le / liǎo) lists each reading's own meaning.
  // The family's own radical card (干 #51) shows the same reviewed split, validated against this
  // exact record's readings and meaning (cardReadingSplit); variant forms keep their own text.
  const perReading = kind === 'Characters' && !fallback ? readingMeanings(entry.hanzi) : ((kind === 'Radicals' && !form) || (kind === 'Components' && !info.component)) && !fallback ? cardReadingSplit(entry.hanzi, entry.pinyin, entry.meaning) : null;
  // A reviewed sense owned by a related character (干's "dried" → 乾) gets a link to that card.
  // Per-reading lines (了 le / liǎo) carry their own speakers when every line is an exact recorded
  // reading and no "Component name ·" prefix is needed; otherwise the pinyin line stays.
  const readingsInMeaning = Boolean(perReading && spoken && reading && !(!fallback && info.componentName) && perReading.length === splitReadings(reading).length && perReading.every(item => splitReadings(reading).includes(item.reading)));
  const pointedMeaning = (kind === 'Characters' || kind === 'Components') && !fallback && !perReading ? meaningPointers(entry.hanzi, entry.meaning) : null;
  // A plain Characters translation leads with its same-glyph HSK word (vocabulary-meaning.ts);
  // reviewed per-reading splits and related-character pointers keep their own presentation.
  const shownMeaning = kind === 'Characters' && !fallback && !perReading && !pointedMeaning ? vocabularyLedMeaning(entry.hanzi, entry.pinyin, info.meaning) : info.meaning;
  const percentage = usagePercentage(heading.hanzi, kind, preferences.includeTraditional, heading.kangxiIndex);
  // Radical cards: the title shows the selected form as one plain hanzi (pinyin above, its own
  // translation below), and the family's forms follow in Practice's form switch — same tiles,
  // labels and sliding frame, and the same "only with another form" rule (a one-form family
  // needs no switch: the title's hanzi already is that form) — linking to this card's exact
  // family + form key, so the title, reading and translation always follow the URL selection.
  // The hanzi wears the same identity ink as its switch tile: purple for the historical
  // heading or a Traditional-script form in Practice's mixed radical-Traditional ink
  // (--trad-radical, as on its tile and Practice's title), gold otherwise.
  const radicalFamilyRecord = kind === 'Radicals' && heading.kangxiIndex ? radicalFamily(heading.kangxiIndex) : undefined;
  // A selected substitute (西 under 襾) wears its own olive ink instead: an associated glyph, not a variant.
  const substituteSelected = Boolean(radicalFamilyRecord && form && isRadicalSubstitute(radicalFamilyRecord.id, form.key));
  const radicalTitleInk = substituteSelected ? 'card-ink-substitute' : radicalFamilyRecord ? (historicalRadicalHeading(entry.hanzi, radicalFamilyRecord.id) || glyphScript(entry.hanzi) === 'Traditional' ? 'traditional-character card-ink-radical' : 'card-ink-radical') : '';
  const radicalSwitch = radicalFamilyRecord && orderedRadicalForms(radicalFamilyRecord).length > 1 ? <RadicalForms familyId={radicalFamilyRecord.id} selectedKey={form?.key ?? radicalFamilyRecord.forms.find(item => item.character === heading.hanzi)?.key} hideLabel layout="switch"/> : undefined;
  // Characters/Components with other script (or component-family) forms follow the same
  // pattern: the record's own hanzi in the title, Practice's form switch below the meaning
  // (each tile opens that form's own record), and the group's provenance merged into the
  // title's single source ⓘ instead of a second ⓘ on a SCRIPT FORMS heading.
  const scriptGrouped = (kind === 'Characters' || kind === 'Components') && cardFormRecords(entry.hanzi, kind, preferences.includeTraditional).length > 1;
  const groupNote = useScriptFormsSourceNote(entry.hanzi, kind === 'Components' ? 'Components' : 'Characters');
  const scriptNote = scriptGrouped ? groupNote : null;
  const scriptSwitch = scriptGrouped ? <ScriptForms glyph={entry.hanzi} kind={kind as 'Characters' | 'Components'} grouping="card" hideLabel layout="switch"/> : undefined;
  // Memory picture: the shown form's own picture first; otherwise a radical family shares its one
  // picture across every form (owner's choice: #162 shows 辶's picture on 辵 too), labelled with the
  // form it belongs to, so it is never presented as the selected form's own.
  const mnemonic = kind === 'Strokes' ? null : mnemonicFor(entry.hanzi) ?? (radicalFamilyRecord && !substituteSelected ? cardMnemonic(radicalCardForms(radicalFamilyRecord.id).map(item => item.glyph)) : null);
  // The popup repeats the title's own translation, including a radical form's component-form meaning.
  const detailMnemonicMeaning = kind === 'Radicals' && form ? fallback ? `${fallback.meaning}; component form of ${fallback.headingGlyph}` : radicalVariantMeaning(entry.hanzi, info.meaning, heading.kangxiIndex) ?? info.meaning : shownMeaning;
  const detailMnemonicFacts: MnemonicFacts = { pinyin: fallback ? fallback.pinyin : info.reading || undefined, meaning: detailMnemonicMeaning || undefined, ...(audioAvailable ? { onListen: () => { void listen(); } } : {}) };
  // The source popup follows the validated split actually shown, so later corrections
  // cannot leave an obsolete reading attribution attached to the combined definition.
  const readingSource = perReading ? catalog.readingMeanings[entry.hanzi] : undefined;
  const sourceNote = <>{info.source ?? 'Unicode Unihan 17.0.0 readings and meanings.'}
    {readingSource && <><br/>Reading-specific meanings: {readingSource.source}
      {readingSource.sourceLinks?.length ? readingSource.sourceLinks.map(link => <Fragment key={link.url}> <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></Fragment>) : readingSource.sourceUrl && <> <a href={readingSource.sourceUrl} target="_blank" rel="noopener noreferrer">Dictionary source</a></>}
      {readingSource.note && <><br/>{readingSource.note}</>}
      {readingSource.combined && <><br/>Original Unihan definition: {readingSource.combined}</>}
    </>}
    {scriptNote && <><br/>{scriptNote}</>}
  </>;
  return <section className={`catalog-detail ${kind === 'Radicals' && historicalRadicalHeading(entry.hanzi, heading.kangxiIndex) ? 'historical-radical-detail' : ''}`} aria-label={`Details for ${entry.hanzi}`}>
    <RecordDetailTitle glyphAside={mnemonic ? <MnemonicPreview mnemonic={mnemonic} labelled={mnemonic.glyph !== entry.hanzi} facts={detailMnemonicFacts} family={kind === 'Radicals' && !substituteSelected ? radicalMnemonicFamily(heading, preferences.slow, setAudioError, { glyph: entry.hanzi, facts: detailMnemonicFacts }) : undefined}/> : undefined} hanzi={kind === 'Radicals' ? shownGlyph(entry.hanzi) : entry.hanzi} source={sourceNote} pill={kind === 'Radicals' && kangxiNumber ? <span className="word-hsk-id" title="Official Kangxi radical index">Radical #{kangxiNumber}</span> : kind === 'Characters' || kind === 'Components' ? <span className="practice-kind">{kind === 'Components' ? 'Component' : info.label}</span> : undefined}  glyphClassName={radicalTitleInk || glyphTitleInk(entry, kind)} formSwitch={radicalSwitch ?? scriptSwitch} pinyin={fallback ? fallback.pinyin : info.componentName ? `Component name · ${info.reading}` : info.reading} pinyinFallback={fallback ? '' : info.readingFallback} meaning={kind === 'Radicals' && form && fallback ? `${fallback.meaning}; component form of ${fallback.headingGlyph}` : kind === 'Radicals' && form ? radicalVariantMeaning(entry.hanzi, info.meaning, heading.kangxiIndex) ?? info.meaning : kind === 'Components' && fallback?.meaning ? (/component form of/i.test(info.meaning) ? info.meaning : `${fallback.meaning}; ${info.meaning}`) : kind === 'Components' ? stripKangxiLabel(info.meaning) : shownMeaning} script={entry.script} readingsInMeaning={readingsInMeaning} meaningContent={perReading ? <ReadingMeanings items={perReading.map(item => ({ ...item, parts: kind === 'Radicals' ? null : meaningPointers(entry.hanzi, entry.meaning, item.meaning, item.reading) }))} speaker={readingsInMeaning && spoken ? reading => <><GlyphReadingSpeaker spoken={spoken} reading={reading} variant="header" onError={setAudioError}/><SoundChartLink reading={reading} from={entry.hanzi} variant="header"/></> : undefined}/> : pointedMeaning ? <PointedMeaning parts={pointedMeaning}/> : undefined} pinyinContent={spoken && reading && isMultiReading(reading) ? <MultiReadingSpeakers spoken={spoken} reading={reading} variant="header" prefix={!fallback && info.componentName ? 'Component name · ' : undefined} onError={setAudioError} chartFrom={kind !== 'Strokes' ? entry.hanzi : undefined}/> : undefined} audio={<Button variant="ghost" size="icon" className={recording ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${spoken ?? entry.hanzi}` : `No audio available for ${spoken ?? entry.hanzi}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button>}
      // Beside the speaker: this exact reading's Sound chart card (Glyphs only, never Strokes).
      chartLink={kind !== 'Strokes' && reading ? <SoundChartLink reading={reading} from={entry.hanzi} variant="header"/> : undefined}/>
    {audioError && <p role="status" className="library-note">{audioError}</p>}
    {/* Facts sit directly under the title on every glyph detail card, before variant spelling and etymology notes. */}
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? (kind === 'Strokes' ? 1 : 'Not recorded')}</dd></div>{strokeNameFact}{radicalFact && kind !== 'Radicals' && <div><dt>Radical</dt><dd>{radicalFact}</dd></div>}{kind === 'Strokes' && <div><dt>Record</dt><dd className="catalog-record-value">{info.label}</dd></div>}{(kind === 'Characters' || kind === 'Components' || kind === 'Radicals') && usageOrder.loaded && <div><dt className="catalog-rank-label">Rank<SourceInfo inline className="detail-footnote">{kind === 'Characters' ? 'Corpus frequency rank' : `Estimated ${kind === 'Radicals' ? 'radical assignment' : 'component exposure'} rank, derived from character frequencies`} · {usageOrder.data?.source.provider ?? 'Jun Da Modern Chinese corpus'}{kind === 'Characters' ? ' · Percentage is this character’s share of corpus tokens.' : kind === 'Components' ? ' · Percentage is this component’s share of weighted known-leaf occurrences; not character corpus coverage.' : kind === 'Radicals' ? ' · Share of matched corpus tokens assigned to this Kangxi family, not graphical radical occurrences.' : ''}</SourceInfo></dt><dd><UsageLabel rank={usageRank(heading, kind, preferences.includeTraditional)} kind={kind}/></dd></div>}{percentage !== null && <div><dt>{kind === 'Characters' ? 'Corpus frequency' : kind === 'Radicals' ? 'Radical assignment share' : 'Occurrence share'}</dt><dd>{formatUsagePercentage(percentage)}</dd></div>}</dl>
    {/* Context-dependent simplified/traditional associations keep separate cards; Related characters links them with the recorded explanation. */}
    {(kind === 'Characters' || kind === 'Components') && <RelatedWrittenForms glyph={entry.hanzi} kind={kind}/>}
    {/* Etymology audit notes belong to radical variant cards only (below the facts), never the family's main form. */}
    {kind === 'Radicals' && form && heading.kangxiIndex && form.character !== heading.hanzi && <RadicalVariantEtymology familyId={heading.kangxiIndex} formKey={form.key} reading={fallback?.pinyin ?? info.reading}/>}
    {info.component && !fallback && <p className="catalog-record-note">{info.componentName ? `${info.componentName.text} is a component name, not a standalone character reading.` : info.characterPinyin ? 'Radical form that is also an ordinary character.' : 'No standalone character pronunciation is assigned to this form.'}</p>}
    {(kind === 'Components' || kind === 'Characters') && radicalIdentity(entry.hanzi).radicals.length > 0 && <RadicalIdentityNote glyph={entry.hanzi}/>}
    {kind !== 'Strokes' && <GlyphUsageExamples entry={entry} kind={kind} familyGlyph={kind === 'Radicals' ? heading.hanzi : undefined}/>}
    {/* Top 2 highest-ranked idioms containing this character (Characters records only). */}
    {kind === 'Characters' && <CharacterIdiomsSection entry={entry}/>}
    {/* Lessons whose recorded headword is exactly this character (Characters records only). */}
    {kind === 'Characters' && <CharacterLessonsSection recordId={entry.id} hanzi={entry.hanzi}/>}
    {/* Decomposition | Etymology drawer tabs (detail-tabs.tsx), like Practice's Strokes | Decomposition.
        Every glyph card with a recorded tree — Characters, Components and Radicals (each form its own
        exact tree) — offers the same BabelStone + Hanzi graphical structure breakdown; strokes never do.
        Etymology looks up this exact record or family-qualified radical form: bookmarkId is the
        selected form's own ID (…:variant:146-2), never the heading's. */}
    {kind !== 'Strokes' && <GlyphDetailTabs cardKey={heading.id}
      decomposition={entry.decomposition && hasBreakdown ? { info: <SourceInfo inline className="detail-footnote decomposition-footnote">Breakdowns follow source priority · BabelStone G-source first, then the recorded Hanzi graphical structure when it differs.<br/>IDS describes graphical structure only · not verified etymology or stroke geometry.<br/>Components link to their library cards.</SourceInfo>, body: <div className="decomposition-section"><CharacterDecomposition character={entry.hanzi} tree={entry.decomposition.root} source={entry.decomposition.source} status={entry.decomposition.status}/></div> } : null}
      etymology={{ recordId: bookmarkId, glyph: entry.hanzi, familyId: radicalFamilyRecord?.id, formKey: form?.key ?? radicalFamilyRecord?.forms.find(item => item.character === heading.hanzi)?.key }}/>}
    {/* Bottom row: Trace/Recall left, Bookmark alone at the right (the source ⓘ sits beside the title glyph).
        The external example search joins this row only where the card shows the "In a phrase"
        section (Characters records) and the External search links preference is enabled. */}
    <div className="detail-reference-row"><DetailRecordActions practice={kind === 'Strokes' ? { stroke: entry.hanzi } : { character: entry.hanzi, ...(form ? { family: heading.kangxiIndex, variant: form.key } : {}) }} hanzi={entry.hanzi} bookmarked={bookmarked} onBookmark={() => toggleSaved(bookmarkId)} similar={kind !== 'Strokes' && finderCoversGlyph(entry.hanzi) ? entry.hanzi : undefined} internetSearch={kind === 'Characters' && preferences.cardExamplesLinks === true ? externalExampleSources(entry.hanzi)[0] : undefined}/></div>
  </section>;
}
/** Tiles already show the Kangxi ID badge, so drop the redundant "Kangxi radical N" gloss fragment. */
export const stripKangxiLabel = (meaning: string) => meaning.split(/;\s*/).filter(part => !/^(?:Kangxi )?radical\s*#?\s*\d+$/i.test(part.trim())).join('; ') || meaning;
const MemoCharacterDetails = memo(CharacterDetails);

/** A grouped Components card ranks by its best-ranked form (刀's card shows 刂's #32),
 * matching where the card sits in the rank-sorted list; each form keeps its own rank in the details. */
const recordCache = new WeakMap<LibraryEntry[], Map<string, LibraryEntry>>();
/** Exact-glyph record lookup within one library (cached per catalogue version's entry list). */
function libraryRecords(kind: 'Characters' | 'Components') {
  const list = libraryEntries(kind);
  let map = recordCache.get(list);
  if (!map) { map = new Map(list.map(item => [item.hanzi, item])); recordCache.set(list, map); }
  return map;
}
const componentRecords = () => libraryRecords('Components');
/**
 * Per-tile stroke counts for a card showing several forms (预 / 預, 刀 / 刂 / ⺈), in tile order.
 * Each count comes from that exact form's own record — the Characters/Components record of the
 * same glyph, or the radical family's recorded form — never from the head form; a form with no
 * recorded count stays undefined (shown as "–"). `traditional` mirrors the tile's purple rule.
 */
function formStrokeCounts(forms: string[], entry: LibraryEntry, kind: LibraryKind, familyId: number | undefined): { glyph: string; strokes: number | undefined; traditional: boolean }[] {
  if (familyId !== undefined) {
    const family = radicalFamily(familyId);
    const recorded = family ? orderedRadicalForms(family) : [];
    return forms.map((glyph, index) => ({ glyph, strokes: recorded.find(form => form.character === glyph)?.strokeCount, traditional: radicalFormIsTraditional(glyph, familyId, index === 0) }));
  }
  const records = libraryRecords(kind === 'Components' ? 'Components' : 'Characters');
  return forms.map((glyph, index) => ({ glyph, strokes: index === 0 ? entry.strokes : records.get(glyph)?.strokes, traditional: index === 0 ? entry.script === 'Traditional' : Boolean(historicalRadicalHeading(glyph, entry.kangxiIndex)) || glyphScript(glyph) === 'Traditional' }));
}
/** Glyphs a Components card shows: its whole group when it heads one, else just itself. */
function componentCardForms(entry: LibraryEntry, includeTraditional: boolean): string[] {
  const glyphs = componentCardGlyphs(entry.hanzi, includeTraditional);
  return glyphs[0] === entry.hanzi && glyphs.length > 1 ? glyphs : [entry.hanzi];
}
function componentCardRank(entry: LibraryEntry, forms: string[], includeTraditional: boolean): number | null {
  if (forms.length < 2) return usageRank(entry, 'Components', includeTraditional);
  const records = componentRecords();
  const ranks = forms.flatMap(glyph => { const record = records.get(glyph); const rank = record ? usageRank(record, 'Components', includeTraditional) : null; return rank === null ? [] : [rank]; });
  return ranks.length ? Math.min(...ranks) : null;
}

// `revealed` marks a card peeked in a Hide mode; `onDetails` is the only way to open the panel.
/**
 * One Glyphs grid card (Compact and Comfortable). Inputs: the exact record and its library kind,
 * selection state, `onSelect` (card face) and `onDetails` (Details button). `header` (Start's random
 * cards only) replaces the top label row — rank, pills and availability icons — with the caller's
 * own row (section link + shuffle), so Start shows the exact grid card body and footer; the
 * indicator lookups (BabelStone parents, radical availability) are skipped since nothing shows them.
 */
export function CatalogTile({ entry, kind, selected, onSelect, revealed = false, onDetails, header }: { entry: LibraryEntry; kind: LibraryKind; selected: boolean; onSelect: (id: string) => void; revealed?: boolean; onDetails?: (id: string) => void; header?: ReactNode }) {
  const { preferences, saved, toggleSaved, items, catalogVersion } = useWorkspace();
  const indicators = header === undefined;
  const unknownTreeRecord = useCharacterEnrichment(entry.hanzi, indicators && entry.decomposition && !hasKnownDecomposition(entry.decomposition.root) ? entry.decomposition.root : undefined);
  const hasBreakdown = decompositionHasContent(entry.decomposition?.root, unknownTreeRecord);
  const gSourceParents = useGSourceParents(entry, indicators ? kind : null, preferences.includeTraditional, catalogVersion);
  // Resolved asynchronously (BabelStone sidecars for multi-form families); null while loading.
  const [familyAvailability, setFamilyAvailability] = useState<{ example: boolean } | null>(null);
  useEffect(() => {
    if (kind !== 'Radicals' || !indicators) { setFamilyAvailability(null); return; }
    let cancelled = false;
    radicalCardAvailability(entry, libraryEntries('Characters'), preferences.includeTraditional).then(result => { if (!cancelled) setFamilyAvailability(result); });
    return () => { cancelled = true; };
  }, [entry, kind, preferences.includeTraditional, catalogVersion, indicators]);
  const hasExample = useMemo(() => !indicators ? false : kind === 'Components' ? (gSourceParents?.length ?? 0) > 0 : kind === 'Radicals' ? Boolean(familyAvailability?.example) : glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional).length > 0, [entry, kind, items, preferences.includeTraditional, catalogVersion, gSourceParents, familyAvailability, indicators]);
  // Saved variant cards carry their exact family + form key; ordinary cards pass neither.
  const fallback = kind === 'Radicals' || kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin, entry.radicalVariant ? entry.kangxiIndex : undefined, entry.radicalVariant) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const [audioError, setAudioError] = useState<string | null>(null);
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  // Reviewed per-reading meanings (干 gān / gàn) show every reading's senses on the grid card.
  // Characters cards lead with the same-glyph HSK word's translation (vocabulary-meaning.ts).
  const splitMeaning = !info.component && !fallback ? (kind === 'Characters' ? characterMeaning : cardMeaning)(entry.hanzi, entry.pinyin, entry.meaning) : info.meaning;
  const tileMeaning = kind === 'Components' && fallback?.meaning ? (/component form of/i.test(info.meaning) ? info.meaning : `${fallback.meaning}; ${info.meaning}`) : kind === 'Radicals' || kind === 'Components' ? stripKangxiLabel(splitMeaning) : splitMeaning;
  const componentRadical = kind === 'Components' ? radicalIdentity(entry.hanzi).radicals : info.characterRadical ? [info.characterRadical] : [];
  const hasPinyin = Boolean(info.reading || fallback?.pinyin);
  const hasMeaning = Boolean(info.meaning);
  const [side, setSide] = useState<'top' | 'bottom'>('top');
  const [clipped, setClipped] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const tileRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const tile = tileRef.current;
    if (!tile) return;
    const sync = () => {
      if (!tile.isConnected) return;
      const spans = [tile.querySelector<HTMLElement>('.pinyin'), tile.querySelector<HTMLElement>('.catalog-entry-meaning')];
      setClipped(spans.some(el => el ? el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 : false));
    };
    const engage = () => { sync(); const grid = tile.closest('.catalog-entry-grid'); const tops = grid ? [...grid.children].map(cell => (cell as HTMLElement).offsetTop) : [0]; setSide(tile.offsetTop - Math.min(...tops) < 20 ? 'bottom' : 'top'); };
    sync();
    const ro = new ResizeObserver(() => { if (tile.isConnected) sync(); });
    ro.observe(tile);
    tile.querySelectorAll<HTMLElement>('.pinyin, .catalog-entry-meaning').forEach(el => ro.observe(el));
    document.fonts?.ready.then(sync).catch(() => undefined);
    tile.addEventListener('pointerenter', engage);
    tile.addEventListener('focus', engage);
    return () => { ro.disconnect(); tile.removeEventListener('pointerenter', engage); tile.removeEventListener('focus', engage); };
  }, [entry.id]);
  const label = `View ${entry.hanzi}${hasPinyin ? '' : `, ${info.readingFallback.toLowerCase()}`}${hasMeaning ? '' : ', no meaning recorded'}`;
  // Match the reference/Practice selector's presentation order without changing
  // the family record ID, reading, metadata or exact-form bookmark identity.
  const family = kind === 'Radicals' && !entry.radicalVariant && entry.kangxiIndex ? radicalFamily(entry.kangxiIndex) : undefined;
  // Characters/Components whose head glyph is itself a sourced Kangxi radical (白, 口, 刀)
  // wear the gold 部 stamp and ink too; exact source identities only, never shape.
  // A substitute card (radical-substitute.ts: 西 under 襾, its own sound and meaning) is an
  // associated glyph, not a radical form: olive identity ink and a "Substitute" pill, no gold stamp.
  const substitute = kind === 'Radicals' && isRadicalSubstitute(entry.kangxiIndex, entry.radicalVariant);
  const radicalTile = !substitute && isRadicalGlyph(entry, kind);
  // Comfortable (List) cards: labelled Details/Trace/Recall row with the bookmark icon at its right end.
  const comfortable = preferences.libraryView === 'list';
  // Characters cards also show their recorded traditional forms (Unihan script groups) beside the simplified head;
  // Components cards do the same but only with forms that exist as Components records.
  // Components cards also show their radical-family forms (刀 刂 ⺈, component-families.ts).
  // Only a card's head shows the group: a Saved card of 爺 or 刂 keeps just its exact form.
  const scriptForms = kind === 'Characters' && preferences.includeTraditional ? scriptGroup(entry.hanzi) : [entry.hanzi];
  const displayedForms = family ? radicalCardForms(family.id).map(form => form.glyph) : kind === 'Components' ? componentCardForms(entry, preferences.includeTraditional) : scriptForms[0] === entry.hanzi ? scriptForms : [entry.hanzi];
  const primaryForm = displayedForms[0] ?? entry.hanzi;
  // One memory picture per grid card: the first displayed form (tile order) that has one, so a family
  // card showing 辶 offers 辶's picture. Hidden while the card hides its hanzi, since the picture
  // shows the form itself.
  const mnemonic = kind === 'Strokes' ? null : cardMnemonic(displayedForms);
  // Several tiles: one count per tile in tile order ("10 / 15 strokes"), traditional counts purple.
  const multiStrokes = displayedForms.length > 1 ? formStrokeCounts(displayedForms, entry, kind, family?.id) : null;
  // Characters cards grouping script forms (郁 / 鬱) show each form's own recorded translation when they
  // differ, joined by " / " in tile order, traditional ones purple; identical, already-covered or empty ones collapse
  // (预 / 預 keeps one line). Components and radical family cards keep their single family meaning.
  const formMeanings = kind === 'Characters' && multiStrokes ? multiStrokes.reduce<{ text: string; recorded: string; traditional: boolean }[]>((list, form, index) => {
    // Forms collapse by their own recorded translations: the head's shown text may lead with its
    // HSK word (vocabulary-meaning.ts), which a traditional form sharing the head's recorded
    // translation (这 / 這) must not repeat. A further form adds only the terms the earlier forms
    // don't already give (会 / 會 → "… meeting / an organization"; uniqueFormSenses), and nothing
    // when all of them are covered.
    const recorded = index === 0 ? entry.meaning : libraryRecords('Characters').get(form.glyph)?.meaning ?? '';
    const text = index === 0 ? tileMeaning : uniqueFormSenses(list.map(item => item.text), recorded);
    return text && !list.some(item => item.text === text || item.recorded === recorded) ? [...list, { text, recorded, traditional: form.traditional }] : list;
  }, []) : [];
  // Reviewed sense pointers (干: "dried → 乾", gàn "trunk of tree… → 幹") also mark the grid tile, unlinked
  // because the tile face is one button; the detail card keeps the clickable links.
  // Radical cards keep the split meaning but no pointers: a radical has no related characters.
  const readingSplit = formMeanings.length <= 1 && !info.component && !fallback && kind !== 'Strokes' ? cardReadingSplit(entry.hanzi, entry.pinyin, entry.meaning) : null;
  const pointerLines = formMeanings.length <= 1 && !info.component && !fallback && kind !== 'Strokes' && kind !== 'Radicals' ? cardMeaningPointers(entry.hanzi, entry.pinyin, entry.meaning) : null;
  const meaningText = readingSplit ? <InlineReadingMeanings items={readingSplit} pointerLines={pointerLines}/> : pointerLines ? <>{pointerLines.map((line, index) => <Fragment key={index}>{index > 0 && ' / '}<PointedParts parts={line} plain/></Fragment>)}</> : formMeanings.length > 1 ? <>{formMeanings.map((item, index) => <Fragment key={item.text}>{index > 0 && ' / '}<span className={item.traditional ? 'traditional-character' : undefined}><MeaningText text={item.text}/></span></Fragment>)}</> : <MeaningText text={tileMeaning}/>;
  // Every card body (Compact and Comfortable) first tries the side layout: the form boxes in one row
  // on the left, pinyin+audio over the translation on the right. useSideFit marks it data-stacked
  // when the boxes, the one-line pinyin or the two-line translation would be cut there, and CSS then
  // stacks boxes / pinyin+audio / translation (styles.css "Library card body"). Same rules as the
  // Words/Phrases cards: pinyin and translation shrink a little before stacking, and once one card
  // of a grid row stacks, the whole row stacks so neighbours never mix layouts.
  // A plain translation that overflows the card's line limit (two lines clamped in the Compact
  // grid, three in Comfortable) drops its last semicolon senses on the card, keeping at least
  // the first; the popup, tooltip and detail card keep them all.
  const plainMeaning = !readingSplit && !pointerLines && formMeanings.length <= 1;
  const trimmedMeaning = useSenseTrim(tileRef, plainMeaning ? tileMeaning : '');
  const cardMeaningText = plainMeaning ? <MeaningText text={trimmedMeaning}/> : meaningText;
  useSideFit(tileRef, true, [tileMeaning, displayedForms.length, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning, preferences.includeTraditional], { shrinkText: true, rowSync: true });
  // A row too narrow for its labels gets two attempts before it drops one onto a second line:
  // first the gold Radical pill's abbreviated "Rad. #N", then a smaller header font
  // (use-card-top-row-fit.ts).
  const rowRef = useRef<HTMLSpanElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  useCardTopRowFit(rowRef, entry.kangxiIndex !== undefined || (componentRadical.length === 1 && Boolean(componentRadical[0])), [entry.id, entry.kangxiIndex, componentRadical.length, displayedForms.length, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning, preferences.includeTraditional, preferences.cardReveal, revealed]);
  // The button row gets its own, independent attempt: a smaller button font before Recall and
  // the bookmark drop to a second line.
  useCardFooterFit(footerRef, [entry.id, entry.hanzi, Boolean(onDetails), comfortable, preferences.libraryView, preferences.font, preferences.pinyin, preferences.meaning]);
  const hanziHidden = !revealed && !revealToFaceView(preferences.cardReveal).hanzi;
  // Grid Glyph quick cards (gridHints, provider around the results): a form drawn as itself is a
  // quick-card target (not a tab stop inside the card button); a stand-in drawing (⺴ shown as 冗)
  // stays plain so the hint never names the stand-in instead of the exact form. Strokes never
  // show character hints.
  const gridHints = useLessonHints();
  const hintGlyph = (glyph: string, drawn: ReactNode) => kind !== 'Strokes' && gridHints?.enabled && drawn === glyph && /^\p{Script=Han}$/u.test(glyph) ? <HintChar glyph={glyph} focusable={false}/> : drawn;
  // The popup repeats this card's pinyin, speaker and translation (MnemonicFacts).
  const mnemonicFacts = { pinyin: fallback ? fallback.pinyin : info.reading || undefined, meaning: hasMeaning ? meaningText : undefined, ...(audioAvailable && spoken ? { onListen: async () => setAudioError(await playCharacter(spoken, preferences.slow, reading)), listenLabel: `Listen to ${spoken}` } : {}) };
  const mnemonicButton = mnemonic && !hanziHidden ? <TileMnemonicButton mnemonic={mnemonic} facts={mnemonicFacts} family={family ? radicalMnemonicFamily(entry, preferences.slow, setAudioError, { glyph: entry.hanzi, facts: mnemonicFacts }) : undefined}/> : null;
  const hasStrokeDrawing = kind === 'Strokes' && Boolean(strokeExamples[primaryForm]);
  const tile = <Button ref={tileRef} variant="ghost" className="word-open catalog-entry" aria-label={label} aria-pressed={selected} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} onClick={() => onSelect(entry.id)}>
      <span className="word-character">{hasPinyin && spoken && reading && kind !== 'Strokes' && isMultiReading(reading) ? <span className="pinyin"><MultiReadingSpeakers spoken={spoken} reading={reading} variant="tile" textClassName="pinyin-text" prefix={!fallback && info.componentName ? 'Name · ' : undefined} onError={setAudioError} chartFrom={preferences.soundChartLinks !== false ? entry.hanzi : undefined}/>{mnemonicButton}{kind === 'Characters' && preferences.cardExamplesLinks === true && <TileExamplesLink hanzi={entry.hanzi}/>}</span> : hasPinyin ? <span className="pinyin"><span className="pinyin-text">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/>{kind !== 'Strokes' && reading && preferences.soundChartLinks !== false && <SoundChartLink reading={reading} from={entry.hanzi} variant="tile"/>}{mnemonicButton}{kind === 'Characters' && preferences.cardExamplesLinks === true && <TileExamplesLink hanzi={entry.hanzi}/>}</span> : <span className="pinyin"><span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/>{mnemonicButton}</span>}<span className="tile-hanzi-row" style={{ '--forms-per-row': Math.min(6, displayedForms.length + (hasStrokeDrawing ? 1 : 0)) } as CSSProperties}><strong lang="zh-CN" className={`tile-form ${kind === 'Strokes' ? 'stroke-glyph-tile ' : ''}${(family ? radicalFormIsTraditional(primaryForm, family.id, true) : entry.script === 'Traditional') ? 'traditional-character' : ''}${radicalTile ? ' is-radical' : ''}`}>{hintGlyph(primaryForm, primaryForm)}</strong>{displayedForms.slice(1).map(glyph => <span key={glyph} lang="zh-CN" className={`tile-form ${(family ? radicalFormIsTraditional(glyph, family.id, false) : historicalRadicalHeading(glyph, entry.kangxiIndex) || glyphScript(glyph) === 'Traditional') ? 'traditional-character' : ''}${radicalTile ? ' is-radical' : ''}`}>{hintGlyph(glyph, shownGlyph(glyph))}</span>)}{hasStrokeDrawing && <StrokeDrawingTile glyph={primaryForm}/>}</span></span>
      {hasMeaning ? <span className="word-meaning catalog-entry-meaning">{cardMeaningText}</span> : <span className="tile-absent catalog-entry-meaning">no meaning</span>}
    </Button>;
  const strokesText = multiStrokes ? <>{multiStrokes.map((form, index) => <Fragment key={form.glyph}>{index > 0 && ' / '}<span className={form.traditional ? 'traditional-character' : undefined} title={form.strokes === undefined ? `Stroke count not recorded for ${form.glyph}` : `${form.glyph}: ${form.strokes} strokes`}>{form.strokes ?? '–'}</span></Fragment>)} {multiStrokes.every(form => form.strokes === 1) ? 'stroke' : 'strokes'}</> : <><span className={entry.script === 'Traditional' ? 'traditional-character' : undefined}>{entry.strokes}</span> {entry.strokes === 1 ? 'stroke' : 'strokes'}</>;
  const hasStrokes = multiStrokes ? multiStrokes.some(form => form.strokes !== undefined) : entry.strokes !== undefined;
  const metadata = kind !== 'Strokes' && usageOrder.loaded ? <><UsageLabel rank={kind === 'Components' ? componentCardRank(entry, displayedForms, preferences.includeTraditional) : usageRank(entry, kind, preferences.includeTraditional)} kind={kind} compact/>{hasStrokes && <span className="usage-strokes"> · {strokesText}</span>}</> : hasStrokes ? <span className="usage-strokes">{strokesText}</span> : info.component || kind === 'Components' ? 'Component form' : kind === 'Strokes' ? null : 'Stroke count not recorded';
  // Stroke cards carry no metadata (null), so they render no top row at all.
  // The clipped-translation hint is portaled outside the grid, so the grid's
  // `reveal-hide-*` CSS cannot reach it: mirror the active Hide mode here. A card
  // the learner has peeked (`revealed`) shows everything, matching the card itself.
  // Hiding the translation suppresses the hint entirely, since the hint is the translation.
  const shownFaces = revealToFaceView(revealed ? 'all' : preferences.cardReveal);
  const hideMeaning = !shownFaces.translations;
  const hideHanzi = !shownFaces.hanzi;
  const hidePinyin = !shownFaces.pinyin;
  // `is-traditional` marks traditional-script records so hover/selected/reveal frames tint purple (see styles.css `.word-card.is-traditional`).
  // Every other glyph card takes one identity ink (styles.css `.card-ink-*`) for its hanzi, hover/selected
  // frame and hovered translation: gold for sourced Kangxi radicals (record-ink.ts glyphRecordInk, so a Character or Component
  // that is itself a radical reads gold), green for Characters, foreground for Components. Traditional wins,
  // then radical; Strokes cards keep the default accent.
  // Shared with Start's random cards (src/lib/card-ink.ts); `is-traditional` itself is added below.
  const ink = glyphRecordInk(entry, kind);
  const cardInk = ink ? `card-ink${ink === 'is-traditional' ? '' : ` ${ink}`}` : '';
  return <article data-entry-id={entry.id} className={`word-card catalog-card ${kind === 'Radicals' ? 'radical-family-card' : ''} ${kind === 'Strokes' ? 'stroke-card' : ''} ${displayedForms.length <= 2 ? 'few-forms' : ''} ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${cardInk} ${selected ? 'is-selected' : ''} ${revealed ? 'is-revealed' : ''}`} onDoubleClick={event => { if (onDetails && isPlainCardDoubleClick(preferences.cardReveal, event.target)) onDetails(entry.id); }}>
    {/* The library tab already names the kind, so the top row carries no category word: it opens with
        rank · strokes, then pills (a gold "Variant" pill replaces the old COMPONENT VARIANT label).
        Stroke cards have no metadata or indicators, so they drop the top row entirely. */}
    {header !== undefined ? header : kind !== 'Strokes' && <div className="word-card-top"><span className="word-level-wrap" ref={rowRef}>{metadata !== null && <CardTopMeta lead>{metadata}</CardTopMeta>}{entry.kangxiIndex !== undefined && <RadicalPill number={entry.kangxiIndex} title="Official Kangxi radical index"/>}{componentRadical.length === 1 && componentRadical[0] && <RadicalPill number={componentRadical[0].number} title="Sourced Kangxi radical identity"/>}{substitute ? <span className="word-hsk-id substitute-pill" title="Substitute: an independent character with its own sound and meaning, classified under this radical">Substitute</span> : info.label === 'Component variant' && <span className="word-hsk-id" title="Component variant form">Variant</span>}{entry.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}</span><span className="catalog-card-indicators">{kind === 'Characters' && <CharacterLessonIndicator recordId={entry.id} hanzi={entry.hanzi}/>}{kind === 'Characters' && <EtymologyIndicator recordId={entry.id} hanzi={entry.hanzi}/>}{!hasExample && kind === 'Characters' && <CharacterSentenceIndicator recordId={entry.id}/>}{hasExample && (kind === 'Components' || kind === 'Radicals' ? <span title="In a character available"><Puzzle className="catalog-source-icon" aria-label="In a character available"/></span> : <span title="In a phrase available"><Quote className="catalog-source-icon" aria-label="In a phrase available"/></span>)}{hasBreakdown && <span title="Decomposition available"><GitBranch className="catalog-source-icon" aria-label="Decomposition available"/></span>}</span></div>}
    <Tooltip open={clipped && engaged}><TooltipTrigger asChild>{tile}</TooltipTrigger>
    {clipped && !hideMeaning && <TooltipContent side={side} className="tile-tooltip"><span className="tile-tooltip-head">{!hideHanzi && <strong lang="zh-CN">{entry.hanzi}</strong>}{hidePinyin ? null : hasPinyin ? <span className="pinyin">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span> : <span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span>}</span><p className="tile-tooltip-meaning">{tileMeaning ? meaningText : <MeaningText text="No English meaning recorded in this source."/>}</p>{entry.script === 'Traditional' && <small className="traditional-label">Traditional</small>}</TooltipContent>}
  </Tooltip>
    <RecordCardFooter footerRef={footerRef} practice={kind === 'Strokes' ? { stroke: entry.hanzi } : { character: entry.hanzi, ...(entry.radicalVariant ? { family: entry.kangxiIndex, variant: entry.radicalVariant } : {}) }} metadata={metadata} hanzi={entry.hanzi} bookmarked={saved.includes(entry.id)} onBookmark={() => toggleSaved(entry.id)} comfortable={comfortable} onOpen={() => onSelect(entry.id)} {...(onDetails ? { onDetails: () => onDetails(entry.id) } : {})}/>
    {audioError && <p className="catalog-card-audio-error" role="status">{audioError}</p>}
  </article>;
}

const MemoCatalogTile = memo(CatalogTile, (a, b) => a.entry === b.entry && a.kind === b.kind && a.selected === b.selected && a.onSelect === b.onSelect && a.revealed === b.revealed && a.onDetails === b.onDetails);

export type CharactersSearch = { sort?: Sort | undefined; seed?: number | undefined; character?: string; tab?: LibraryKind; q?: string; strokes?: string; usage?: string | undefined; page?: number; id?: string; status?: 'saved' | undefined; py?: 'pinyin' | 'exact' | undefined; variant?: string | undefined; /** '1' widens the rank group to rank 1..group end ("include lower ranks"). */ usageUpTo?: '1' | undefined; /** '1' widens the stroke count to 1..count ("include fewer strokes"). */ strokesUpTo?: '1' | undefined; /** '1' hides cards whose glyph is a Kangxi radical (Characters and Components tabs). */ hideRadicals?: '1' | undefined };

/** All library state lives in the URL so browser back/forward restores tab, filters, page and selection. */
export function CharactersPage({ search, onSearch }: { search: CharactersSearch; onSearch: (next: CharactersSearch, replace?: boolean) => void }) {
  const { preferences, catalogVersion, saved } = useWorkspace();
  const catalogReady = catalogVersion > 0;
  const glyphHit = search.character && !search.id ? glyphIndex()[search.character] : undefined;
  const selectedKind = kinds.find(k => search.id?.startsWith(`${k}:`));
  const kind: LibraryKind = selectedKind ?? search.tab ?? glyphHit?.kind ?? 'Characters';
  const query = search.q ?? '';
  const strokeCount = search.strokes ?? '';
  const pinyinOnly = Boolean(search.py);
  const hasUsage = kind !== 'Strokes';
  const sort = hasUsage && (search.sort === 'pinyin' || search.sort === 'random') ? search.sort : 'rank';
  const seed = search.seed ?? 1;
  const usage = hasUsage ? parseUsageGroup(kind, search.usage) : undefined;
  const usageUpTo = search.usageUpTo === '1';
  const strokesUpTo = search.strokesUpTo === '1';
  // Radicals are ordinary records on the Characters and Components tabs, so hiding them is a
  // filter there only: the Radicals tab is nothing but radicals, and Strokes has none.
  const hideRadicals = search.hideRadicals === '1' && (kind === 'Characters' || kind === 'Components');
  // The URL field keeps the same '1' shape as the other switches: a bare '1' inside an
  // unannotated object literal widens to `string` and no longer matches CharactersSearch.
  const hideRadicalsField: CharactersSearch['hideRadicals'] = hideRadicals ? '1' : undefined;
  const savedOnly = search.status === 'saved';
  const page = search.page ?? 1;
  const selectedId = search.id ?? glyphHit?.id ?? '';
  // No first-row fallback: ordinary visits and tab changes must not open a modal.
  // Explicit record IDs take precedence over glyph-only links to preserve kind.
  const clean = (s: CharactersSearch): CharactersSearch => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== '' && !(v === 1))) as CharactersSearch;
  const base: CharactersSearch = { sort: search.sort, seed: search.seed, variant: search.variant, tab: kind, q: query, strokes: strokeCount, usage, page, id: selectedId, status: search.status, py: search.py, usageUpTo: search.usageUpTo, strokesUpTo: search.strokesUpTo, hideRadicals: hideRadicalsField };
  const set = (patch: CharactersSearch, replace = false) => onSearch(clean({ ...base, ...patch }), replace);
  const appliedFilters = { q: query, strokes: strokeCount, usage, py: search.py, usageUpTo: search.usageUpTo, strokesUpTo: search.strokesUpTo, hideRadicals: hideRadicalsField };
  const activeFilters = Boolean(query || strokeCount || usage || search.py || savedOnly || hideRadicals);
  const clearFilters = () => { set({ q: '', strokes: '', usage: undefined, py: undefined, status: undefined, page: 1, id: '', variant: undefined, usageUpTo: undefined, strokesUpTo: undefined, hideRadicals: undefined }); };
  const setPage = (p: number) => set({ page: p, id: '' });
  const detailLoading = useDetailLoading();
  const setSelectedId = (id: string) => { void detailLoading.run(id, () => { const entry = savedGlyphEntry(id); return set(entry ? { ...savedGlyphDestination(entry), variant: entry.radicalVariant } : { id, variant: undefined }); }); };
  const entries = useMemo(() => libraryEntries(kind), [kind, catalogVersion]);
  // The Radicals grid adds one card per substitute (radical-substitute.ts), placed by the family's
  // rank right after its family card; Saved browsing already lists saved forms by their own IDs.
  const browsable = useMemo(() => kind === 'Radicals' ? [...entries, ...radicalSubstituteEntries()] : entries, [kind, entries, catalogVersion]);
  // Characters, Components and Radicals: rank and stroke lists narrow each other
  // (Strokes has no rank filter, so it lists every recorded count).
  const compatibleFilters = kind !== 'Strokes';
  // Only applied opposite filters drive availability. Draft edits stay inside
  // the form, keeping the scan independent of typing and detail selection.
  const availableOptions = useMemo(() => libraryFilterOptions(entries, kind, preferences.includeTraditional, usage, strokeCount, usageUpTo, strokesUpTo, hideRadicals), [entries, kind, preferences.includeTraditional, usage, strokeCount, usageUpTo, strokesUpTo, hideRadicals, catalogVersion]);
  const strokeCounts = useMemo(() => compatibleFilters ? availableOptions.strokes : Array.from(new Set(entries.flatMap(e => e.strokes ? [e.strokes] : []))).sort((a,b) => a-b), [entries, compatibleFilters, availableOptions]);
  const rankGroups = compatibleFilters ? availableOptions.ranks : usageGroups(kind);
  const requestedHeading = entries.find(entry => entry.id === selectedId);
  const requestedForm = requestedHeading?.kangxiIndex ? radicalForm(requestedHeading.kangxiIndex, search.variant) : undefined;
  const requestedId = requestedHeading && requestedForm ? radicalVariantEntry(requestedHeading, requestedForm).id : selectedId;
  const browsedRecords = filterLibrary(savedOnly ? entries : browsable, query, strokeCount, false, preferences.includeTraditional, usage, savedOnly ? saved : undefined, pinyinOnly, search.py === 'exact', usageUpTo, strokesUpTo);
  // Grouped traditional records share their simplified card (a search hitting only 爺 shows 爷's card).
  // Saved browsing keeps exact bookmarked records, so a saved 爺 stays its own card there.
  // Applies to Characters and Components alike (each groups only within its own library).
  // Components additionally fold radical-family forms (刂, ⺈) into their main form's card,
  // independent of the Traditional preference (component-families.ts decides membership).
  const groupScripts = !savedOnly && ((kind === 'Characters' && preferences.includeTraditional) || kind === 'Components');
  const cardHead = (glyph: string) => kind === 'Components' ? componentCardHead(glyph, preferences.includeTraditional) : scriptHead(glyph);
  // "Hide radicals" removes whole cards, so it runs after the other filters and before grouping:
  // every form of a hidden card is dropped (radicalCardRecord looks at the card head, not just the
  // record), so collapsing cannot bring the card back through a head that is no longer listed.
  const keptRecords = hideRadicals ? browsedRecords.filter(entry => !radicalCardRecord(entry, kind, entries, preferences.includeTraditional)) : browsedRecords;
  const browsed = groupScripts ? collapseScriptForms(keptRecords, entries, cardHead) : keptRecords;
  // A selected traditional form is shown in the sheet, but its card, paging and arrows are the head's
  // (when the head exists in this library; otherwise the form keeps its own card).
  // A selected substitute is its own card, so paging, highlight and arrows follow that card.
  const cardSelectedId = requestedHeading && requestedForm && isRadicalSubstitute(requestedHeading.kangxiIndex, requestedForm.key) ? requestedId : groupScripts && selectedId.startsWith(`${kind}:`) && entries.some(entry => entry.id === `${kind}:${cardHead(selectedId.slice(kind.length + 1))}`) ? `${kind}:${cardHead(selectedId.slice(kind.length + 1))}` : selectedId;
  const unordered = includeSelectedRecord(requestedHeading && requestedForm ? [...entries, radicalVariantEntry(requestedHeading, requestedForm)] : entries, browsed, savedOnly ? requestedId : cardSelectedId);
  const filtered = orderLibrary(unordered, sort, seed);
  // Preserve explicitly selected records even when browsing filters exclude them;
  // density-aware paging then reveals their exact card, including saved variants.
  const density = useLibraryDensity(() => set({ page: 1, id: '', variant: undefined }));
  const paged = libraryPage(filtered, page, density.size, savedOnly ? requestedId : cardSelectedId);
  // Fewer cards per row rather than wrapped Details/Trace/Recall buttons (use-footer-fit-columns.ts).
  const gridRef = useRef<HTMLDivElement>(null);
  useFooterFitColumns(gridRef, [preferences.libraryView, preferences.font, preferences.cardReveal, kind]);
  // Hide modes: a click toggles the card's peek (reveal, then click again to hide);
  // reset on tab/page/filter change.
  const peek = useCardPeek(preferences.cardReveal, `${kind}|${paged.current}|${filtered.length}|${savedOnly}|${JSON.stringify(appliedFilters)}|${sort}|${seed}`, preferences.rememberCardReveals);
  // Clicks only toggle the peek in a Hide mode; the detail panel opens solely via the card's details button.
  const selectTile = (id: string) => peek.reveal(id);
  useKeyboardPaging({ current: paged.current, pages: paged.pages, onPageChange: setPage, disabled: selectedId !== '' });
  // Sticky strip label: on ranked tabs, name the frequency ranks visible on
  // the current page against the kind's ranked total; otherwise the page number.
  // Tab counts follow the script preference: hiding Traditional removes those records from each tab.
  // Tab counts are card counts (what paging walks). When Traditional forms are
  // included, linked Simplified/Traditional pairs share one Characters card, so
  // `sharedTraditional` separately counts the forms folded into those cards
  // (unpaired Traditional records already have their own card and stay in the
  // card count). Shown as a purple "+N" on the Characters, Components and Radicals tabs.
  // Components also count `sharedFamily`: non-Traditional radical-family forms (刂, ⺈)
  // folded into their main form's card, shown as a separate "+N" beside the purple one.
  const { tabCounts, sharedTraditional, standaloneTraditional, sharedFamily } = useMemo(() => {
    if (!catalogReady) return { tabCounts: null, sharedTraditional: {} as Record<string, number>, standaloneTraditional: {} as Record<string, number>, sharedFamily: 0 };
    const shared: Record<string, number> = {};
    const standalone: Record<string, number> = {};
    let family = 0;
    const counts = Object.fromEntries(kinds.map(k => {
      const list = filterLibrary(k === 'Radicals' ? [...libraryEntries(k), ...radicalSubstituteEntries()] : libraryEntries(k), '', '', false, preferences.includeTraditional);
      if (k === 'Radicals') {
        // Radical family cards always show every recorded form (independent of the
        // script preference), so the purple count follows the cards themselves.
        shared[k] = list.reduce((sum, e) => sum + (!e.radicalVariant && e.kangxiIndex ? radicalCardForms(e.kangxiIndex).filter(form => form.traditional).length : 0), 0);
        return [k, list.length];
      }
      if (k === 'Components') {
        const head = (glyph: string) => componentCardHead(glyph, preferences.includeTraditional);
        const present = new Set(list.map(e => e.hanzi));
        const folded = list.filter(e => head(e.hanzi) !== e.hanzi && present.has(head(e.hanzi)));
        shared[k] = folded.filter(e => e.script === 'Traditional').length;
        family = folded.length - shared[k];
        standalone[k] = Math.max(0, list.filter(e => e.script === 'Traditional').length - shared[k]);
        return [k, collapseScriptForms(list, list, head).length];
      }
      if (k !== 'Characters' || !preferences.includeTraditional) return [k, list.length];
      const cards = collapseScriptForms(list, list).length;
      shared[k] = list.length - cards;
      // Traditional records with no linked Simplified form (e.g. 鱻) keep their own card;
      // the hint names them so "+N" is never read as covering every Traditional form.
      standalone[k] = Math.max(0, list.filter(e => e.script === 'Traditional').length - shared[k]);
      return [k, cards];
    })) as Record<string, number>;
    return { tabCounts: counts, sharedTraditional: shared, standaloneTraditional: standalone, sharedFamily: family };
  }, [catalogReady, preferences.includeTraditional, catalogVersion]);
  // Count only sourced ranks in the applied pool; gaps remain original ranks,
  // not renumbered result positions, so the jump bounds preserve source identity.
  // Grouped Components cards rank by their best form, the same rank the card shows.
  const rankOf = (entry: LibraryEntry) => kind === 'Components' && !savedOnly ? componentCardRank(entry, componentCardForms(entry, preferences.includeTraditional), preferences.includeTraditional) : usageRank(entry, kind, preferences.includeTraditional);
  const filteredRanks = filtered.flatMap(entry => {
    const rank = hasUsage && usageOrder.loaded ? rankOf(entry) : null;
    return rank === null ? [] : [rank];
  });
  const rankSummary = filteredRanks.length ? { count: filteredRanks.length, min: Math.min(...filteredRanks), max: Math.max(...filteredRanks) } : undefined;
  const rankedTotal = filteredRanks.length;
  // The top page counter repeats the kind's purple "+N" after the card total. Only on the unfiltered All view, where the
  // total equals the tab's card count the hint describes.
  const sharedHere = sharedTraditional[kind] ?? 0;
  const traditionalTotalHint = sharedHere > 0 && !savedOnly && !query && !strokeCount && !usage && !hideRadicals && tabCounts?.[kind] === filtered.length
    ? (kind === 'Radicals' ? radicalTraditionalCountHint(sharedHere) : traditionalCountHint(sharedHere, standaloneTraditional[kind] ?? 0, filtered.length))
    : undefined;
  const unfilteredAll = !savedOnly && !query && !strokeCount && !usage && !hideRadicals && tabCounts?.[kind] === filtered.length;
  const familyTotalExtra = kind === 'Components' && sharedFamily > 0 && unfilteredAll ? <TraditionalTotalHint tone="family" count={sharedFamily} hint={familyCountHint(sharedFamily)}/> : null;
  const traditionalTotalExtra = traditionalTotalHint || familyTotalExtra ? <>{traditionalTotalHint ? <TraditionalTotalHint count={sharedHere} hint={traditionalTotalHint}/> : null}{familyTotalExtra}</> : undefined;
  const paginationProps = {
    filterKey: JSON.stringify([kind, appliedFilters, savedOnly, preferences.includeTraditional, sort, seed]),
    total: filtered.length, current: paged.current, pages: paged.pages,
    range: filtered.length ? `${(paged.current - 1) * density.size + 1}–${Math.min(paged.current * density.size, filtered.length)}` : '0',
    perPage: density.size, onPerPageChange: density.onPerPageChange, onPageChange: setPage,
    ranks: rankSummary,
    onUnrankedChange: hasUsage && usageOrder.loaded ? () => {
      const index = filtered.findIndex(entry => rankOf(entry) === null);
      if (index >= 0) setPage(Math.floor(index / density.size) + 1);
    } : undefined,
    currentRank: hasUsage && usageOrder.loaded ? paged.entries.map(entry => rankOf(entry)).find(rank => rank !== null) ?? undefined : undefined,
    onRankChange: hasUsage ? (rank: number) => {
      if (!usageOrder.loaded) return;
      const nearest = nearestRecordedRank(filtered.map(entry => rankOf(entry)), rank);
      if (!nearest) return;
      const destinationPage = Math.floor(nearest.index / density.size) + 1;
      setPage(destinationPage);
      return { rank: nearest.rank, page: destinationPage };
    } : undefined,
  };
  const stickyLabel = (() => {
    if (sort === 'rank' && rankedTotal > 0) {
      const ranks = paged.entries.map(e => rankOf(e)).filter((r): r is number => r !== null);
      if (ranks.length) return `Ranks ${Math.min(...ranks).toLocaleString('en-US')}–${Math.max(...ranks).toLocaleString('en-US')} of ${rankedTotal.toLocaleString('en-US')}`;
    }
    return `Page ${paged.current} / ${paged.pages}`;
  })();
  const selected = entries.find(entry => entry.id === selectedId);
  const selectedForm = selected?.kangxiIndex ? radicalForm(selected.kangxiIndex, search.variant) : undefined;
  const selectedBookmarkId = selected && selectedForm ? radicalVariantEntry(selected, selectedForm).id : selected ? cardSelectedId : undefined;
  useRecordScroll(selected ? cardSelectedId : '', catalogReady);
  const topPaginationRef = useRef<HTMLDivElement>(null);
  const lastPageRef = useRef<number | null>(null);
  useEffect(() => {
    const previous = lastPageRef.current;
    lastPageRef.current = page;
    if (previous === null || previous === page || selectedId) return;
    topPaginationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [page, selectedId]);
  // The kind switch lives in the header (section-picker.tsx); hand it each kind's
  // card count. The coloured "+N" extras stay on the page's count line only.
  usePublishSections('glyphs', Object.fromEntries(kinds.map(k => [k, { count: tabCounts?.[k] ?? plannedCounts[k] }])), { active: kind });
  // The title must stay on one line at every width; the hook lowers its font size as needed.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(titleRef, kind);
  void catalogVersion;
  // Saved-only browsing toggles the URL at once (page 1, no selection); the count is this tab's bookmarks.
  const savedFilter = { on: savedOnly, count: filterLibrary(libraryEntries(kind), '', '', false, preferences.includeTraditional, undefined, saved).length, onToggle: () => set({ status: savedOnly ? undefined : 'saved', page: 1, id: '' }), noun: kind.toLowerCase() };
  const sheetIndex = selectedId ? filtered.findIndex(entry => entry.id === (savedOnly ? requestedId : cardSelectedId)) : -1;
  // Modal arrows traverse the full filtered order, not just the visible page.
  // Store the target page with the selection so closing reveals that record.
  const stepTo = (index: number) => { const target = filtered[index]; if (target) void detailLoading.run(target.id, () => set({ ...savedGlyphDestination(target), variant: target.radicalVariant, page: Math.floor(index / density.size) + 1 })); };
  return <div className="page-enter library-page"><div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">{catalogReady ? (kind === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Preferences.' : glyphsMotto) : `Loading ${plannedCounts[kind].toLocaleString('en-US')} records…`}</div><h1 ref={titleRef}>Get to know the {kind.toLowerCase()}.<SourceInfo inline className="detail-footnote">{catalogReady ? (kind === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Preferences.' : kindNotes[kind]) : `Loading ${plannedCounts[kind].toLocaleString('en-US')} records…`}</SourceInfo></h1></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} className="catalog-tabs">
      {kinds.map(k => <TabsContent value={k} key={k}>
        <DraftFilterForm showCount={false} searchKey="q" searchModeKey="py" saved={savedFilter} applied={appliedFilters} active={activeFilters} count={filtered.length} onApply={draft => set({ ...draft, page: 1, id: '', variant: undefined })} onClear={() => { clearFilters(); return { q: '', strokes: '', usage: undefined, py: undefined, usageUpTo: undefined, strokesUpTo: undefined, hideRadicals: undefined }; }} chips={[...(appliedFilters.usage ? [{ label: usageUpTo ? `Rank 1–${(usageGroups(kind).find(group => group.value === appliedFilters.usage)?.max ?? 0).toLocaleString('en-US')}` : usageGroups(kind).find(group => group.value === appliedFilters.usage)?.label ?? appliedFilters.usage, clear: { usage: undefined, usageUpTo: undefined } }] : []), ...(appliedFilters.strokes ? [{ label: strokesUpTo ? `Up to ${appliedFilters.strokes} ${appliedFilters.strokes === '1' ? 'stroke' : 'strokes'}` : `${appliedFilters.strokes} ${appliedFilters.strokes === '1' ? 'stroke' : 'strokes'}`, clear: { strokes: '', strokesUpTo: undefined } }] : []), ...(hideRadicals ? [{ label: 'Radicals hidden', clear: { hideRadicals: undefined } }] : [])]} filterFields={({ draft, patch }) => <>
          {hasUsage && <span className="filter-field-row"><Select value={draft.usage || 'all'} onValueChange={value => patch({ usage: parseUsageGroup(kind, value) })}><SelectTrigger className="filter-select reuse-filter" aria-label="Filter by frequency"><SelectValue>{draft.usage ? usageGroups(kind).find(group => group.value === draft.usage)?.label : 'All ranks'}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All ranks</SelectItem>{draft.usage && !rankGroups.some(group => group.value === draft.usage) && <SelectItem value={draft.usage} disabled>{usageGroups(kind).find(group => group.value === draft.usage)?.label} · No matches</SelectItem>}{rankGroups.map(group => <SelectItem key={group.value} value={group.value}>{usageGroupLabel(group, kind, preferences.includeTraditional)}</SelectItem>)}</SelectContent></Select>{draft.usage && draft.usage !== UNRANKED && <FilterWideningToggle active={draft.usageUpTo === '1'} onToggle={() => patch({ usageUpTo: draft.usageUpTo ? undefined : '1' })} label="+ lower ranks" title="Also include every more frequent rank above the selected group"/>}</span>}
          {k !== 'Strokes' && <span className="filter-field-row"><Select value={draft.strokes || 'all'} onValueChange={value => patch({ strokes: value === 'all' ? '' : value })}><SelectTrigger className="filter-select reuse-filter" aria-label="Filter by stroke count"><SelectValue>{draft.strokes ? `${draft.strokes} ${draft.strokes === '1' ? 'stroke' : 'strokes'}` : 'All stroke counts'}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All stroke counts</SelectItem>{draft.strokes && !strokeCounts.includes(Number(draft.strokes)) && <SelectItem value={draft.strokes} disabled>{draft.strokes} {draft.strokes === '1' ? 'stroke' : 'strokes'} · No matches</SelectItem>}{strokeCounts.map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'stroke' : 'strokes'}</SelectItem>)}</SelectContent></Select>{draft.strokes && <FilterWideningToggle active={draft.strokesUpTo === '1'} onToggle={() => patch({ strokesUpTo: draft.strokesUpTo ? undefined : '1' })} label="+ fewer strokes" title="Also include every smaller stroke count"/>}</span>}
          {/* Radicals are records of their own here, so the tab can hide them; the switch is a
              drafted filter like the others, applied with Apply/Enter and cleared by the X. */}
          {(k === 'Characters' || k === 'Components') && <span className="filter-field-row"><FilterWideningToggle active={draft.hideRadicals === '1'} onToggle={() => patch({ hideRadicals: draft.hideRadicals ? undefined : '1' })} label="Hide radicals" title="Hide records whose card is a Kangxi radical, such as 刀 or 木"/></span>}
        </>}>{({ draft, patch }) => <>
          <PinyinSearchInput value={draft.q} onChange={q => patch({ q })} py={draft.py} onPyChange={py => patch({ py })} ariaLabel="Search character library" placeholder="Search Chinese, pinyin or English…"/>
        </>}</DraftFilterForm>
        <LibraryTools sort={hasUsage ? <LibrarySort value={sort} onChange={next => set({ sort: next, seed: next === 'random' ? newShuffleSeed(seed) : undefined, page: 1, id: '', variant: undefined })} onReshuffle={() => set({ sort: 'random', seed: newShuffleSeed(seed), page: 1, id: '', variant: undefined })}/> : undefined} flashcards={k !== 'Strokes' ? { category: `Ref:${k.slice(0, -1)}`, ...(savedOnly ? { saved: true } : {}) } : undefined} drawing={k !== 'Strokes' ? { kind: k, ...(savedOnly ? { saved: true } : {}) } : undefined}/>
        <div className={`catalog-workspace ${cardRevealClass(preferences.cardReveal)}`}>{/* Grid character hints (own `gridHints` switch, apart from lessons and detail cards, which sit outside this provider; disabled on Strokes). */}<LessonHintsProvider enabled={k !== 'Strokes' && preferences.gridHints === true} backLabel={k}><section className="catalog-results" aria-label={`${k} results`} aria-busy={!catalogReady}>{filtered.length > 0 && <StickyPagination key={`sticky-${k}`} label={stickyLabel} current={paged.current} pages={paged.pages} onPageChange={setPage} watchRef={topPaginationRef}/>}{filtered.length > 0 && <CatalogPagination top innerRef={topPaginationRef} {...paginationProps} totalExtra={traditionalTotalExtra} />}<div ref={gridRef} className={`catalog-entry-grid ${preferences.libraryView === 'list' ? 'library-list-view' : ''}${catalogReady ? '' : ' is-loading'}`}>{!catalogReady && <GridCardPlaceholder/>}{paged.entries.map(entry => <MemoCatalogTile key={entry.id} entry={entry} kind={k} selected={selectedBookmarkId === entry.id} onSelect={selectTile} revealed={peek.revealed.has(entry.id)} onDetails={setSelectedId}/>)}</div>{!filtered.length && catalogReady && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={clearFilters}>Clear filters</Button></div>}
          <CatalogPagination {...paginationProps} />
        </section></LessonHintsProvider></div>
      </TabsContent>)}
    </Tabs>{selected && <DetailSheet open title={`Details for ${selected.hanzi} ${search.variant ?? ''}`} label={/* Back shows the exact form glyph, never its internal form key (140-1). */ selectedForm?.character ?? selected.hanzi} position={sheetIndex} total={filtered.length} onClose={() => { set({ id: '', variant: undefined, page: paged.current }, true); focusRecordCard(selectedBookmarkId ?? selected.id); }} onPrevious={sheetIndex > 0 ? () => stepTo(sheetIndex - 1) : undefined} onNext={sheetIndex >= 0 && sheetIndex < filtered.length - 1 ? () => stepTo(sheetIndex + 1) : undefined}><DetailLoading loading={detailLoading}><MemoCharacterDetails key={`${selected.id}:${search.variant ?? ''}`} entry={selected} kind={kind} variant={search.variant} /></DetailLoading></DetailSheet>}
  </div>;
}
