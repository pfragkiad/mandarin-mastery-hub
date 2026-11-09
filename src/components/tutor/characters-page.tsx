import { MeaningText } from './meaning-text';
import { UsageLabel } from './usage-label';
import { DetailSheet } from './detail-sheet';
import { SourceInfo } from '@/components/tutor/source-info';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPagination, StickyPagination } from './catalog-pagination';
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
import { playCharacter, characterRecording, catalog } from '@/lib/catalog-store';
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
import { glyphPresentation } from '@/lib/glyph-presentation';
import { historicalRadicalHeading, orderedRadicalForms, radicalStrokes, radicalFamily, radicalForm } from '@/lib/radical-strokes';
import { DetailLoading, useDetailLoading } from './detail-loading';
import { DraftFilterForm } from './filter-form';
import { LibraryTools } from './library-tools';
import { cardRevealClass } from './card-reveal-toggle';
import { useCardPeek } from './card-peek';
import { libraryFilterOptions } from '@/lib/library-filter-options';
import { RadicalForms } from './radical-forms';
import { RadicalStrokeDecomposition, RadicalStrokeSourceInfo } from './radical-stroke-decomposition';

const kinds: LibraryKind[] = ['Characters', 'Components', 'Radicals', 'Strokes'];
const kindNotes: Record<LibraryKind, string> = { Characters: 'Traditional forms marked from Unihan variant data', Radicals: 'Kangxi families · Unihan 17.0.0 · variants: cjklib C-locale', Components: 'Make Me a Hanzi components', Strokes: 'Unicode 18.0 stroke inventory' };
// Motivational small-caps line shared by every tab of the Glyphs section;
// per-tab provenance stays in the (i) beside the title (kindNotes).
const glyphsMotto = 'STUDY THE BLOCKS · ONE CHARACTER AT A TIME';
/** Strokes speak their recorded Chinese name (㇐ → 横); other glyphs speak themselves. */
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
  const fallback = form && form.character !== heading.hanzi ? radicalVariantFallback(entry.hanzi, entry.pinyin) : kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null);
  const percentage = usagePercentage(heading.hanzi, kind, preferences.includeTraditional, heading.kangxiIndex);
  return <section className={`catalog-detail ${kind === 'Radicals' && historicalRadicalHeading(entry.hanzi, heading.kangxiIndex) ? 'historical-radical-detail' : ''}`} aria-label={`Details for ${entry.hanzi}`}>
    <RecordDetailTitle hanzi={entry.hanzi} pill={kind === 'Radicals' && kangxiNumber ? <span className="word-hsk-id" title="Official Kangxi radical index">Radical #{kangxiNumber}</span> : kind === 'Characters' || kind === 'Components' ? <span className="practice-kind">{kind === 'Components' ? 'Component' : info.label}</span> : undefined} forms={kind === 'Radicals' && heading.kangxiIndex ? <RadicalForms familyId={heading.kangxiIndex} selectedKey={form?.key ?? radicalFamily(heading.kangxiIndex)?.forms.find(item => item.character === heading.hanzi)?.key} hideLabel/> : undefined} pinyin={fallback ? fallback.pinyin : info.componentName ? `Component name · ${info.reading}` : info.reading} pinyinFallback={fallback ? '' : info.readingFallback} meaning={kind === 'Radicals' && form && fallback ? `${fallback.meaning}; component form of ${fallback.headingGlyph}` : kind === 'Radicals' && form ? radicalVariantMeaning(entry.hanzi, info.meaning, heading.kangxiIndex) ?? info.meaning : kind === 'Components' && fallback?.meaning ? (/component form of/i.test(info.meaning) ? info.meaning : `${fallback.meaning} · ${info.meaning}`) : kind === 'Components' ? stripKangxiLabel(info.meaning) : info.meaning} script={entry.script} audio={<Button variant="ghost" size="icon" className={recording ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${spoken ?? entry.hanzi}` : `No audio available for ${spoken ?? entry.hanzi}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button>}/>
    {/* Etymology audit notes belong to radical variant cards only (directly below the translation), never the family's main form. */}
    {kind === 'Radicals' && form && heading.kangxiIndex && form.character !== heading.hanzi && <RadicalVariantEtymology familyId={heading.kangxiIndex} formKey={form.key} reading={fallback?.pinyin ?? info.reading}/>}
    {audioError && <p role="status" className="library-note">{audioError}</p>}
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? (kind === 'Strokes' ? 1 : 'Not recorded')}</dd></div>{strokeNameFact}{radicalFact && kind !== 'Radicals' && <div><dt>Radical</dt><dd>{radicalFact}</dd></div>}{kind === 'Strokes' && <div><dt>Record</dt><dd className="catalog-record-value">{info.label}</dd></div>}{(kind === 'Characters' || kind === 'Components' || kind === 'Radicals') && usageOrder.loaded && <div><dt className="catalog-rank-label">Rank<SourceInfo inline className="detail-footnote">{kind === 'Characters' ? 'Corpus frequency rank' : `Estimated ${kind === 'Radicals' ? 'radical assignment' : 'component exposure'} rank, derived from character frequencies`} · {usageOrder.data?.source.provider ?? 'Jun Da Modern Chinese corpus'}{kind === 'Characters' ? ' · Percentage is this character’s share of corpus tokens.' : kind === 'Components' ? ' · Percentage is this component’s share of weighted known-leaf occurrences; not character corpus coverage.' : kind === 'Radicals' ? ' · Share of matched corpus tokens assigned to this Kangxi family, not graphical radical occurrences.' : ''}</SourceInfo></dt><dd><UsageLabel rank={usageRank(heading, kind, preferences.includeTraditional)} kind={kind}/></dd></div>}{percentage !== null && <div><dt>{kind === 'Characters' ? 'Corpus frequency' : kind === 'Radicals' ? 'Radical assignment share' : 'Occurrence share'}</dt><dd>{formatUsagePercentage(percentage)}</dd></div>}</dl>
    {info.component && !fallback && <p className="catalog-record-note">{info.componentName ? `${info.componentName.text} is a component name, not a standalone character reading.` : info.characterPinyin ? 'Radical form that is also an ordinary character.' : 'No standalone character pronunciation is assigned to this form.'}</p>}
    {(kind === 'Components' || kind === 'Characters') && radicalIdentity(entry.hanzi).radicals.length > 0 && <RadicalIdentityNote glyph={entry.hanzi}/>}
    {kind !== 'Strokes' && <GlyphUsageExamples entry={entry} kind={kind} familyGlyph={kind === 'Radicals' ? heading.hanzi : undefined}/>}
    {kind !== 'Strokes' && !((kind === 'Components' || kind === 'Characters') && kangxiNumber) && <div className="decomposition-section"><h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>{kind === 'Radicals' ? 'STROKE DECOMPOSITION' : 'DECOMPOSITION'}{kind === 'Radicals' ? <RadicalStrokeSourceInfo glyph={entry.hanzi} form={form}/> : entry.decomposition && <SourceInfo inline className="detail-footnote decomposition-footnote">Breakdowns follow source priority · BabelStone G-source first, then the recorded Hanzi graphical structure when it differs.<br/>IDS describes graphical structure only · not verified etymology or stroke geometry.<br/>Components link to their library cards.</SourceInfo>}</h3>
      {kind === 'Radicals' ? <RadicalStrokeDecomposition glyph={entry.hanzi} form={form} sourceInHeading/> : entry.decomposition ? <CharacterDecomposition character={entry.hanzi} tree={entry.decomposition.root} source={entry.decomposition.source} status={entry.decomposition.status}/> : <div className="record-gap"><p>No recorded decomposition available yet.</p><small>This record has no breakdown in the imported sources. None is inferred.</small></div>}
    </div>}
    {/* Reference label and the record actions share the bottom row: label left, actions right. */}
    <div className="detail-reference-row"><div className="eyebrow detail-reference-label">{info.label.toUpperCase()} REFERENCE<SourceInfo inline className="detail-footnote">{info.source ?? 'Unicode Unihan 17.0.0 readings and meanings.'}</SourceInfo></div><div className="word-detail-actions"><Button asChild variant="outline" size="sm"><Link to="/strokes" search={kind === 'Strokes' ? { stroke: entry.hanzi, mode: 'trace' } : { character: entry.hanzi, mode: 'trace', ...(form ? { family: heading.kangxiIndex, variant: form.key } : {}) }}><PracticeIcon/>Practice writing</Link></Button><Button variant="outline" size="sm" onClick={() => toggleSaved(bookmarkId)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save glyph'}</Button></div></div>
  </section>;
}
/** Tiles already show the Kangxi ID badge, so drop the redundant "Kangxi radical N" gloss fragment. */
export const stripKangxiLabel = (meaning: string) => meaning.split(/;\s*/).filter(part => !/^(?:Kangxi )?radical\s*#?\s*\d+$/i.test(part.trim())).join('; ') || meaning;
const MemoCharacterDetails = memo(CharacterDetails);

// `revealed` marks a card peeked in a Hide mode; `onDetails` is the only way to open the panel.
function CatalogTile({ entry, kind, selected, onSelect, revealed = false, onDetails }: { entry: LibraryEntry; kind: LibraryKind; selected: boolean; onSelect: (id: string) => void; revealed?: boolean; onDetails?: (id: string) => void }) {
  const { preferences, saved, toggleSaved, items, catalogVersion } = useWorkspace();
  const gSourceParents = useGSourceParents(entry, kind, preferences.includeTraditional, catalogVersion);
  const familyAvailability = useMemo(() => kind === 'Radicals' ? radicalCardAvailability(entry, libraryEntries('Characters'), preferences.includeTraditional) : null, [entry, kind, preferences.includeTraditional, catalogVersion]);
  const hasExample = useMemo(() => kind === 'Components' ? (gSourceParents?.length ?? 0) > 0 : familyAvailability ? familyAvailability.example : glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional).length > 0, [entry, kind, items, preferences.includeTraditional, catalogVersion, gSourceParents, familyAvailability]);
  const fallback = kind === 'Radicals' || kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const [audioError, setAudioError] = useState<string | null>(null);
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  const tileMeaning = kind === 'Components' && fallback?.meaning ? (/component form of/i.test(info.meaning) ? info.meaning : `${fallback.meaning} · ${info.meaning}`) : kind === 'Radicals' || kind === 'Components' ? stripKangxiLabel(info.meaning) : info.meaning;
  const componentRadical = kind === 'Components' ? radicalIdentity(entry.hanzi).radicals : info.canonicalRadical ? [info.canonicalRadical] : [];
  const hideDecomposition = (kind === 'Characters' || kind === 'Components') && radicalIdentity(entry.hanzi).radicals.length > 0;
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
  const displayedForms = family ? [...new Set(orderedRadicalForms(family).map(form => form.character))] : [entry.hanzi];
  const primaryForm = displayedForms[0] ?? entry.hanzi;
  const tile = <Button ref={tileRef} variant="ghost" className="word-open catalog-entry" aria-label={label} aria-pressed={selected} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} onClick={() => onSelect(entry.id)}>
      <span className="word-character">{hasPinyin ? <span className="pinyin"><span className="pinyin-text">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/></span> : <span className="pinyin"><span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span><TileSpeaker available={audioAvailable} hasRecording={Boolean(recording)} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/></span>}<span className="tile-hanzi-row"><strong lang="zh-CN" className={`tile-form ${(family ? historicalRadicalHeading(primaryForm, family.id) : entry.script === 'Traditional') ? 'traditional-character' : ''}`}>{primaryForm}</strong>{displayedForms.slice(1).map(glyph => <span key={glyph} lang="zh-CN" className={`tile-form ${historicalRadicalHeading(glyph, entry.kangxiIndex) || glyphScript(glyph) === 'Traditional' ? 'traditional-character' : ''}`}>{glyph}</span>)}</span></span>
      {hasMeaning ? <span className="word-meaning catalog-entry-meaning"><MeaningText text={tileMeaning}/></span> : <span className="tile-absent catalog-entry-meaning">no meaning</span>}
    </Button>;
  const metadata = kind !== 'Strokes' && usageOrder.loaded ? <><UsageLabel rank={usageRank(entry, kind, preferences.includeTraditional)} kind={kind} compact/>{entry.strokes !== undefined && <span className="usage-strokes"> · {entry.strokes} strokes</span>}</> : entry.strokes !== undefined ? <span className="usage-strokes">{entry.strokes} strokes</span> : info.component || kind === 'Components' ? 'Component form' : kind === 'Strokes' ? null : 'Stroke count not recorded';
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
  return <article data-entry-id={entry.id} className={`word-card catalog-card ${kind === 'Radicals' ? 'radical-family-card' : ''} ${entry.script === 'Traditional' ? 'is-traditional' : ''} ${selected ? 'is-selected' : ''} ${revealed ? 'is-revealed' : ''}`}>
    <div className="word-card-top"><span className="word-level-wrap"><span className="word-level">{info.label.toUpperCase()}</span>{metadata !== null && <CardTopMeta>{metadata}</CardTopMeta>}{entry.kangxiIndex !== undefined && <span className="word-hsk-id" title="Official Kangxi radical index" aria-label={`Kangxi radical ${entry.kangxiIndex}`}>Radical #{entry.kangxiIndex}</span>}{componentRadical.length === 1 && componentRadical[0] && <span className="word-hsk-id" title="Sourced Kangxi radical identity">Radical #{componentRadical[0].number}</span>}{entry.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}</span><span className="catalog-card-indicators">{hasExample && (kind === 'Components' || kind === 'Radicals' ? <span title="In a character available"><Type className="catalog-source-icon" aria-label="In a character available"/></span> : <span title="In a sentence available"><MessageSquareText className="catalog-source-icon" aria-label="In a sentence available"/></span>)}{!hideDecomposition && (entry.decomposition || familyAvailability?.decomposition) && <span title={kind === 'Radicals' ? 'Stroke decomposition available' : 'Decomposition available'}><GitBranch className="catalog-source-icon" aria-label={kind === 'Radicals' ? 'Stroke decomposition available' : 'Decomposition available'}/></span>}</span></div>
    <Tooltip open={clipped && engaged}><TooltipTrigger asChild>{tile}</TooltipTrigger>
    {clipped && !hideMeaning && <TooltipContent side={side} className="tile-tooltip"><span className="tile-tooltip-head">{!hideHanzi && <strong lang="zh-CN">{entry.hanzi}</strong>}{hidePinyin ? null : hasPinyin ? <span className="pinyin">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span> : <span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span>}</span><p className="tile-tooltip-meaning"><MeaningText text={tileMeaning || 'No English meaning recorded in this source.'}/></p>{entry.script === 'Traditional' && <small className="traditional-label">Traditional</small>}</TooltipContent>}
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
  const browsed = filterLibrary(entries, query, strokeCount, false, preferences.includeTraditional, usage, savedOnly ? saved : undefined, pinyinOnly, search.py === 'exact');
  const filtered = includeSelectedRecord(requestedHeading && requestedForm ? [...entries, radicalVariantEntry(requestedHeading, requestedForm)] : entries, browsed, savedOnly ? requestedId : selectedId);
  // Preserve explicitly selected records even when browsing filters exclude them;
  // density-aware paging then reveals their exact card, including saved variants.
  const density = useLibraryDensity(() => set({ page: 1, id: '', variant: undefined }));
  const paged = libraryPage(filtered, page, density.size, savedOnly ? requestedId : selectedId);
  // Hide modes: a click toggles the card's peek (reveal, then click again to hide);
  // reset on tab/page/filter change.
  const peek = useCardPeek(preferences.cardReveal, `${kind}|${paged.current}|${filtered.length}|${savedOnly}|${JSON.stringify(appliedFilters)}`, preferences.rememberCardReveals);
  // Clicks only toggle the peek in a Hide mode; the detail panel opens solely via the card's details button.
  const selectTile = (id: string) => peek.reveal(id);
  useKeyboardPaging({ current: paged.current, pages: paged.pages, onPageChange: setPage, disabled: selectedId !== '' });
  // Sticky strip label: on ranked tabs, name the frequency ranks visible on
  // the current page against the kind's ranked total; otherwise the page number.
  // Tab counts follow the script preference: hiding Traditional removes those records from each tab.
  const tabCounts = useMemo(() => catalogReady ? Object.fromEntries(kinds.map(k => [k, filterLibrary(libraryEntries(k), '', '', false, preferences.includeTraditional).length])) as Record<string, number> : null, [catalogReady, preferences.includeTraditional, catalogVersion]);
  // Count only sourced ranks in the applied pool; gaps remain original ranks,
  // not renumbered result positions, so the jump bounds preserve source identity.
  const filteredRanks = filtered.flatMap(entry => {
    const rank = hasUsage && usageOrder.loaded ? usageRank(entry, kind, preferences.includeTraditional) : null;
    return rank === null ? [] : [rank];
  });
  const rankSummary = filteredRanks.length ? { count: filteredRanks.length, min: Math.min(...filteredRanks), max: Math.max(...filteredRanks) } : undefined;
  const rankedTotal = filteredRanks.length;
  const paginationProps = {
    filterKey: JSON.stringify([kind, appliedFilters, savedOnly, preferences.includeTraditional]),
    total: filtered.length, current: paged.current, pages: paged.pages,
    range: filtered.length ? `${(paged.current - 1) * density.size + 1}–${Math.min(paged.current * density.size, filtered.length)}` : '0',
    perPage: density.size, onPerPageChange: density.onPerPageChange, onPageChange: setPage,
    ranks: rankSummary,
    onUnrankedChange: hasUsage && usageOrder.loaded ? () => {
      const index = filtered.findIndex(entry => usageRank(entry, kind, preferences.includeTraditional) === null);
      if (index >= 0) setPage(Math.floor(index / density.size) + 1);
    } : undefined,
    currentRank: hasUsage && usageOrder.loaded ? paged.entries.map(entry => usageRank(entry, kind, preferences.includeTraditional)).find(rank => rank !== null) ?? undefined : undefined,
    onRankChange: hasUsage ? (rank: number) => {
      if (!usageOrder.loaded) return;
      const nearest = nearestRecordedRank(filtered.map(entry => usageRank(entry, kind, preferences.includeTraditional)), rank);
      if (!nearest) return;
      const destinationPage = Math.floor(nearest.index / density.size) + 1;
      setPage(destinationPage);
      return { rank: nearest.rank, page: destinationPage };
    } : undefined,
  };
  const stickyLabel = (() => {
    if (rankedTotal > 0) {
      const ranks = paged.entries.map(e => usageRank(e, kind, preferences.includeTraditional)).filter((r): r is number => r !== null);
      if (ranks.length) return `Ranks ${Math.min(...ranks).toLocaleString('en-US')}–${Math.max(...ranks).toLocaleString('en-US')} of ${rankedTotal.toLocaleString('en-US')}`;
    }
    return `Page ${paged.current} / ${paged.pages}`;
  })();
  const selected = entries.find(entry => entry.id === selectedId);
  const selectedForm = selected?.kangxiIndex ? radicalForm(selected.kangxiIndex, search.variant) : undefined;
  const selectedBookmarkId = selected && selectedForm ? radicalVariantEntry(selected, selectedForm).id : selected?.id;
  useRecordScroll(selected?.id ?? '', catalogReady);
  const topPaginationRef = useRef<HTMLDivElement>(null);
  const lastPageRef = useRef<number | null>(null);
  useEffect(() => {
    const previous = lastPageRef.current;
    lastPageRef.current = page;
    if (previous === null || previous === page || selectedId) return;
    topPaginationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [page, selectedId]);
  const updateKind = (value: string) => { const next = kinds.find(k => k === value); if (!next) return; onSearch({ ...(next === 'Characters' ? {} : { tab: next }), ...(savedOnly ? { status: 'saved' } : {}) }); };
  void catalogVersion;
  const sheetIndex = selectedId ? filtered.findIndex(entry => entry.id === (savedOnly ? requestedId : selectedId)) : -1;
  // Modal arrows traverse the full filtered order, not just the visible page.
  // Store the target page with the selection so closing reveals that record.
  const stepTo = (index: number) => { const target = filtered[index]; if (target) void detailLoading.run(target.id, () => set({ ...savedGlyphDestination(target), variant: target.radicalVariant, page: Math.floor(index / density.size) + 1 })); };
  return <div className="page-enter library-page"><div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">{catalogReady ? (kind === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Settings.' : glyphsMotto) : `Loading ${plannedCounts[kind].toLocaleString('en-US')} records…`}</div><h1>Get to know the {kind.toLowerCase()}.<SourceInfo inline className="detail-footnote">{catalogReady ? (kind === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Settings.' : kindNotes[kind]) : `Loading ${plannedCounts[kind].toLocaleString('en-US')} records…`}</SourceInfo></h1></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} onValueChange={updateKind} className="catalog-tabs"><div className="vocabulary-category-row glyph-category-row"><TabsList aria-label="Character library categories">{kinds.map(k => <TabsTrigger key={k} value={k}>{k}<span className="catalog-tab-count">{(tabCounts?.[k] ?? plannedCounts[k]).toLocaleString('en-US')}</span></TabsTrigger>)}</TabsList><div className="vocabulary-saved-filter" aria-label="Saved glyphs">{['all', 'saved'].map(status => <Button key={status} variant="ghost" className={(status === 'saved') === savedOnly ? 'selected' : ''} aria-pressed={(status === 'saved') === savedOnly} onClick={() => set({ status: status === 'saved' ? 'saved' : undefined, page: 1, id: '' })}>{status === 'saved' ? 'Saved' : 'All'}{status === 'saved' && <span className="catalog-tab-count">{filterLibrary(libraryEntries(kind), '', '', false, preferences.includeTraditional, undefined, saved).length}</span>}</Button>)}</div></div>
      {kinds.map(k => <TabsContent value={k} key={k}>
        <DraftFilterForm showCount={false} searchKey="q" searchModeKey="py" applied={appliedFilters} active={activeFilters} count={filtered.length} onApply={draft => set({ ...draft, page: 1, id: '', variant: undefined })} onClear={() => { clearFilters(); return { q: '', strokes: '', usage: undefined, py: undefined }; }} chips={[...(appliedFilters.usage ? [{ label: usageGroups(kind).find(group => group.value === appliedFilters.usage)?.label ?? appliedFilters.usage, clear: { usage: undefined } }] : []), ...(appliedFilters.strokes ? [{ label: `${appliedFilters.strokes} strokes`, clear: { strokes: '' } }] : [])]} filterFields={({ draft, patch }) => <>
          {hasUsage && <Select value={draft.usage ?? 'all'} onValueChange={value => patch({ usage: parseUsageGroup(kind, value) })}><SelectTrigger className="filter-select reuse-filter" aria-label="Filter by frequency"><SelectValue>{draft.usage ? usageGroups(kind).find(group => group.value === draft.usage)?.label : 'All ranks'}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All ranks</SelectItem>{draft.usage && !rankGroups.some(group => group.value === draft.usage) && <SelectItem value={draft.usage} disabled>{usageGroups(kind).find(group => group.value === draft.usage)?.label} · No matches</SelectItem>}{rankGroups.map(group => <SelectItem key={group.value} value={group.value}>{usageGroupLabel(group, kind, preferences.includeTraditional)}</SelectItem>)}</SelectContent></Select>}
          {k !== 'Strokes' && <select className="filter-select" aria-label="Filter by stroke count" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}><option value="">All stroke counts</option>{draft.strokes && !strokeCounts.includes(Number(draft.strokes)) && <option value={draft.strokes} disabled>{draft.strokes} strokes · No matches</option>}{strokeCounts.map(n => <option key={n} value={n}>{n} strokes</option>)}</select>}
        </>}>{({ draft, patch }) => <>
          <div className="search-field"><Search/><input aria-label="Search character library" placeholder="Search Chinese, pinyin or English…" value={draft.q} onChange={e => patch({ q: e.target.value })}/><Button variant="ghost" type="button" className={`search-toggle${draft.py ? ' on' : ''}`} aria-pressed={Boolean(draft.py)} title="Search pinyin only" onClick={() => patch({ py: draft.py ? undefined : 'pinyin' })}>Pinyin</Button>{draft.py && <Button variant="ghost" type="button" className={`search-toggle${draft.py === 'exact' ? ' on' : ''}`} aria-pressed={draft.py === 'exact'} title="Match the exact pinyin reading only" onClick={() => patch({ py: draft.py === 'exact' ? 'pinyin' : 'exact' })}>Exact</Button>}</div>
        </>}</DraftFilterForm>
        <LibraryTools category={savedOnly ? 'Saved' : `Ref:${k.slice(0, -1)}`} drawing={k !== 'Strokes' ? { kind: k, ...(savedOnly ? { saved: true } : {}) } : undefined}/>
        <div className={`catalog-workspace ${cardRevealClass(preferences.cardReveal)}`}><section className="catalog-results" aria-label={`${k} results`}>{filtered.length > 0 && <StickyPagination key={`sticky-${k}`} label={stickyLabel} current={paged.current} pages={paged.pages} onPageChange={setPage} watchRef={topPaginationRef}/>}{filtered.length > 0 && <CatalogPagination top innerRef={topPaginationRef} {...paginationProps} />}<div className={`catalog-entry-grid ${preferences.libraryView === 'list' ? 'library-list-view' : ''}`}>{paged.entries.map(entry => <MemoCatalogTile key={entry.id} entry={entry} kind={k} selected={selectedBookmarkId === entry.id} onSelect={selectTile} revealed={peek.revealed.has(entry.id)} onDetails={setSelectedId}/>)}</div>{!filtered.length && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={clearFilters}>Clear filters</Button></div>}
          <CatalogPagination {...paginationProps} />
        </section></div>
      </TabsContent>)}
    </Tabs>{selected && <DetailSheet open title={`Details for ${selected.hanzi} ${search.variant ?? ''}`} label={search.variant ?? selected.hanzi} position={sheetIndex} total={filtered.length} onClose={() => { set({ id: '', variant: undefined, page: paged.current }, true); focusRecordCard(selectedBookmarkId ?? selected.id); }} onPrevious={sheetIndex > 0 ? () => stepTo(sheetIndex - 1) : undefined} onNext={sheetIndex >= 0 && sheetIndex < filtered.length - 1 ? () => stepTo(sheetIndex + 1) : undefined}><DetailLoading loading={detailLoading}><MemoCharacterDetails key={`${selected.id}:${search.variant ?? ''}`} entry={selected} kind={kind} variant={search.variant} /></DetailLoading></DetailSheet>}
  </div>;
}
