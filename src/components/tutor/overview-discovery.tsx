import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { Shuffle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { vocabularyKind, type Word } from '@/lib/mandarin';
import { randomOverviewWord, overviewWordDestination, randomOverviewCharacter, overviewCharacterDestination } from '@/lib/overview';
import { catalog, characterAudioRequest, characterRecording, playCharacter } from '@/lib/catalog-store';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { libraryEntries, filterLibrary, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { audioCandidates, playPronunciation, audioMessage } from '@/lib/audio';
import { usePronunciationAvailability } from './use-pronunciation-availability';
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

/** One tile per category: the total count plus a live random record from that category. */
export function DiscoveryTile({ category }: { category: DiscoveryCategory }) {
  const meta = CATEGORY_META[category];
  const { items, preferences, catalogVersion } = useWorkspace();
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
  const chartLinks = preferences.soundChartLinks !== false;
  const hanzi = word ? word.hanzi : entry?.hanzi;
  const pinyin = word ? word.pinyin : entry?.pinyin || '—';
  const meaning = word ? word.meaning : entry?.meaning || '—';
  // Glyph picks wear the same identity ink as their library cards (purple traditional,
  // gold radical, green character, text-colour component); Words/Phrases keep the accent.
  const ink = entry ? glyphCardInk(category as LibraryKind, entry.script, isRadicalGlyph(entry, category as LibraryKind)) : '';

  return (
    <section className="discovery-tile" aria-label={`${meta.label}: ${count ?? '…'} records`}>
      <div className="discovery-tile-top">
        <Link to={browseTo} search={browseSearch} className="discovery-tile-heading" aria-label={`Browse ${meta.label.toLowerCase()}`}>
          <span className="stat-icon" aria-hidden="true"><meta.icon/></span>
          <span className="discovery-tile-count">
            <strong>{count === null ? '—' : count.toLocaleString('en-US')}</strong>
            <span>{meta.label}</span>
          </span>
        </Link>
        <Button variant="ghost" size="icon" title={`Show another random ${meta.label.toLowerCase().replace(/s$/, '')}`} aria-label={`Show another random ${meta.label.toLowerCase().replace(/s$/, '')}`} onClick={shuffle} disabled={!record}>
          <Shuffle />
        </Button>
      </div>
      {record && recordLink ? (
        <div className="discovery-tile-record" aria-live="polite">
          <div className="discovery-record-pinyin">
            {/* Glyph tiles (never Words/Phrases) add the Sound chart link beside each reading's speaker,
                following the same "Sound chart links on cards" setting as the Glyphs grid cards. */}
            {!word && entry && isMultiReading(entry.pinyin) ? <MultiReadingSpeakers spoken={entry.hanzi} reading={entry.pinyin} variant="header" textClassName={preferences.pinyin ? 'pinyin' : 'sr-only'} onError={setAudioError} chartFrom={chartLinks ? entry.hanzi : undefined}/> : <>
            {preferences.pinyin && <span className="pinyin">{pinyin}</span>}
            <DiscoveryAudio word={word} entry={entry} slow={preferences.slow} onError={setAudioError} />
            {!word && entry?.pinyin && chartLinks && <SoundChartLink reading={entry.pinyin} from={entry.hanzi} variant="header"/>}</>}
          </div>
          <Link to={recordLink.to} search={recordLink.search} className={`overview-record-link${ink ? ` ${ink}` : ''}`} title={openDetailsHint(hanzi ?? '', word ? vocabularyKind(word) : category)} aria-label={openDetailsHint(hanzi ?? '', word ? vocabularyKind(word) : category)}>
            <strong lang="zh-CN" className={hanzi && hanzi.length > 2 ? 'is-long' : undefined}>{hanzi}</strong>
            {preferences.meaning && <h2 title={meaning}>{meaning}</h2>}
          </Link>
        </div>
      ) : (
        <p className="library-note">Loading {meta.label.toLowerCase()}…</p>
      )}
      {audioError && <p className="library-note" role="status">{audioError}</p>}
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
