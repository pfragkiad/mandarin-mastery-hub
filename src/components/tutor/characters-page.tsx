import { MeaningText } from './meaning-text';
import { UsageLabel } from './usage-label';
import { DetailSheet } from './detail-sheet';
import { HintBody, SourceInfo } from '@/components/tutor/source-info';
import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPagination, StickyPagination } from './catalog-pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { nearestRecordedRank } from '@/lib/rank-jump';
import { useLibraryDensity } from './use-library-density';
import { useKeyboardPaging } from '@/lib/keyboard-paging';
import { Link } from '@tanstack/react-router';
import { Search, Volume2, Bookmark, Check, GitBranch, MessageSquareText, Type } from 'lucide-react';
import { PracticeIcon } from './practice-icons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { usageGroups, usageGroupLabel, usagePercentage, formatUsagePercentage, usageGroupFor, usageRank, parseUsageGroup, usageOrder } from '@/lib/usage-frequency';
import { libraryEntries, filterLibrary, libraryPage, libraryDestination, glyphIndex, glyphScript, plannedCounts, radicalVariantFallback, radicalVariantMeaning, radicalVariantEntry, savedGlyphEntry, savedGlyphDestination, type LibraryKind, type LibraryEntry } from '@/lib/character-library';
import { playCharacter, characterRecording, catalog, readingMeanings } from '@/lib/catalog-store';
import { strokeSpeech } from './stroke-practice';
import { useRecordScroll, focusRecordCard } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
import { glyphUsage } from '@/lib/glyph-usage';
import { radicalCardAvailability } from '@/lib/radical-card-availability';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { CardTopMeta, RecordCardFooter } from './record-card-footer';
import { TileSpeaker } from './tile-speaker';
import { GlyphUsageExamples, useGSourceParents } from './glyph-usage';
import { RecordDetailTitle } from './record-detail-title';
import { CharacterDecomposition } from './character-enrichment';
import { RadicalIdentityNote } from './radical-identity';
import { RadicalVariantEtymology } from './radical-variant-etymology';
import { radicalIdentity } from '@/lib/radical-identities';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { historicalRadicalHeading, orderedRadicalForms, radicalStrokes, radicalFamily, radicalForm } from '@/lib/radical-strokes';
import { DetailLoading, useDetailLoading } from './detail-loading';
import { DraftFilterForm } from './filter-form';
import { LibraryTools } from './library-tools';
import { cardRevealClass } from './card-reveal-toggle';
import { useCardPeek, isPlainCardDoubleClick } from './card-peek';
import { libraryFilterOptions } from '@/lib/library-filter-options';
import { RadicalForms } from './radical-forms';
import { ScriptForms, RelatedWrittenForms, cardFormRecords } from './script-forms';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { SoundChartLink } from './sound-chart-link';
import { ReadingMeanings } from './reading-meanings';
import { componentCardGlyphs, componentCardHead } from '@/lib/component-families';
import { collapseScriptForms, scriptGroup, scriptHead } from '@/lib/character-variants';
import { useActivePill } from '@/lib/use-active-pill';
import { useOneLineTitle } from './one-line-title';

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
 * each flagged with the purple rule above. */
