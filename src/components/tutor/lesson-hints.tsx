import { useCallback, useContext, useEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { stableContext } from '@/lib/stable-context';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { detailTrail, historyEntry } from '@/lib/detail-trail';
import { lessonGlyphHint, lessonGlyphHintById } from '@/lib/lesson-hints';
import { vocabularyKind, type Word } from '@/lib/mandarin';
import { useSentenceWords } from './use-sentence-words';
import { useWorkspace } from './workspace';
import { GlyphReadingSpeaker, MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { ExamplePronunciation } from './example-pronunciation';
import { MeaningText } from './meaning-text';

/**
 * Lesson character hints: every hanzi on a lesson page draws a thin ring on hover and,
 * when clicked/tapped, opens a small popup card about that one character (reading +
 * speaker, meaning, rank/strokes, Traditional/Radical pills, a link to the full Glyphs
 * card, and — when the clicked character sits inside a recorded word — that exact word).
 *
 * - LessonHintsProvider (lesson-page.tsx) owns the one shared popup and the on/off state
 *   (the remembered `lessonHints` preference, toggled live from the lesson's side column).
 *   A single Popover is anchored to whichever character was clicked (virtual anchor), so
 *   hundreds of characters never each mount their own popup. The open character is marked
 *   with data-hint-active directly on its element, so opening/closing never re-renders text.
 * - LessonHintsGate narrows hints for a subtree (practice questions enable them only after
 *   the question is answered or its answer shown, so a hint never gives the answer away).
 * - HintGlyphs renders recorded text with each Han character as a hint target; off (or
 *   gated) it renders plain text — no ring, no popup, no link. Outside a provider callers
 *   keep their own rendering (useLessonHints() returns null).
 *
 * Word context: an exact, unique Vocabulary headword for the whole recorded field/run first;
 * otherwise (owner-requested) the run is split words-first by segmentLessonExpression
 * (greedy longest unique headword, lesson-segments.ts) and each character gets the 2+-character
 * word it falls in, or no word. Presentation only — the recorded text is never changed.
 * The popup is transient UI (not a library selection), so it is not stored in the URL;
 * closing it (Esc, ×, outside click) returns focus to the character without scrolling.
 */

export type HintWord = { hanzi: string; pinyin: string; meaning: string; search: { tab: 'word' | 'phrase'; word: string }; audio: Word['audio'] };
type OpenState = { el: HTMLElement; glyph: string; word: HintWord | null };
type HintsContext = { enabled: boolean; backLabel: string; open: (el: HTMLElement, glyph: string, word: HintWord | null) => void; wordFor: (hanzi: string) => HintWord | null; wordsFor: (text: string, wholeFirst?: boolean) => (HintWord | null)[]; refFor: (glyph: string) => string | null };

const Ctx = stableContext<HintsContext | null>('lessonHints', null);
export const useLessonHints = () => useContext(Ctx);

const HAN_CHAR = /^\p{Script=Han}$/u;

export function LessonHintsProvider({ enabled, backLabel = 'Lesson', characterRefs, children }: { enabled: boolean; backLabel?: string; characterRefs?: Record<string, string> | undefined; children: ReactNode }) {
  const { items } = useWorkspace();
  const [state, setState] = useState<OpenState | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  // Shared words-first rule (use-sentence-words.ts), identical to detail-card sentences.
  const { wordFor, wordsFor } = useSentenceWords();
  const close = useCallback(() => setState(null), []);
  const open = useCallback((el: HTMLElement, glyph: string, word: HintWord | null) => {
    setState(current => current?.el === el ? null : { el, glyph, word });
  }, []);
  // Mark the open character (ring stays while its card is open).
  useEffect(() => {
    if (!state) return;
    anchorRef.current = state.el;
    state.el.setAttribute('data-hint-active', '');
    return () => state.el.removeAttribute('data-hint-active');
  }, [state]);
  // Turning hints off closes any open card.
  useEffect(() => { if (!enabled) setState(null); }, [enabled]);
  // The lesson's recorded catalog_character_refs: an exact record ID per character, or null.
  const refFor = useCallback((glyph: string) => characterRefs?.[glyph] ?? null, [characterRefs]);
  const value = useMemo(() => ({ enabled, backLabel, open, wordFor, wordsFor, refFor }), [enabled, backLabel, open, wordFor, wordsFor, refFor]);
  return <Ctx.Provider value={value}>
    {children}
    <Popover open={Boolean(state)} onOpenChange={next => { if (!next) close(); }}>
      {state && <PopoverAnchor virtualRef={{ current: state.el }}/>}
      {state && <PopoverContent side="bottom" align="center" sideOffset={8} collisionPadding={12} className="lesson-hint-card"
        aria-label={`Quick card for ${state.glyph}`}
        // Clicking another character switches the card instead of closing then reopening it.
        onInteractOutside={e => { if ((e.target as Element | null)?.closest?.('[data-lesson-hint]')) e.preventDefault(); }}
        onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={e => { e.preventDefault(); anchorRef.current?.focus({ preventScroll: true }); }}>
        <HintCard key={`${state.glyph}-${state.word?.hanzi ?? ''}`} glyph={state.glyph} word={state.word} onClose={close}/>
      </PopoverContent>}
    </Popover>
  </Ctx.Provider>;
}

/** Narrows hints inside a subtree (never re-enables what the provider turned off). */
export function LessonHintsGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const parent = useLessonHints();
  const value = useMemo(() => parent ? { ...parent, enabled: parent.enabled && enabled } : null, [parent, enabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** One hint target. Extra props (sentence pair-hover handlers, classes) merge in. */
export function HintChar({ glyph, word, focusable = true, className = '', ...rest }: { glyph: string; word?: HintWord | null; focusable?: boolean } & HTMLAttributes<HTMLSpanElement>) {
  const hints = useLessonHints();
  const activate = (el: HTMLElement) => hints?.open(el, glyph, word ?? null);
  return <span {...rest} role="button" tabIndex={focusable ? 0 : -1} data-lesson-hint="" className={`lesson-hint-char ${className}`.trim()} aria-label={`${glyph}: quick card`}
    onClick={(e: MouseEvent<HTMLSpanElement>) => { e.preventDefault(); e.stopPropagation(); activate(e.currentTarget); }}
    onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); activate(e.currentTarget); } }}>{glyph}</span>;
}

