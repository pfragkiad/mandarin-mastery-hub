import { useState } from 'react';
import { ArrowUpRight, Bookmark, Volume2, ArrowRight, Check } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { type Word } from '@/lib/mandarin';
import { playPronunciation, audioCandidates, audioMessage } from '@/lib/audio';
import { useWorkspace } from './workspace';
import { characterAudioRequest } from '@/lib/catalog-store';
export function WordCard({ word, list = false, initiallyOpen = false }: { word: Word; list?: boolean; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [canTts, setCanTts] = useState(false);
  const request = { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null };
  const source = audioCandidates(request)[0]?.label ?? 'Browser TTS';
  const { saved, toggleSaved, preferences } = useWorkspace();
  const bookmarked = saved.includes(word.id);
  const listen = async (preferTts = false) => { const r = await playPronunciation(request, preferences.slow, preferTts); setAudioError(audioMessage(r)); setCanTts(!r.ok && r.canUseTts); };
  return <><article className={`word-card ${list ? 'word-list-item' : ''} ${word.script === 'Traditional' ? 'is-traditional' : ''}`}>
    <div className="word-card-top"><span className="word-level">{word.script === 'Traditional' ? 'TRADITIONAL' : word.level.toUpperCase()}</span><Button variant="ghost" size="icon" aria-label={`Open ${word.meaning}`} title={`Open ${word.meaning}`} onClick={() => setOpen(true)}><ArrowUpRight/></Button></div>
    <Button variant="ghost" className="word-open" onClick={() => setOpen(true)} aria-label={`Study ${word.hanzi}`}><span className="word-character">{preferences.pinyin && <span className="pinyin">{word.pinyin}</span>}<span lang="zh-CN">{word.hanzi}</span></span>{preferences.meaning && <span className="word-meaning">{word.meaning}</span>}</Button>
    <div className="word-card-bottom"><span>{word.type}</span><div className="word-actions"><Button variant="ghost" size="icon" title={`Listen · ${source}`} aria-label={`Listen to ${word.hanzi}`} onClick={() => listen()}><Volume2/></Button><Button variant="ghost" size="icon" title={bookmarked ? 'Remove bookmark' : 'Bookmark word'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${word.hanzi}`} onClick={() => toggleSaved(word.id)}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button></div></div>
  </article><Dialog open={open} onOpenChange={setOpen}><DialogContent className="word-dialog"><div className="eyebrow">{word.collection}</div><DialogTitle className="font-display text-3xl">{word.meaning}</DialogTitle><DialogDescription>{word.level} · {word.type} · {word.script === 'Traditional' ? 'Traditional Chinese' : 'Simplified Chinese'}</DialogDescription><div className={`word-detail-character ${word.script === 'Traditional' ? 'is-traditional' : ''}`}><span className="pinyin">{preferences.pinyin && word.pinyin}</span><span lang="zh-CN">{word.hanzi}</span></div><div className="flex justify-center gap-3"><Button onClick={() => listen()}><Volume2/>Listen</Button><Button variant="outline" onClick={() => toggleSaved(word.id)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save word'}</Button></div>{audioError && <p role="status" className="text-sm text-destructive">{audioError}{canTts && <> <Button variant="link" size="sm" className="h-auto p-0" onClick={() => listen(true)}>Use Browser TTS</Button></>}</p>}{word.sentence && <div className="sentence"><span className="eyebrow">IN A SENTENCE</span><p lang="zh-CN">{word.sentence}</p><span>{word.translation}</span></div>}<Button variant="secondary" asChild><Link to="/strokes" search={{ character: word.hanzi }} onClick={() => setOpen(false)}>Practice writing <ArrowRight/></Link></Button><p className="detail-footnote">{word.entry?.sourceName ?? 'Mandarin Tutor database'} · {source}</p></DialogContent></Dialog></>;
}