function radicalCardForms(familyId: number) {
  const family = radicalFamily(familyId);
  const glyphs = family ? [...new Set(orderedRadicalForms(family).map(form => form.character))] : [];
  return glyphs.map((glyph, index) => ({ glyph, traditional: radicalFormIsTraditional(glyph, familyId, index === 0) }));
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
function TraditionalTabHint({ count, hint, tone = 'traditional' }: { count: number; hint: string; tone?: HintTone }) {
  return <Tooltip><TooltipTrigger asChild><span className={`catalog-tab-count catalog-tab-${tone}`} aria-label={`Plus ${count.toLocaleString('en-US')} ${hintNoun(tone)}. ${hint}`}>+{count.toLocaleString('en-US')}</span></TooltipTrigger>
    <TooltipContent side="bottom" align="start" collisionPadding={12} className={traditionalHintClass}><CountHintBody count={count} hint={hint} tone={tone}/></TooltipContent></Tooltip>;
}
/** Small-screen page-total version; hidden above 850px by CSS, where the tabs show the count. */
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
  const { script: headingScript, ...headingWithoutScript } = heading;
  const entry = form ? { ...headingWithoutScript, ...(exact?.script ? { script: exact.script } : {}), hanzi: form.character, strokes: form.strokeCount, pinyin: exact?.pinyin ?? '', meaning: exact?.meaning ?? '', note: `${form.strokeCount} strokes · Kangxi family #${heading.kangxiIndex} · ${form.formKind}` } : heading;
  const { preferences, saved, toggleSaved } = useWorkspace();
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  const noteRadical = entry.note.match(/·\s*(.+?) radical$/)?.[1] ?? (kind === 'Components' ? catalog.componentRadicals[entry.hanzi] : undefined);
  const kangxiNumber = kind === 'Radicals' ? heading.kangxiIndex : radicalIdentity(entry.hanzi).radicals[0]?.number;
  const radicalFact = (() => {
    if (kind === 'Strokes') return null;
    if (noteRadical && !(info.canonicalRadical && noteRadical === entry.hanzi)) {
      const identity = radicalIdentity(entry.hanzi).radicals.find(radical => radical.glyph === noteRadical);
      const destination = libraryDestination(noteRadical, preferences.includeTraditional);
      return <span className="facts-radical">{destination
        ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={identity ? `Open Kangxi radical ${identity.number}` : `Open radical ${noteRadical}`}><strong lang="zh-CN">{noteRadical}</strong></Link></Button>
        : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{noteRadical}</strong>}</span>;
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
  const perReading = kind === 'Characters' && !fallback ? readingMeanings(entry.hanzi) : null;
  const percentage = usagePercentage(heading.hanzi, kind, preferences.includeTraditional, heading.kangxiIndex);
  return <section className={`catalog-detail ${kind === 'Radicals' && historicalRadicalHeading(entry.hanzi, heading.kangxiIndex) ? 'historical-radical-detail' : ''}`} aria-label={`Details for ${entry.hanzi}`}>
    <RecordDetailTitle hanzi={entry.hanzi} pill={kind === 'Radicals' && kangxiNumber ? <span className="word-hsk-id" title="Official Kangxi radical index">Radical #{kangxiNumber}</span> : kind === 'Characters' || kind === 'Components' ? <span className="practice-kind">{kind === 'Components' ? 'Component' : info.label}</span> : undefined} forms={kind === 'Radicals' && heading.kangxiIndex ? <RadicalForms familyId={heading.kangxiIndex} selectedKey={form?.key ?? radicalFamily(heading.kangxiIndex)?.forms.find(item => item.character === heading.hanzi)?.key} hideLabel/> : (kind === 'Characters' || kind === 'Components') && cardFormRecords(entry.hanzi, kind, preferences.includeTraditional).length > 1 ? <ScriptForms glyph={entry.hanzi} kind={kind} grouping="card"/> : undefined} pinyin={fallback ? fallback.pinyin : info.componentName ? `Component name · ${info.reading}` : info.reading} pinyinFallback={fallback ? '' : info.readingFallback} meaning={kind === 'Radicals' && form && fallback ? `${fallback.meaning}; component form of ${fallback.headingGlyph}` : kind === 'Radicals' && form ? radicalVariantMeaning(entry.hanzi, info.meaning, heading.kangxiIndex) ?? info.meaning : kind === 'Components' && fallback?.meaning ? (/component form of/i.test(info.meaning) ? info.meaning : `${fallback.meaning} · ${info.meaning}`) : kind === 'Components' ? stripKangxiLabel(info.meaning) : info.meaning} script={entry.script} meaningContent={perReading ? <ReadingMeanings items={perReading}/> : undefined} pinyinContent={spoken && reading && isMultiReading(reading) ? <MultiReadingSpeakers spoken={spoken} reading={reading} variant="header" prefix={!fallback && info.componentName ? 'Component name · ' : undefined} onError={setAudioError} chartFrom={kind !== 'Strokes' ? entry.hanzi : undefined}/> : undefined} audio={<Button variant="ghost" size="icon" className={recording ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${spoken ?? entry.hanzi}` : `No audio available for ${spoken ?? entry.hanzi}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button>}
      // Beside the speaker: this exact reading's Sound chart card (Glyphs only, never Strokes).
      chartLink={kind !== 'Strokes' && reading ? <SoundChartLink reading={reading} from={entry.hanzi} variant="header"/> : undefined}/>
    {audioError && <p role="status" className="library-note">{audioError}</p>}
    {/* Facts sit directly under the title on every glyph detail card, before variant spelling and etymology notes. */}
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? (kind === 'Strokes' ? 1 : 'Not recorded')}</dd></div>{strokeNameFact}{radicalFact && kind !== 'Radicals' && <div><dt>Radical</dt><dd>{radicalFact}</dd></div>}{kind === 'Strokes' && <div><dt>Record</dt><dd className="catalog-record-value">{info.label}</dd></div>}{(kind === 'Characters' || kind === 'Components' || kind === 'Radicals') && usageOrder.loaded && <div><dt className="catalog-rank-label">Rank<SourceInfo inline className="detail-footnote">{kind === 'Characters' ? 'Corpus frequency rank' : `Estimated ${kind === 'Radicals' ? 'radical assignment' : 'component exposure'} rank, derived from character frequencies`} · {usageOrder.data?.source.provider ?? 'Jun Da Modern Chinese corpus'}{kind === 'Characters' ? ' · Percentage is this character’s share of corpus tokens.' : kind === 'Components' ? ' · Percentage is this component’s share of weighted known-leaf occurrences; not character corpus coverage.' : kind === 'Radicals' ? ' · Share of matched corpus tokens assigned to this Kangxi family, not graphical radical occurrences.' : ''}</SourceInfo></dt><dd><UsageLabel rank={usageRank(heading, kind, preferences.includeTraditional)} kind={kind}/></dd></div>}{percentage !== null && <div><dt>{kind === 'Characters' ? 'Corpus frequency' : kind === 'Radicals' ? 'Radical assignment share' : 'Occurrence share'}</dt><dd>{formatUsagePercentage(percentage)}</dd></div>}</dl>
    {/* Context-dependent simplified/traditional associations keep separate cards; Variant spelling links them with the recorded explanation. */}
    {(kind === 'Characters' || kind === 'Components') && <RelatedWrittenForms glyph={entry.hanzi} kind={kind}/>}
    {/* Etymology audit notes belong to radical variant cards only (below the facts), never the family's main form. */}
    {kind === 'Radicals' && form && heading.kangxiIndex && form.character !== heading.hanzi && <RadicalVariantEtymology familyId={heading.kangxiIndex} formKey={form.key} reading={fallback?.pinyin ?? info.reading}/>}
    {info.component && !fallback && <p className="catalog-record-note">{info.componentName ? `${info.componentName.text} is a component name, not a standalone character reading.` : info.characterPinyin ? 'Radical form that is also an ordinary character.' : 'No standalone character pronunciation is assigned to this form.'}</p>}
    {(kind === 'Components' || kind === 'Characters') && radicalIdentity(entry.hanzi).radicals.length > 0 && <RadicalIdentityNote glyph={entry.hanzi}/>}
    {kind !== 'Strokes' && <GlyphUsageExamples entry={entry} kind={kind} familyGlyph={kind === 'Radicals' ? heading.hanzi : undefined}/>}
    {/* Radical detail cards (every form) omit the stroke breakdown; Practice keeps the recorded strokes. */}
    {kind !== 'Strokes' && kind !== 'Radicals' && !((kind === 'Components' || kind === 'Characters') && kangxiNumber) && entry.decomposition && <div className="decomposition-section"><h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION{entry.decomposition && <SourceInfo inline className="detail-footnote decomposition-footnote">Breakdowns follow source priority · BabelStone G-source first, then the recorded Hanzi graphical structure when it differs.<br/>IDS describes graphical structure only · not verified etymology or stroke geometry.<br/>Components link to their library cards.</SourceInfo>}</h3>
      {entry.decomposition ? <CharacterDecomposition character={entry.hanzi} tree={entry.decomposition.root} source={entry.decomposition.source} status={entry.decomposition.status}/> : <div className="record-gap"><p>No recorded decomposition available yet.</p><small>This record has no breakdown in the imported sources. None is inferred.</small></div>}
    </div>}
    {/* Reference label and the record actions share the bottom row: label left, actions right. */}
    <div className="detail-reference-row"><div className="eyebrow detail-reference-label">{info.label.toUpperCase()} REFERENCE<SourceInfo inline className="detail-footnote">{info.source ?? 'Unicode Unihan 17.0.0 readings and meanings.'}</SourceInfo></div><div className="word-detail-actions"><Button asChild variant="outline" size="sm"><Link to="/strokes" search={kind === 'Strokes' ? { stroke: entry.hanzi, mode: 'trace' } : { character: entry.hanzi, mode: 'trace', ...(form ? { family: heading.kangxiIndex, variant: form.key } : {}) }}><PracticeIcon/>Practice writing</Link></Button><Button variant="outline" size="sm" onClick={() => toggleSaved(bookmarkId)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save glyph'}</Button></div></div>
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
function CatalogTile({ entry, kind, selected, onSelect, revealed = false, onDetails }: { entry: LibraryEntry; kind: LibraryKind; selected: boolean; onSelect: (id: string) => void; revealed?: boolean; onDetails?: (id: string) => void }) {
  const { preferences, saved, toggleSaved, items, catalogVersion } = useWorkspace();
  const gSourceParents = useGSourceParents(entry, kind, preferences.includeTraditional, catalogVersion);
  const familyAvailability = useMemo(() => kind === 'Radicals' ? radicalCardAvailability(entry, libraryEntries('Characters'), preferences.includeTraditional) : null, [entry, kind, preferences.includeTraditional, catalogVersion]);
  const hasExample = useMemo(() => kind === 'Components' ? (gSourceParents?.length ?? 0) > 0 : familyAvailability ? familyAvailability.example : glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional).length > 0, [entry, kind, items, preferences.includeTraditional, catalogVersion, gSourceParents, familyAvailability]);
  // Saved variant cards carry their exact family + form key; ordinary cards pass neither.
  const fallback = kind === 'Radicals' || kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin, entry.radicalVariant ? entry.kangxiIndex : undefined, entry.radicalVariant) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const [audioError, setAudioError] = useState<string | null>(null);
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  const tileMeaning = kind === 'Components' && fallback?.meaning ? (/component form of/i.test(info.meaning) ? info.meaning : `${fallback.meaning} · ${info.meaning}`) : kind === 'Radicals' || kind === 'Components' ? stripKangxiLabel(info.meaning) : info.meaning;
  const componentRadical = kind === 'Components' ? radicalIdentity(entry.hanzi).radicals : info.canonicalRadical ? [info.canonicalRadical] : [];
  // Radicals never show a breakdown (their strokes live in Practice), so their cards carry no indicator either.
  const hideDecomposition = kind === 'Radicals' || ((kind === 'Characters' || kind === 'Components') && radicalIdentity(entry.hanzi).radicals.length > 0);
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
  const radicalTile = isRadicalGlyph(entry, kind);
  // Characters cards also show their recorded traditional forms (Unihan script groups) beside the simplified head;
  // Components cards do the same but only with forms that exist as Components records.
  // Components cards also show their radical-family forms (刀 刂 ⺈, component-families.ts).
  // Only a card's head shows the group: a Saved card of 爺 or 刂 keeps just its exact form.
  const scriptForms = kind === 'Characters' && preferences.includeTraditional ? scriptGroup(entry.hanzi) : [entry.hanzi];
  const displayedForms = family ? radicalCardForms(family.id).map(form => form.glyph) : kind === 'Components' ? componentCardForms(entry, preferences.includeTraditional) : scriptForms[0] === entry.hanzi ? scriptForms : [entry.hanzi];
  const primaryForm = displayedForms[0] ?? entry.hanzi;
  // Several tiles: one count per tile in tile order ("10 / 15 strokes"), traditional counts purple.
  const multiStrokes = displayedForms.length > 1 ? formStrokeCounts(displayedForms, entry, kind, family?.id) : null;
  // Characters cards grouping script forms (郁 / 鬱) show each form's own recorded translation when they
  // differ, joined by " / " in tile order, traditional ones purple; identical or empty ones collapse
  // (预 / 預 keeps one line). Components and radical family cards keep their single family meaning.
  const formMeanings = kind === 'Characters' && multiStrokes ? multiStrokes.reduce<{ text: string; traditional: boolean }[]>((list, form, index) => {
    const text = index === 0 ? tileMeaning : libraryRecords('Characters').get(form.glyph)?.meaning ?? '';
    return text && !list.some(item => item.text === text) ? [...list, { text, traditional: form.traditional }] : list;
  }, []) : [];
  const meaningText = formMeanings.length > 1 ? <>{formMeanings.map((item, index) => <Fragment key={item.text}>{index > 0 && ' / '}<span className={item.traditional ? 'traditional-character' : undefined}><MeaningText text={item.text}/></span></Fragment>)}</> : <MeaningText text={tileMeaning}/>;
  const tile = <Button ref={tileRef} variant="ghost" className="word-open catalog-entry" aria-label={label} aria-pressed={selected} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} onClick={() => onSelect(entry.id)}>
      <span className="word-character">{hasPinyin && spoken && reading && kind !== 'Strokes' && isMultiReading(reading) ? <span className="pinyin"><MultiReadingSpeakers spoken={spoken} reading={reading} variant="tile" textClassName="pinyin-text" prefix={!fallback && info.componentName ? 'Name · ' : undefined} onError={setAudioError} chartFrom={preferences.soundChartLinks !== false ? entry.hanzi : undefined}/></span> : hasPinyin ? <span className="pinyin"><span className="pinyin-text">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/>{kind !== 'Strokes' && reading && preferences.soundChartLinks !== false && <SoundChartLink reading={reading} from={entry.hanzi} variant="tile"/>}</span> : <span className="pinyin"><span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/></span>}<span className="tile-hanzi-row"><strong lang="zh-CN" className={`tile-form ${(family ? radicalFormIsTraditional(primaryForm, family.id, true) : entry.script === 'Traditional') ? 'traditional-character' : ''}${radicalTile ? ' is-radical' : ''}`}>{primaryForm}</strong>{displayedForms.slice(1).map(glyph => <span key={glyph} lang="zh-CN" className={`tile-form ${(family ? radicalFormIsTraditional(glyph, family.id, false) : historicalRadicalHeading(glyph, entry.kangxiIndex) || glyphScript(glyph) === 'Traditional') ? 'traditional-character' : ''}${radicalTile ? ' is-radical' : ''}`}>{glyph}</span>)}</span></span>
      {hasMeaning ? <span className="word-meaning catalog-entry-meaning">{meaningText}</span> : <span className="tile-absent catalog-entry-meaning">no meaning</span>}
    </Button>;
  const strokesText = multiStrokes ? <>{multiStrokes.map((form, index) => <Fragment key={form.glyph}>{index > 0 && ' / '}<span className={form.traditional ? 'traditional-character' : undefined} title={form.strokes === undefined ? `Stroke count not recorded for ${form.glyph}` : `${form.glyph}: ${form.strokes} strokes`}>{form.strokes ?? '–'}</span></Fragment>)} strokes</> : <><span className={entry.script === 'Traditional' ? 'traditional-character' : undefined}>{entry.strokes}</span> strokes</>;
  const hasStrokes = multiStrokes ? multiStrokes.some(form => form.strokes !== undefined) : entry.strokes !== undefined;
  const metadata = kind !== 'Strokes' && usageOrder.loaded ? <><UsageLabel rank={kind === 'Components' ? componentCardRank(entry, displayedForms, preferences.includeTraditional) : usageRank(entry, kind, preferences.includeTraditional)} kind={kind} compact/>{hasStrokes && <span className="usage-strokes"> · {strokesText}</span>}</> : hasStrokes ? <span className="usage-strokes">{strokesText}</span> : info.component || kind === 'Components' ? 'Component form' : kind === 'Strokes' ? null : 'Stroke count not recorded';
  // Stroke cards already read "STROKE" in their label, so they carry no repeated
  // "Stroke" metadata in the header or footer (null skips CardTopMeta's dot too).
  // The clipped-translation hint is portaled outside the grid, so the grid's
  // `reveal-hide-*` CSS cannot reach it: mirror the active Hide mode here. A card
  // the learner has peeked (`revealed`) shows everything, matching the card itself.
  // Hiding the translation suppresses the hint entirely, since the hint is the translation.
  const hiddenFace = revealed ? 'all' : preferences.cardReveal;
  const hideMeaning = hiddenFace === 'meaning' || hiddenFace === 'pinyin-meaning';
  const hideHanzi = hiddenFace === 'hanzi';
  const hidePinyin = hiddenFace === 'pinyin' || hiddenFace === 'pinyin-meaning';
  // `is-traditional` marks traditional-script records so hover/selected/reveal frames tint purple (see styles.css `.word-card.is-traditional`).
  // Every other glyph card takes one identity ink (styles.css `.card-ink-*`) for its hanzi, hover/selected
  // frame and hovered translation: gold for sourced Kangxi radicals (radicalTile, so a Character or Component
  // that is itself a radical reads gold), green for Characters, foreground for Components. Traditional wins,
  // then radical; Strokes cards keep the default accent.
  // Shared with Start's random cards (src/lib/card-ink.ts); `is-traditional` itself is added below.
  const ink = glyphCardInk(kind, entry.script, radicalTile);
  const cardInk = ink ? `card-ink${ink === 'is-traditional' ? '' : ` ${ink}`}` : '';
  return <article data-entry-id={entry.id} className={`word-card catalog-card ${kind === 'Radicals' ? 'radical-family-card' : ''} ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${cardInk} ${selected ? 'is-selected' : ''} ${revealed ? 'is-revealed' : ''}`} onDoubleClick={event => { if (onDetails && isPlainCardDoubleClick(preferences.cardReveal, event.target)) onDetails(entry.id); }}>
    <div className="word-card-top"><span className="word-level-wrap"><span className="word-level">{info.label.toUpperCase()}</span>{metadata !== null && <CardTopMeta>{metadata}</CardTopMeta>}{entry.kangxiIndex !== undefined && <span className="word-hsk-id" title="Official Kangxi radical index" aria-label={`Kangxi radical ${entry.kangxiIndex}`}>Radical #{entry.kangxiIndex}</span>}{componentRadical.length === 1 && componentRadical[0] && <span className="word-hsk-id" title="Sourced Kangxi radical identity">Radical #{componentRadical[0].number}</span>}{entry.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}</span><span className="catalog-card-indicators">{hasExample && (kind === 'Components' || kind === 'Radicals' ? <span title="In a character available"><Type className="catalog-source-icon" aria-label="In a character available"/></span> : <span title="In a sentence available"><MessageSquareText className="catalog-source-icon" aria-label="In a sentence available"/></span>)}{!hideDecomposition && entry.decomposition && <span title="Decomposition available"><GitBranch className="catalog-source-icon" aria-label="Decomposition available"/></span>}</span></div>
    <Tooltip open={clipped && engaged}><TooltipTrigger asChild>{tile}</TooltipTrigger>
    {clipped && !hideMeaning && <TooltipContent side={side} className="tile-tooltip"><span className="tile-tooltip-head">{!hideHanzi && <strong lang="zh-CN">{entry.hanzi}</strong>}{hidePinyin ? null : hasPinyin ? <span className="pinyin">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span> : <span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span>}</span><p className="tile-tooltip-meaning">{tileMeaning ? meaningText : <MeaningText text="No English meaning recorded in this source."/>}</p>{entry.script === 'Traditional' && <small className="traditional-label">Traditional</small>}</TooltipContent>}
  </Tooltip>
    <RecordCardFooter practice={kind === 'Strokes' ? { stroke: entry.hanzi } : { character: entry.hanzi, ...(entry.radicalVariant ? { family: entry.kangxiIndex, variant: entry.radicalVariant } : {}) }} metadata={metadata} hanzi={entry.hanzi} bookmarked={saved.includes(entry.id)} onBookmark={() => toggleSaved(entry.id)} {...(onDetails ? { onDetails: () => onDetails(entry.id) } : {})}/>
    {audioError && <p className="catalog-card-audio-error" role="status">{audioError}</p>}
  </article>;
}

const MemoCatalogTile = memo(CatalogTile, (a, b) => a.entry === b.entry && a.kind === b.kind && a.selected === b.selected && a.onSelect === b.onSelect && a.revealed === b.revealed && a.onDetails === b.onDetails);

export type CharactersSearch = { character?: string; tab?: LibraryKind; q?: string; strokes?: string; usage?: string | undefined; page?: number; id?: string; status?: 'saved' | undefined; py?: 'pinyin' | 'exact' | undefined; variant?: string | undefined };

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
  const usage = hasUsage ? parseUsageGroup(kind, search.usage) : undefined;
  const savedOnly = search.status === 'saved';
  const page = search.page ?? 1;
  const selectedId = search.id ?? glyphHit?.id ?? '';
  // No first-row fallback: ordinary visits and tab changes must not open a modal.
  // Explicit record IDs take precedence over glyph-only links to preserve kind.
  const clean = (s: CharactersSearch): CharactersSearch => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== '' && !(v === 1))) as CharactersSearch;
  const base: CharactersSearch = { variant: search.variant, tab: kind, q: query, strokes: strokeCount, usage, page, id: selectedId, status: search.status, py: search.py };
  const set = (patch: CharactersSearch, replace = false) => onSearch(clean({ ...base, ...patch }), replace);
  const appliedFilters = { q: query, strokes: strokeCount, usage, py: search.py };
  const activeFilters = Boolean(query || strokeCount || usage || search.py || savedOnly);
  const clearFilters = () => { set({ q: '', strokes: '', usage: undefined, py: undefined, status: undefined, page: 1, id: '', variant: undefined }); };
  const setPage = (p: number) => set({ page: p, id: '' });
  const detailLoading = useDetailLoading();
  const setSelectedId = (id: string) => { void detailLoading.run(id, () => { const entry = savedGlyphEntry(id); return set(entry ? { ...savedGlyphDestination(entry), variant: entry.radicalVariant } : { id, variant: undefined }); }); };
  const entries = useMemo(() => libraryEntries(kind), [kind, catalogVersion]);
  const compatibleFilters = kind === 'Characters' || kind === 'Components';
  // Only applied opposite filters drive availability. Draft edits stay inside
  // the form, keeping the scan independent of typing and detail selection.
  const availableOptions = useMemo(() => libraryFilterOptions(entries, kind, preferences.includeTraditional, usage, strokeCount), [entries, kind, preferences.includeTraditional, usage, strokeCount, catalogVersion]);
  const strokeCounts = useMemo(() => compatibleFilters ? availableOptions.strokes : Array.from(new Set(entries.flatMap(e => e.strokes ? [e.strokes] : []))).sort((a,b) => a-b), [entries, compatibleFilters, availableOptions]);
  const rankGroups = compatibleFilters ? availableOptions.ranks : usageGroups(kind);
  const requestedHeading = entries.find(entry => entry.id === selectedId);
  const requestedForm = requestedHeading?.kangxiIndex ? radicalForm(requestedHeading.kangxiIndex, search.variant) : undefined;
  const requestedId = requestedHeading && requestedForm ? radicalVariantEntry(requestedHeading, requestedForm).id : selectedId;
  const browsedRecords = filterLibrary(entries, query, strokeCount, false, preferences.includeTraditional, usage, savedOnly ? saved : undefined, pinyinOnly, search.py === 'exact');
  // Grouped traditional records share their simplified card (a search hitting only 爺 shows 爷's card).
  // Saved browsing keeps exact bookmarked records, so a saved 爺 stays its own card there.
  // Applies to Characters and Components alike (each groups only within its own library).
  // Components additionally fold radical-family forms (刂, ⺈) into their main form's card,
  // independent of the Traditional preference (component-families.ts decides membership).
  const groupScripts = !savedOnly && ((kind === 'Characters' && preferences.includeTraditional) || kind === 'Components');
  const cardHead = (glyph: string) => kind === 'Components' ? componentCardHead(glyph, preferences.includeTraditional) : scriptHead(glyph);
  const browsed = groupScripts ? collapseScriptForms(browsedRecords, entries, cardHead) : browsedRecords;
  // A selected traditional form is shown in the sheet, but its card, paging and arrows are the head's
  // (when the head exists in this library; otherwise the form keeps its own card).
  const cardSelectedId = groupScripts && selectedId.startsWith(`${kind}:`) && entries.some(entry => entry.id === `${kind}:${cardHead(selectedId.slice(kind.length + 1))}`) ? `${kind}:${cardHead(selectedId.slice(kind.length + 1))}` : selectedId;
  const filtered = includeSelectedRecord(requestedHeading && requestedForm ? [...entries, radicalVariantEntry(requestedHeading, requestedForm)] : entries, browsed, savedOnly ? requestedId : cardSelectedId);
  // Preserve explicitly selected records even when browsing filters exclude them;
  // density-aware paging then reveals their exact card, including saved variants.
  const density = useLibraryDensity(() => set({ page: 1, id: '', variant: undefined }));
  const paged = libraryPage(filtered, page, density.size, savedOnly ? requestedId : cardSelectedId);
  // Hide modes: a click toggles the card's peek (reveal, then click again to hide);
  // reset on tab/page/filter change.
  const peek = useCardPeek(preferences.cardReveal, `${kind}|${paged.current}|${filtered.length}|${savedOnly}|${JSON.stringify(appliedFilters)}`, preferences.rememberCardReveals);
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
      const list = filterLibrary(libraryEntries(k), '', '', false, preferences.includeTraditional);
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
  // Phones hide the kind tabs (and their purple "+N"), so the top page counter
  // repeats it after the card total. Only on the unfiltered All view, where the
  // total equals the tab's card count the hint describes.
  const sharedHere = sharedTraditional[kind] ?? 0;
  const traditionalTotalHint = sharedHere > 0 && !savedOnly && !query && !strokeCount && !usage && tabCounts?.[kind] === filtered.length
    ? (kind === 'Radicals' ? radicalTraditionalCountHint(sharedHere) : traditionalCountHint(sharedHere, standaloneTraditional[kind] ?? 0, filtered.length))
    : undefined;
  const unfilteredAll = !savedOnly && !query && !strokeCount && !usage && tabCounts?.[kind] === filtered.length;
  const familyTotalExtra = kind === 'Components' && sharedFamily > 0 && unfilteredAll ? <TraditionalTotalHint tone="family" count={sharedFamily} hint={familyCountHint(sharedFamily)}/> : null;
  const traditionalTotalExtra = traditionalTotalHint || familyTotalExtra ? <>{traditionalTotalHint ? <TraditionalTotalHint count={sharedHere} hint={traditionalTotalHint}/> : null}{familyTotalExtra}</> : undefined;
  const paginationProps = {
    filterKey: JSON.stringify([kind, appliedFilters, savedOnly, preferences.includeTraditional]),
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
    if (rankedTotal > 0) {
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
  // card count and coloured "+N" extras, the same numbers the old tabs showed.
  usePublishSections('glyphs', tabCounts ? Object.fromEntries(kinds.map(k => {
    const traditional = sharedTraditional[k] ?? 0;
    const extras: SectionExtra[] = [];
    if (traditional > 0) extras.push({ tone: 'traditional', count: traditional, hint: k === 'Radicals' ? radicalTraditionalCountHint(traditional) : traditionalCountHint(traditional, standaloneTraditional[k] ?? 0, tabCounts[k] ?? plannedCounts[k]) });
    if (k === 'Components' && sharedFamily > 0) extras.push({ tone: 'family', count: sharedFamily, hint: familyCountHint(sharedFamily) });
    return [k, { count: tabCounts[k] ?? plannedCounts[k], extras }];
  })) : Object.fromEntries(kinds.map(k => [k, { count: plannedCounts[k] }])), { active: kind });
  // The title must stay on one line at every width; the hook lowers its font size as needed.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(titleRef, kind);
  const updateKind = (value: string) => { const next = kinds.find(k => k === value); if (!next) return; onSearch({ ...(next === 'Characters' ? {} : { tab: next }), ...(savedOnly ? { status: 'saved' } : {}) }); };
  void catalogVersion;
  const sheetIndex = selectedId ? filtered.findIndex(entry => entry.id === (savedOnly ? requestedId : cardSelectedId)) : -1;
  // Modal arrows traverse the full filtered order, not just the visible page.
  // Store the target page with the selection so closing reveals that record.
  const stepTo = (index: number) => { const target = filtered[index]; if (target) void detailLoading.run(target.id, () => set({ ...savedGlyphDestination(target), variant: target.radicalVariant, page: Math.floor(index / density.size) + 1 })); };
  return <div className="page-enter library-page"><div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">{catalogReady ? (kind === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Preferences.' : glyphsMotto) : `Loading ${plannedCounts[kind].toLocaleString('en-US')} records…`}</div><h1 ref={titleRef}>Get to know the {kind.toLowerCase()}.<SourceInfo inline className="detail-footnote">{catalogReady ? (kind === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Preferences.' : kindNotes[kind]) : `Loading ${plannedCounts[kind].toLocaleString('en-US')} records…`}</SourceInfo></h1></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} onValueChange={updateKind} className="catalog-tabs"><div className="vocabulary-category-row glyph-category-row"><div className="vocabulary-saved-filter" aria-label="Saved glyphs">{['all', 'saved'].map(status => <Button key={status} variant="ghost" className={(status === 'saved') === savedOnly ? 'selected' : ''} aria-pressed={(status === 'saved') === savedOnly} onClick={() => set({ status: status === 'saved' ? 'saved' : undefined, page: 1, id: '' })}>{status === 'saved' ? 'Saved' : 'All'}{status === 'saved' && <span className="catalog-tab-count">{filterLibrary(libraryEntries(kind), '', '', false, preferences.includeTraditional, undefined, saved).length}</span>}</Button>)}</div></div>
      {kinds.map(k => <TabsContent value={k} key={k}>
        <DraftFilterForm showCount={false} searchKey="q" searchModeKey="py" applied={appliedFilters} active={activeFilters} count={filtered.length} onApply={draft => set({ ...draft, page: 1, id: '', variant: undefined })} onClear={() => { clearFilters(); return { q: '', strokes: '', usage: undefined, py: undefined }; }} chips={[...(appliedFilters.usage ? [{ label: usageGroups(kind).find(group => group.value === appliedFilters.usage)?.label ?? appliedFilters.usage, clear: { usage: undefined } }] : []), ...(appliedFilters.strokes ? [{ label: `${appliedFilters.strokes} strokes`, clear: { strokes: '' } }] : [])]} filterFields={({ draft, patch }) => <>
          {hasUsage && <Select value={draft.usage ?? 'all'} onValueChange={value => patch({ usage: parseUsageGroup(kind, value) })}><SelectTrigger className="filter-select reuse-filter" aria-label="Filter by frequency"><SelectValue>{draft.usage ? usageGroups(kind).find(group => group.value === draft.usage)?.label : 'All ranks'}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All ranks</SelectItem>{draft.usage && !rankGroups.some(group => group.value === draft.usage) && <SelectItem value={draft.usage} disabled>{usageGroups(kind).find(group => group.value === draft.usage)?.label} · No matches</SelectItem>}{rankGroups.map(group => <SelectItem key={group.value} value={group.value}>{usageGroupLabel(group, kind, preferences.includeTraditional)}</SelectItem>)}</SelectContent></Select>}
          {k !== 'Strokes' && <select className="filter-select" aria-label="Filter by stroke count" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}><option value="">All stroke counts</option>{draft.strokes && !strokeCounts.includes(Number(draft.strokes)) && <option value={draft.strokes} disabled>{draft.strokes} strokes · No matches</option>}{strokeCounts.map(n => <option key={n} value={n}>{n} strokes</option>)}</select>}
        </>}>{({ draft, patch }) => <>
          <div className="search-field"><Search/><input aria-label="Search character library" placeholder="Search Chinese, pinyin or English…" value={draft.q} onChange={e => patch({ q: e.target.value })}/><Button variant="ghost" type="button" className={`search-toggle${draft.py ? ' on' : ''}`} aria-pressed={Boolean(draft.py)} title="Search pinyin only" onClick={() => patch({ py: draft.py ? undefined : 'pinyin' })}>Pinyin</Button>{draft.py && <Button variant="ghost" type="button" className={`search-toggle${draft.py === 'exact' ? ' on' : ''}`} aria-pressed={draft.py === 'exact'} title="Match the exact pinyin reading only" onClick={() => patch({ py: draft.py === 'exact' ? 'pinyin' : 'exact' })}>Exact</Button>}</div>
        </>}</DraftFilterForm>
        <LibraryTools category={savedOnly ? 'Saved' : `Ref:${k.slice(0, -1)}`} drawing={k !== 'Strokes' ? { kind: k, ...(savedOnly ? { saved: true } : {}) } : undefined}/>
        <div className={`catalog-workspace ${cardRevealClass(preferences.cardReveal)}`}><section className="catalog-results" aria-label={`${k} results`}>{filtered.length > 0 && <StickyPagination key={`sticky-${k}`} label={stickyLabel} current={paged.current} pages={paged.pages} onPageChange={setPage} watchRef={topPaginationRef}/>}{filtered.length > 0 && <CatalogPagination top innerRef={topPaginationRef} {...paginationProps} totalExtra={traditionalTotalExtra} />}<div className={`catalog-entry-grid ${preferences.libraryView === 'list' ? 'library-list-view' : ''}`}>{paged.entries.map(entry => <MemoCatalogTile key={entry.id} entry={entry} kind={k} selected={selectedBookmarkId === entry.id} onSelect={selectTile} revealed={peek.revealed.has(entry.id)} onDetails={setSelectedId}/>)}</div>{!filtered.length && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={clearFilters}>Clear filters</Button></div>}
          <CatalogPagination {...paginationProps} />
        </section></div>
      </TabsContent>)}
    </Tabs>{selected && <DetailSheet open title={`Details for ${selected.hanzi} ${search.variant ?? ''}`} label={/* Back shows the exact form glyph, never its internal form key (140-1). */ selectedForm?.character ?? selected.hanzi} position={sheetIndex} total={filtered.length} onClose={() => { set({ id: '', variant: undefined, page: paged.current }, true); focusRecordCard(selectedBookmarkId ?? selected.id); }} onPrevious={sheetIndex > 0 ? () => stepTo(sheetIndex - 1) : undefined} onNext={sheetIndex >= 0 && sheetIndex < filtered.length - 1 ? () => stepTo(sheetIndex + 1) : undefined}><DetailLoading loading={detailLoading}><MemoCharacterDetails key={`${selected.id}:${search.variant ?? ''}`} entry={selected} kind={kind} variant={search.variant} /></DetailLoading></DetailSheet>}
  </div>;
}
