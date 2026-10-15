import { useState } from 'react';
import { ArrowUpRight, Bookmark, Volume2, ArrowRight, Check } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { speak, type Word } from '@/lib/mandarin';
import { useWorkspace } from './workspace';
export function WordCard({ word, list = false, initiallyOpen = false }: { word: Word; list?: boolean; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [audioError, setAudioError] = useState(false);
  const { saved, toggleSaved, preferences } = useWorkspace();
  const bookmarked = saved.includes(word.id);
  const listen = () => setAudioError(!speak(word.hanzi, preferences.slow));
  return <><article className={`word-card ${list ? 'word-list-item' : ''} ${word.script === 'Traditional' ? 'is-traditional' : ''}`}>
    <div className="word-card-top"><span className="word-level">{word.script === 'Traditional' ? 'TRADITIONAL' : word.level === 'Sample' ? 'STARTER COLLECTION' : word.level.toUpperCase()}</span><Button variant="ghost" size="icon" aria-label={`Open ${word.meaning}`} title={`Open ${word.meaning}`} onClick={() => setOpen(true)}><ArrowUpRight/></Button></div>
    <Button variant="ghost" className="word-open" onClick={() => setOpen(true)} aria-label={`Study ${word.hanzi}`}><span className="word-character">{preferences.pinyin && <span className="pinyin">{word.pinyin}</span>}<span lang="zh-CN">{word.hanzi}</span></span>{preferences.meaning && <span className="word-meaning">{word.meaning}</span>}</Button>
    <div className="word-card-bottom"><span>{word.type}</span><div className="word-actions"><Button variant="ghost" size="icon" title="Listen to pronunciation" aria-label={`Listen to ${word.hanzi}`} onClick={listen}><Volume2/></Button><Button variant="ghost" size="icon" title={bookmarked ? 'Remove bookmark' : 'Bookmark word'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${word.hanzi}`} onClick={() => toggleSaved(word.id)}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button></div></div>
  </article><Dialog open={open} onOpenChange={setOpen}><DialogContent className="word-dialog"><div className="eyebrow">{word.collection}</div><DialogTitle className="font-display text-3xl">{word.meaning}</DialogTitle><DialogDescription>{word.level} · {word.type} · {word.script === 'Traditional' ? 'Traditional Chinese' : 'Simplified Chinese'}</DialogDescription><div className={`word-detail-character ${word.script === 'Traditional' ? 'is-traditional' : ''}`}><span className="pinyin">{preferences.pinyin && word.pinyin}</span><span lang="zh-CN">{word.hanzi}</span></div><div className="flex justify-center gap-3"><Button onClick={listen}><Volume2/>Listen</Button><Button variant="outline" onClick={() => toggleSaved(word.id)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save word'}</Button></div>{audioError && <p role="status" className="text-sm text-destructive">Audio isn’t available in this browser.</p>}<div className="sentence"><span className="eyebrow">IN A SENTENCE</span><p lang="zh-CN">{word.sentence}</p><span>{word.translation}</span></div><Button variant="secondary" asChild><Link to="/strokes" search={{ character: word.hanzi }} onClick={() => setOpen(false)}>Practice writing <ArrowRight/></Link></Button><p className="detail-footnote">Illustrative learning entry · Browser speech audio</p></DialogContent></Dialog></>;
}
