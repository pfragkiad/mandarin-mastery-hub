import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Shuffle, Sparkles, ArrowUpRight, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { libraryEntries, filterLibrary } from '@/lib/character-library';
import { randomOverviewCharacter, overviewCharacterDestination } from '@/lib/overview';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';

export function OverviewCharacter() {
  const { preferences, catalogVersion } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string>();
  const [audioError, setAudioError] = useState<string | null>(null);
  const entries = libraryEntries('Characters');
  useEffect(() => { setSelectedId(randomOverviewCharacter(libraryEntries('Characters'), preferences.includeTraditional)?.id); }, [catalogVersion, preferences.includeTraditional]);
  const entry = entries.find(candidate => candidate.id === selectedId) ?? filterLibrary(entries, '', '', false, preferences.includeTraditional)[0];
  const recording = entry ? characterRecording(entry.hanzi, entry.pinyin) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), entry?.pinyin);
  const nextCharacter = () => { setSelectedId(randomOverviewCharacter(entries, preferences.includeTraditional, entry?.id)?.id); setAudioError(null); };
  return <section className="daily-word overview-featured overview-character" aria-label="A character to discover"><div className="daily-word-top"><span className="eyebrow"><Sparkles size={14}/> A CHARACTER TO DISCOVER</span><Button variant="ghost" size="icon" title="Show another random character" aria-label="Show another random character" onClick={nextCharacter} disabled={!entry}><Shuffle/></Button></div>{entry ? <><div className="overview-featured-word" aria-live="polite"><span className="word-level">{entry.strokes ? `${entry.strokes} strokes` : 'Character reference'}{entry.script === 'Traditional' && <span className="traditional-label"> · Traditional</span>}</span><Link to="/characters" search={overviewCharacterDestination(entry, entries, preferences.includeTraditional)} className="daily-word-content" aria-label={`Open ${entry.hanzi} in character library`}><div>{preferences.pinyin && <span className="pinyin">{entry.pinyin || '—'}</span>}<strong lang="zh-CN" className={entry.script === 'Traditional' ? 'traditional-character' : ''}>{entry.hanzi}</strong></div><div>{preferences.meaning && <h3>{entry.meaning || 'No meaning recorded'}</h3>}<p>{entry.decomposition ? 'Sourced decomposition available' : 'Imported character reference'}</p></div></Link></div><div className="overview-featured-actions"><Button asChild variant="outline" size="sm"><Link to="/characters" search={overviewCharacterDestination(entry, entries, preferences.includeTraditional)}>Explore character <ArrowUpRight/></Link></Button><Button variant="ghost" size="icon" disabled={!audioAvailable} className={audioAvailable ? '' : 'audio-tts-only'} aria-label={audioAvailable ? `Listen to ${entry.hanzi}` : `No audio available for ${entry.hanzi}`} title={audioAvailable ? recording ? 'Listen · Recording' : 'Listen · Browser speech' : undefined} onClick={async () => setAudioError(await playCharacter(entry.hanzi, preferences.slow, entry.pinyin))}><Volume2/></Button></div>{audioError && <p role="status" className="library-note">{audioError}</p>}</> : <p className="library-note">Loading character library…</p>}</section>;
}