/** Recorded text with every Han character as a hint target (plain text when hints are off).
 *  `wordHanzi` (default: the text itself) is checked for an exact Vocabulary headword. */
export function HintGlyphs({ text, focusable = true, wordHanzi }: { text: string; focusable?: boolean; wordHanzi?: string }) {
  const hints = useLessonHints();
  if (!hints?.enabled) return <>{text}</>;
  const fixed = wordHanzi ? hints.wordFor(wordHanzi) : undefined;
  const perChar = fixed === undefined ? hints.wordsFor(text) : null;
  const chars = Array.from(text);
  const wordAt = (i: number) => perChar ? perChar[i] ?? null : fixed ?? null;
  // Consecutive characters of one identified word sit in one .lesson-hint-word span, so
  // hovering any of them rings the whole word (each character still opens its own card).
  const out: ReactNode[] = [];
  for (let i = 0; i < chars.length;) {
    const ch = chars[i]!;
    if (!HAN_CHAR.test(ch)) { out.push(ch); i++; continue; }
    const w = wordAt(i);
    let end = i + 1;
    while (w && end < chars.length && HAN_CHAR.test(chars[end]!) && wordAt(end) === w) end++;
    const run = chars.slice(i, end).map((c, k) => <HintChar key={i + k} glyph={c} word={w} focusable={focusable}/>);
    out.push(end - i > 1 ? <span key={`w${i}`} className="lesson-hint-run">{run}</span> : run);
    i = end;
  }
  return <>{out}</>;
}

