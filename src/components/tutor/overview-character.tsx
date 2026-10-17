import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Shuffle, Sparkles, ArrowUpRight, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { libraryEntries, filterLibrary } from '@/lib/character-library';
import { randomOverviewCharacter, overviewCharacterDestination } from '@/lib/overview';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';

export function OverviewCharacter({ tab = 'Characters' }: { tab?: 'Characters' | 'Components' }) {
  const component = tab === 'Components';
  const noun = component ? 'component' : 'character';
  const { preferences, catalogVersion } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string>();
  const [audioError, setAudioError] = useState<string | null>(null);
  const entries = libraryEntries(tab);
  useEffect(() => { setSelectedId(randomOverviewCharacter(libraryEntries(tab), preferences.includeTraditional)?.id); }, [catalogVersion, preferences.includeTraditional, tab]);
  const entry = entries.find(candidate => candidate.id === selectedId) ?? filterLibrary(entries, '', '', false, preferences.includeTraditional)[0];
  const recording = entry ? characterRecording(entry.hanzi, entry.pinyin) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), entry?.pinyin);
  const nextCharacter = () => { setSelectedId(randomOverviewCharacter(entries, preferences.includeTraditional, entry?.id)?.id); setAudioError(null); };
  return <section className="daily-word overview-featured overview-character" aria-label={`A ${noun} to discover`}><div className="daily-word-top"><span className="eyebrow"><Sparkles size={14}/> {component ? 'A COMPONENT TO DISCOVER' : 'A CHARACTER TO DISCOVER'}</span><Button variant="ghost" size="icon" title={`Show another random ${noun}`} aria-label={`Show another random ${noun}`} onClick={nextCharacter} disabled={!entry}><Shuffle/></Button></div>{entry ? <><div className="overview-featured-word" aria-live="polite"><span className="word-level">{entry.strokes ? `${entry.strokes} strokes` : component ? 'Component reference' : 'Character reference'}{entry.script === 'Traditional' && <span className="traditional-label"> · Traditional</span>}</span><Link to="/characters" search={overviewCharacterDestination(entry, entries, preferences.includeTraditional, tab)} className="daily-word-content" aria-label={`Open ${entry.hanzi} in character library`}><div>{preferences.pinyin && <span className="pinyin">{entry.pinyin || '—'}</span>}<strong lang="zh-CN" className={entry.script === 'Traditional' ? 'traditional-character' : ''}>{entry.hanzi}</strong></div><div>{preferences.meaning && <h3>{entry.meaning || '—'}</h3>}<p>{entry.decomposition ? 'Sourced decomposition available' : component ? 'Structural component' : 'Imported character reference'}</p></div></Link></div><div className="overview-featured-actions"><Button asChild variant="outline" size="sm"><Link to="/characters" search={overviewCharacterDestination(entry, entries, preferences.includeTraditional, tab)}>Explore {noun} <ArrowUpRight/></Link></Button><Button variant="ghost" size="icon" disabled={!audioAvailable} className={audioAvailable ? '' : 'audio-tts-only'} aria-label={audioAvailable ? `Listen to ${entry.hanzi}` : `No audio available for ${entry.hanzi}`} title={audioAvailable ? recording ? 'Listen · Recording' : 'Listen · Browser speech' : undefined} onClick={async () => setAudioError(await playCharacter(entry.hanzi, preferences.slow, entry.pinyin))}><Volume2/></Button></div>{audioError && <p role="status" className="library-note">{audioError}</p>}</> : <p className="library-note">Loading {noun} library…</p>}</section>;
}