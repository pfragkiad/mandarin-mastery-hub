import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Shuffle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { words as allWords, vocabularyKind, type Word } from '@/lib/mandarin';
import { randomOverviewWord, overviewWordDestination, randomOverviewCharacter, overviewCharacterDestination } from '@/lib/overview';
import { catalog, characterAudioRequest, characterRecording, playCharacter } from '@/lib/catalog-store';
import { libraryEntries, filterLibrary, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { audioCandidates, playPronunciation, audioMessage } from '@/lib/audio';
import { usePronunciationAvailability } from './use-pronunciation-availability';

export type DiscoveryCategory = 'word' | 'phrase' | 'Characters' | 'Components' | 'Radicals';

const CATEGORY_META: Record<DiscoveryCategory, { glyph: string; label: string; note: string }> = {
  word: { glyph: '词', label: 'Words', note: 'HSK & everyday vocabulary' },
  phrase: { glyph: '句', label: 'Phrases', note: 'Including unofficial practice phrases' },
  Characters: { glyph: '字', label: 'Characters', note: 'Full imported catalogue' },
  Components: { glyph: '口', label: 'Components', note: 'Structural building blocks' },
  Radicals: { glyph: '氵', label: 'Radicals', note: 'Dictionary reference library' },
};

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
    if (isVocabulary(category)) setSelectedId(randomOverviewWord(allWords.length ? items : items, undefined, Math.random, category)?.id);
    else setSelectedId(randomOverviewCharacter(entries)?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, catalogVersion]);

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
  const hanzi = word ? word.hanzi : entry?.hanzi;
  const pinyin = word ? word.pinyin : entry?.pinyin || '—';
  const meaning = word ? word.meaning : entry?.meaning || '—';

  return (
    <section className="discovery-tile" aria-label={`${meta.label}: ${count ?? '…'} records`}>
      <div className="discovery-tile-top">
        <Link to={browseTo} search={browseSearch} className="discovery-tile-heading" aria-label={`Browse ${meta.label.toLowerCase()}`}>
          <span className="stat-icon" aria-hidden="true" lang="zh-CN">{meta.glyph}</span>
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
          <Link to={recordLink.to} search={recordLink.search} className="overview-record-link" aria-label={`Open ${hanzi}`}>
            <strong lang="zh-CN">{hanzi}</strong>
            <div>
              {preferences.pinyin && <span className="pinyin">{pinyin}</span>}
              {preferences.meaning && <h2 title={meaning}>{meaning}</h2>}
            </div>
          </Link>
          <DiscoveryAudio word={word} entry={entry} slow={preferences.slow} onError={setAudioError} />
        </div>
      ) : (
        <p className="library-note">Loading {meta.label.toLowerCase()}…</p>
      )}
      {audioError && <p className="library-note" role="status">{audioError}</p>}
    </section>
  );
}

function DiscoveryAudio({ word, entry, slow, onError }: { word?: Word; entry?: LibraryEntry; slow: boolean; onError: (message: string | null) => void }) {
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
    <Button variant="ghost" size="icon" disabled={!available} className={available ? '' : 'audio-tts-only'} aria-label={available ? `Listen to ${hanzi}` : `No audio available for ${hanzi}`} title={available ? `Listen · ${label}` : undefined} onClick={listen}>
      <Volume2 />
    </Button>
  );
}