/** The popup body: minimal facts for one exact record, plus the containing word. */
function HintCard({ glyph, word, onClose }: { glyph: string; word: HintWord | null; onClose: () => void }) {
  const { preferences, catalogVersion } = useWorkspace();
  const hints = useLessonHints();
  // Leaving the lesson for a full card records one Back step (like Practice does),
  // so the details window's Back returns here. Keyed by history entry, not URL.
  const rememberReturn = () => detailTrail.replace({ label: hints?.backLabel ?? 'Lesson', href: historyEntry() });
  // catalogVersion: the catalogue loads lazily; recompute once it arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // A recorded catalog_character_refs ID names the exact record; without one the exact
  // written form is looked up. Either way the card never shows another glyph's data.
  const hint = useMemo(() => {
    const refId = hints?.refFor(glyph);
    return (refId ? lessonGlyphHintById(refId, preferences.includeTraditional) : null) ?? lessonGlyphHint(glyph, preferences.includeTraditional);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph, preferences.includeTraditional, catalogVersion, hints]);
  const traditional = hint?.script === 'Traditional';
  const facts = hint ? [hint.rank ? `Rank #${hint.rank}` : null, hint.strokes ? `${hint.strokes} ${hint.strokes === 1 ? 'stroke' : 'strokes'}` : null].filter(Boolean).join(' · ') : '';
  return <div className="lesson-hint-body">
    <button type="button" className="lesson-hint-close" aria-label="Close" onClick={onClose}><X size={14} aria-hidden="true"/></button>
    <div className="lesson-hint-head">
      <span lang="zh-CN" className={`lesson-hint-glyph${traditional ? ' traditional-character' : ''}${hint?.kind === 'Radicals' ? ' is-radical' : ''}`}>{glyph}</span>
      <div className="lesson-hint-reading">
        {(traditional || hint?.radicalNumber) && <span className="lesson-hint-pills">
          {traditional && <span className="lesson-hint-pill is-traditional">繁 Traditional</span>}
          {hint?.radicalNumber && <span className="lesson-hint-pill is-radical">部 Radical #{hint.radicalNumber}</span>}
        </span>}
        {hint?.pinyin ? (isMultiReading(hint.pinyin)
          ? <span className="lesson-hint-pinyin"><MultiReadingSpeakers spoken={hint.spoken} reading={hint.pinyin} variant="example"/></span>
          : <span className="lesson-hint-pinyin"><span className="pinyin">{hint.pinyin}</span><GlyphReadingSpeaker spoken={hint.spoken} reading={hint.pinyin} variant="example"/></span>)
          : hint?.componentName ? <span className="lesson-hint-pinyin"><span className="pinyin">Name · {hint.componentName}</span></span> : null}
        {hint ? <p className="lesson-hint-meaning"><MeaningText text={hint.meaning}/></p>
          : <p className="lesson-hint-meaning is-absent">{catalogVersion ? 'No Glyphs card for this character yet.' : 'Loading…'}</p>}
        {facts && <p className="lesson-hint-facts">{facts}</p>}
      </div>
    </div>
    {word && <div className="lesson-hint-word">
      <span className="lesson-hint-word-label">{Array.from(word.hanzi).length === 1 ? 'As a word' : 'In the word'}</span>
      <span className="lesson-hint-word-row">
        <Link to="/vocabulary" search={word.search} className="lesson-hint-word-link" title={`Open the word ${word.hanzi}`} onClick={rememberReturn}><span lang="zh-CN" className="lesson-hint-word-hanzi">{word.hanzi}</span><span className="pinyin">{word.pinyin}</span><ArrowUpRight size={13} aria-hidden="true"/></Link>
        {/* Speaker stays outside the link so listening never navigates. */}
        {word.pinyin && <ExamplePronunciation request={{ text: word.hanzi, reading: word.pinyin, audio: word.audio ?? null }} label={word.hanzi}/>}
      </span>
      {word.meaning && <span className="lesson-hint-word-meaning"><MeaningText text={word.meaning}/></span>}
    </div>}
    {hint && <Link to="/characters" search={hint.search} className="lesson-hint-open" onClick={rememberReturn}>Open full card<ArrowUpRight size={14} aria-hidden="true"/></Link>}
  </div>;
}
