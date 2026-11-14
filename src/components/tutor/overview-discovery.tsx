import { bookmarkLabel } from './record-card-footer';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { Bookmark, ChevronDown, ChevronRight, Shuffle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { vocabularyKind, type Word } from '@/lib/mandarin';
import { randomOverviewWord, overviewWordDestination, randomOverviewCharacter, overviewCharacterDestination } from '@/lib/overview';
import { catalog, characterAudioRequest, characterRecording, playCharacter } from '@/lib/catalog-store';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { libraryEntries, filterLibrary, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { audioCandidates, playPronunciation, audioMessage } from '@/lib/audio';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { DetailsIcon, ExpertPracticeIcon, PracticeIcon } from './practice-icons';
import { SoundChartLink } from './sound-chart-link';
import { historyEntry } from '@/lib/detail-trail';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { sectionIcons } from '@/lib/section-icons';
import type { GameIcon } from './game-catalog';

export type DiscoveryCategory = 'word' | 'phrase' | 'Characters' | 'Components' | 'Radicals';

// Each tile wears the same icon as its sidebar section (src/lib/section-icons.ts),
// so the menu and the Start cards never show a section with two different icons.
const CATEGORY_META: Record<DiscoveryCategory, { icon: GameIcon; label: string; note: string }> = {
  word: { icon: sectionIcons.Words, label: 'Words', note: 'HSK & everyday vocabulary' },
  phrase: { icon: sectionIcons.Phrases, label: 'Phrases', note: 'Including unofficial practice phrases' },
  Characters: { icon: sectionIcons.Characters, label: 'Characters', note: 'Full imported catalogue' },
  Components: { icon: sectionIcons.Components, label: 'Components', note: 'Structural building blocks' },
  Radicals: { icon: sectionIcons.Radicals, label: 'Radicals', note: 'Dictionary reference library' },
};

// Random pick shown in each tile, remembered per browser history entry (URL + router key) and
// category. A new visit to Start is a new entry and gets a fresh random record; returning to the
// same entry (browser Back from the Sound chart link's "← 了") shows the record it was left on,
// so the Back label never points at a card that has since been reshuffled. Session memory only.
const picksByEntry = new Map<string, string>();
const pickKey = (category: DiscoveryCategory) => `${historyEntry()}|${category}`;

function isVocabulary(category: DiscoveryCategory): category is 'word' | 'phrase' {
  return category === 'word' || category === 'phrase';
}

/**
 * Phone row toggle (≤700px, CSS only — wider screens keep the full cards and never show it).
 * Inputs: `open` and `onToggle` from the shared row list (DiscoveryRowList) plus the row's
 * content. On phones each card collapses to one row like the Start games: section icon,
 * name + count, then the current pick on one line (hanzi then meaning, cut off with an
 * ellipsis); the round shuffle button and a small chevron sit on the right. The whole row
 * toggles: the toggle button (the name line) has an ::after that stretches over the row (see
 * styles.css "Start random rows"), and the icon and pick line let clicks fall through to it
 * (pointer-events: none), while the shuffle button sits above it, so the chevron is only a
 * decorative cue. `pickAction` (the pinyin line's listen button) sits inline right after the
 * pick text; it lives outside the toggle button because buttons cannot nest.
 */
export function DiscoveryRowToggle({ open, onToggle, controls, icon, label, count, pick, pickAction }: { open: boolean; onToggle: () => void; controls: string; icon: React.ReactNode; label: string; count: number | null; pick: React.ReactNode; pickAction?: React.ReactNode }) {
  const pickId = `${controls}-pick`;
  return <div className="discovery-row-main">
    <span className="stat-icon" aria-hidden="true">{icon}</span>
    <span className="discovery-row-text">
      <button type="button" className="discovery-row-toggle" aria-expanded={open} aria-controls={controls} aria-describedby={pickId} onClick={onToggle}>
        <span className="discovery-row-name"><strong>{label}</strong><span>{count === null ? '—' : count.toLocaleString('en-US')}</span></span>
      </button>
      <span className="discovery-row-pick"><span id={pickId} className="discovery-row-pick-text">{pick}</span>{pickAction}</span>
    </span>
  </div>;
}

/** The chevron after the shuffle button on phone rows; purely visual (the row toggle owns the click). */
export const DiscoveryRowChevron = () => <ChevronDown className="discovery-row-chevron" aria-hidden="true"/>;

/** Every Start random card, in order: the five library categories plus the Sounds card. */
export type DiscoveryRowKey = DiscoveryCategory | 'sound';

// Which phone row is open, remembered per history entry like the picks, so Back from
// Details returns to the row that was open. Session memory only; new visits start collapsed.
const openByEntry = new Map<string, DiscoveryRowKey | null>();

/**
 * The six Start random cards. State: which phone row is expanded (one at a time, all
 * collapsed by default). Wider screens ignore it — every card is shown in full there.
 * Inputs: `renderSound` draws the Sounds card (kept in overview-sound.tsx).
 */
export function DiscoveryRowList({ categories, renderSound }: { categories: DiscoveryCategory[]; renderSound: (open: boolean, onToggle: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState<DiscoveryRowKey | null>(null);
  useEffect(() => { setOpen(openByEntry.get(historyEntry()) ?? null); }, []);
  const toggle = (key: DiscoveryRowKey) => () => setOpen(current => {
    const next = current === key ? null : key;
    openByEntry.set(historyEntry(), next);
    return next;
  });
  return <>
    {categories.map(category => <DiscoveryTile key={category} category={category} open={open === category} onToggle={toggle(category)}/>)}
    {renderSound(open === 'sound', toggle('sound'))}
  </>;
}

/** One tile per category: the total count plus a live random record from that category. */
export function DiscoveryTile({ category, open = false, onToggle = () => {} }: { category: DiscoveryCategory; open?: boolean; onToggle?: () => void }) {
  const meta = CATEGORY_META[category];
  const { items, preferences, catalogVersion, saved, toggleSaved } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string>();
  const [audioError, setAudioError] = useState<string | null>(null);

  const vocabularyPool = useMemo(
    () => (isVocabulary(category) ? items.filter(word => vocabularyKind(word) === category && word.script !== 'Traditional') : []),
    [items, category],
  );
  const entries = useMemo(() => (isVocabulary(category) ? [] : libraryEntries(category as LibraryKind)), [category, catalogVersion]);
  const visible = useMemo(() => (entries.length ? filterLibrary(entries, '', '', false, false) : []), [entries]);

  useEffect(() => {
    const kept = picksByEntry.get(pickKey(category));
    const keptValid = kept && (isVocabulary(category) ? vocabularyPool.some(word => word.id === kept) : entries.some(candidate => candidate.id === kept));
    if (keptValid) setSelectedId(kept);
    else if (isVocabulary(category)) setSelectedId(randomOverviewWord(items, undefined, Math.random, category)?.id);
    else setSelectedId(randomOverviewCharacter(entries)?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, catalogVersion]);
  // Remember the current pick (including shuffles) for this history entry; see picksByEntry.
  useEffect(() => { if (selectedId) picksByEntry.set(pickKey(category), selectedId); }, [category, selectedId]);

  const word = isVocabulary(category) ? vocabularyPool.find(candidate => candidate.id === selectedId) ?? vocabularyPool[0] : undefined;
  const entry = !isVocabulary(category) ? entries.find(candidate => candidate.id === selectedId) ?? visible[0] : undefined;

  const count = isVocabulary(category)
    ? vocabularyPool.length
    : catalogVersion
      ? category === 'Characters'
        ? catalog.characters.length
        : category === 'Components'
          ? catalog.components.length
          : catalog.radicals.length
      : null;

  const shuffle = () => {
    setAudioError(null);
    if (isVocabulary(category)) setSelectedId(randomOverviewWord(items, word?.id, Math.random, category)?.id);
    else setSelectedId(randomOverviewCharacter(entries, entry?.id)?.id);
  };

  const browseSearch = isVocabulary(category) ? { tab: category } : { tab: category };
  const browseTo = isVocabulary(category) ? '/vocabulary' : '/characters';

  const recordLink = word
    ? { to: '/vocabulary' as const, search: overviewWordDestination(word) }
    : entry
      ? { to: '/characters' as const, search: overviewCharacterDestination(entry, entries, preferences.includeTraditional, category as LibraryKind) }
      : null;

  const record = word ?? entry;
  // Bookmark toggle at the far right of the pinyin line, same session bookmark as the library cards
  // (exact Vocabulary word id or exact Glyphs record id), so the pick appears in that section's Saved view.
  const bookmarkId = record?.id;
  const bookmarked = bookmarkId ? saved.includes(bookmarkId) : false;
  const bookmarkButton = bookmarkId && <Button variant="ghost" size="icon" className="discovery-bookmark" title={bookmarkHint(bookmarked)} aria-label={bookmarkLabel(bookmarked, word ? word.hanzi : entry?.hanzi ?? '')} aria-pressed={bookmarked} onClick={() => toggleSaved(bookmarkId)}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button>;
  const chartLinks = preferences.soundChartLinks !== false;
  const hanzi = word ? word.hanzi : entry?.hanzi;
  const pinyin = word ? word.pinyin : entry?.pinyin || '—';
  const meaning = word ? word.meaning : entry?.meaning || '—';
  // Glyph picks wear the same identity ink as their library cards (purple traditional,
  // gold radical, green character, text-colour component); Words/Phrases keep the accent.
  const bodyId = `discovery-body-${category}`;
  const ink = entry ? glyphCardInk(category as LibraryKind, entry.script, isRadicalGlyph(entry, category as LibraryKind)) : '';
  // Phones: the closed row's second line shows the translation or the pinyin (Preferences →
  // Start random rows). With pinyin chosen, a small listen button sits right after the pinyin
  // (CSS shows it only on closed phone rows); the opened detail is unchanged either way.
  const rowLine = preferences.discoveryRowLine ?? 'meaning';
  const rowPinyin = rowLine === 'pinyin' && preferences.pinyin && pinyin !== '—';

  return (
    <section className={`discovery-tile${open ? ' is-open' : ''}`} aria-label={`${meta.label}: ${count ?? '…'} records`}>
      <div className="discovery-tile-top">
        <Link to={browseTo} search={browseSearch} className="discovery-tile-heading" aria-label={`Browse ${meta.label.toLowerCase()}`}>
          <span className="stat-icon" aria-hidden="true"><meta.icon/></span>
          <span className="discovery-tile-count">
            <strong>{meta.label}<ChevronRight aria-hidden="true"/></strong>
            <span>{count === null ? '—' : count.toLocaleString('en-US')}</span>
          </span>
        </Link>
        <DiscoveryRowToggle open={open} onToggle={onToggle} controls={bodyId} icon={<meta.icon/>} label={meta.label} count={count}
          pick={record ? <><span lang="zh-CN" className={`discovery-row-hanzi${ink ? ` ${ink}` : ''}`}>{hanzi}</span>{rowPinyin ? <span className="discovery-row-meaning discovery-row-pinyin">{pinyin}</span> : preferences.meaning && <span className="discovery-row-meaning">{meaning}</span>}</> : `Loading ${meta.label.toLowerCase()}…`}
          pickAction={rowPinyin && record ? <span className="discovery-row-audio"><DiscoveryAudio word={word} entry={entry} slow={preferences.slow} onError={setAudioError}/></span> : undefined}/>
        <Button variant="ghost" size="icon" title={`Show another random ${meta.label.toLowerCase().replace(/s$/, '')}`} aria-label={`Show another random ${meta.label.toLowerCase().replace(/s$/, '')}`} onClick={shuffle} disabled={!record}>
          <Shuffle />
        </Button>
        <DiscoveryRowChevron/>
      </div>
      {/* Phones: everything below is the row's expandable detail (display: contents on wider screens). */}
      <div className="discovery-tile-body" id={bodyId}>
      {record && recordLink ? (
        <div className="discovery-tile-record" aria-live="polite">
          <div className="discovery-record-pinyin">
            {/* Glyph tiles (never Words/Phrases) add the Sound chart link beside each reading's speaker,
                following the same "Sound chart links on cards" setting as the Glyphs grid cards. */}
            {!word && entry && isMultiReading(entry.pinyin) ? <MultiReadingSpeakers spoken={entry.hanzi} reading={entry.pinyin} variant="header" textClassName={preferences.pinyin ? 'pinyin' : 'sr-only'} onError={setAudioError} chartFrom={chartLinks ? entry.hanzi : undefined}/> : <>
            {preferences.pinyin && <span className="pinyin">{pinyin}</span>}
            <DiscoveryAudio word={word} entry={entry} slow={preferences.slow} onError={setAudioError} />
            {!word && entry?.pinyin && chartLinks && <SoundChartLink reading={entry.pinyin} from={entry.hanzi} variant="header"/>}</>}
            {bookmarkButton}
          </div>
          <Link to={recordLink.to} search={recordLink.search} className={`overview-record-link${ink ? ` ${ink}` : ''}`} title={openDetailsHint(hanzi ?? '', word ? vocabularyKind(word) : category)} aria-label={openDetailsHint(hanzi ?? '', word ? vocabularyKind(word) : category)}>
            <strong lang="zh-CN" className={hanzi && hanzi.length > 2 ? 'is-long' : undefined}>{hanzi}</strong>
            {preferences.meaning && <h2 title={meaning}>{meaning}</h2>}
          </Link>
        </div>
      ) : (
        <p className="library-note">Loading {meta.label.toLowerCase()}…</p>
      )}
      {/* Same labelled Details + Practice pair as the character of the day (shared .daily-hero-actions). */}
      {record && recordLink && hanzi && <div className="daily-hero-actions discovery-tile-actions">
        <Button asChild variant="outline" size="sm"><Link to={recordLink.to} search={recordLink.search}><DetailsIcon aria-hidden="true"/>Details</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/strokes" search={{ character: hanzi, mode: 'trace' }}><PracticeIcon aria-hidden="true"/>Trace</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/strokes" search={{ character: hanzi, mode: 'recall' }}><ExpertPracticeIcon aria-hidden="true"/>Recall</Link></Button>
      </div>}
      {audioError && <p className="library-note" role="status">{audioError}</p>}
      </div>
    </section>
  );
}

function DiscoveryAudio({ word, entry, slow, onError }: { word?: Word | undefined; entry?: LibraryEntry | undefined; slow: boolean; onError: (message: string | null) => void }) {
  const request = word ? { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null } : null;
  const recording = entry ? characterRecording(entry.hanzi, entry.pinyin) : null;
  const hasRecording = word ? audioCandidates(request!).some(candidate => candidate.kind === 'recording') : Boolean(recording);
  const reading = word ? word.pinyin : entry?.pinyin;
  const available = usePronunciationAvailability(hasRecording, reading);
  const hanzi = word ? word.hanzi : entry?.hanzi;
  const label = word
    ? audioCandidates(request!).find(candidate => candidate.kind === 'recording')?.label ?? 'Browser speech'
    : recording
      ? 'Recording'
      : 'Browser speech';
  const listen = async () => {
    if (word) onError(audioMessage(await playPronunciation(request!, slow)));
    else if (entry) onError(await playCharacter(entry.hanzi, slow, entry.pinyin));
  };
  return (
    <Button variant="ghost" size="icon" disabled={!available} className={hasRecording ? '' : 'audio-tts-only'} aria-label={available ? `Listen to ${hanzi}` : `No audio available for ${hanzi}`} title={available ? `Listen · ${label}` : undefined} onClick={listen}>
      <Volume2 />
    </Button>
  );
}
