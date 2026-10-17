import { useState } from 'react';
import { ArrowUpRight, Bookmark, Volume2, ArrowRight, Check } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { type Word } from '@/lib/mandarin';
import { playPronunciation, audioCandidates, audioMessage } from '@/lib/audio';
import { useWorkspace } from './workspace';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { libraryDestination } from '@/lib/character-library';

const isCjk = (ch: string) => /[㐀-鿿豈-﫿]/.test(ch);

function SentenceCharacters({ sentence, onNavigate }: { sentence: string; onNavigate: () => void }) {
  const { preferences } = useWorkspace();
  return <p lang="zh-CN">{Array.from(sentence).map((ch, i) => {
    if (!isCjk(ch)) return <span key={i}>{ch}</span>;
    const dest = libraryDestination(ch, preferences.includeTraditional);
    if (!dest) return <span key={i}>{ch}</span>;
    return <Link key={i} to="/characters" search={dest} className="sentence-char" title={`Open ${ch} in Characters`} onClick={onNavigate}>{ch}</Link>;
  })}</p>;
}

/** Full word detail, shared by the floating dialog (mobile) and the side panel (desktop). */
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
    <div className="eyebrow">{word.collection}</div>
    <h2 className="font-display text-3xl">{word.meaning}</h2>
    <p className="word-detail-sub">{word.level} · {word.type} · {word.script === 'Traditional' ? 'Traditional Chinese' : 'Simplified Chinese'}</p>
    <div className={`word-detail-character ${word.script === 'Traditional' ? 'is-traditional' : ''}`}><span className="pinyin">{preferences.pinyin && word.pinyin}</span><span lang="zh-CN">{word.hanzi}</span></div>
    <div className="flex justify-center gap-3"><Button disabled={!audioAvailable} onClick={() => listen()}><Volume2/>Listen</Button><Button variant="outline" onClick={() => toggleSaved(word.id)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save word'}</Button></div>
    {audioError && <p role="status" className="text-sm text-destructive">{audioError}{canTts && <> <Button variant="link" size="sm" className="h-auto p-0" onClick={() => listen(true)}>Use Browser TTS</Button></>}</p>}
    {word.sentence && <div className="sentence"><span className="eyebrow">IN A SENTENCE</span>{preferences.pinyin && word.sentencePinyin && <span className="pinyin sentence-pinyin">{word.sentencePinyin}</span>}<SentenceCharacters sentence={word.sentence} onNavigate={close} /><span>{word.translation}</span></div>}
    <Button variant="secondary" asChild><Link to="/strokes" search={{ character: word.hanzi }} onClick={close}>Practice writing <ArrowRight/></Link></Button>
    <p className="detail-footnote">{word.entry?.sourceName ?? 'Mandarin Tutor database'} · {source}</p>
  </>;
}

export function WordCard({ word, list = false, initiallyOpen = false, open: controlledOpen, onOpenChange, panel = false }: { word: Word; list?: boolean; initiallyOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; panel?: boolean }) {
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
  return <><article className={`word-card ${list ? 'word-list-item' : ''} ${word.script === 'Traditional' ? 'is-traditional' : ''} ${open && panel ? 'is-selected' : ''}`}>
    <div className="word-card-top"><span className="word-level-wrap"><span className="word-level">{word.script === 'Traditional' ? 'TRADITIONAL' : word.level.toUpperCase()}</span>{word.hskId != null && <span className="word-hsk-id" title="Official id in the HSK 3.0 syllabus">ID {word.hskId}</span>}</span><Button variant="ghost" size="icon" aria-label={`Open ${word.meaning}`} title={`Open ${word.meaning}`} onClick={() => setOpen(true)}><ArrowUpRight/></Button></div>
    <Button variant="ghost" className="word-open" onClick={() => setOpen(true)} aria-label={`Study ${word.hanzi}`}><span className="word-character">{preferences.pinyin && <span className="pinyin">{word.pinyin}</span>}<span lang="zh-CN">{word.hanzi}</span></span>{preferences.meaning && <span className="word-meaning" title={word.meaning}>{word.meaning}</span>}</Button>
    <div className="word-card-bottom"><span>{word.type}</span><div className="word-actions"><Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} title={audioAvailable ? `Listen · ${source}` : undefined} aria-label={audioAvailable ? `Listen to ${word.hanzi}` : `No audio available for ${word.hanzi}`} onClick={() => listen()}><Volume2/></Button><Button variant="ghost" size="icon" title={bookmarked ? 'Remove bookmark' : 'Bookmark word'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${word.hanzi}`} onClick={() => toggleSaved(word.id)}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button></div></div>
  </article>{!panel && <Dialog open={open} onOpenChange={setOpen}><DialogContent className="word-dialog"><DialogTitle className="sr-only">{word.meaning}</DialogTitle><DialogDescription className="sr-only">{word.hanzi} · {word.pinyin}</DialogDescription><WordDetailContent word={word} onNavigate={() => setOpen(false)} /></DialogContent></Dialog>}</>;
}
