import { DraftFilterForm } from './filter-form';
import { openDetailsHint } from '@/lib/tile-hints';
import { GameSetup, GameReady, deckSummary } from './game-setup';
import { GamePlayBar, GameResults, MissedTick, toggleSkipped, useRoundEnd } from './game-round';
import { ExamplePronunciation } from './example-pronunciation';
import { TileBookmark } from './record-card-footer';
import { mixedRound } from '@/lib/pinyin-round';
import { MeaningText } from './meaning-text';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFlashcardSession, type FlashCard } from './flashcard-session';
import { DetailsIcon } from './practice-icons';
import { detailTrail } from '@/lib/detail-trail';
import { RotateCcw, Volume2, Check, X, Play, Target } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { includeScript } from '@/lib/learning-preferences';
import { collections, partOfSpeechList, partOfSpeechOptions, vocabularyKind, type Word } from '@/lib/mandarin';
import { audioCandidates, playPronunciation } from '@/lib/audio';
import { characterAudioRequest } from '@/lib/catalog-store';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { referenceCatalog, savedGlyphEntry, savedGlyphDestination, type LibraryEntry, type LibraryKind, type ReferenceKind } from '@/lib/character-library';
import { cardMeaning } from '@/lib/glyph-presentation';
import { useWorkspace } from './workspace';
import { usageGroupLabel, usageGroups, usageGroupFor, usageRank, parseUsageGroup } from '@/lib/usage-frequency';

type Card = FlashCard;
const libraryKinds: Record<ReferenceKind, LibraryKind> = { Radical: 'Radicals', Component: 'Components', Character: 'Characters' };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i] as T; b[i] = b[j] as T; b[j] = t; } return b; };

const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;

export type FlashcardFilters = { category: string; level: string; pos: string; usage: string; saved?: boolean | undefined };
export function FlashcardsPage({ category: controlledCategory, level: controlledLevel, pos: controlledPos, usage: controlledUsage, saved: controlledSaved, onFiltersChange }: Partial<FlashcardFilters> & { onFiltersChange?: (filters: FlashcardFilters) => void } = {}) {
  const { items, preferences, saved, toggleSaved, catalogVersion } = useWorkspace();
  const [localFilters, setLocalFilters] = useState<FlashcardFilters>({ category: 'All vocabulary', level: 'All levels', pos: 'All types', usage: '' });
  const applied = { category: controlledCategory ?? localFilters.category, level: controlledLevel ?? localFilters.level, pos: controlledPos ?? localFilters.pos, usage: controlledUsage ?? localFilters.usage, saved: controlledSaved ?? localFilters.saved };
  const { category, level, pos, usage } = applied;
  const savedOnly = Boolean(applied.saved);
  const activeFilters = Boolean((!category.startsWith('Ref:') && category !== 'All vocabulary') || level !== 'All levels' || pos !== 'All types' || usage || savedOnly);
  const configure = (filters: FlashcardFilters) => { setLocalFilters(filters); onFiltersChange?.(filters); };
  // The round lives in root session state so opening a card's Details and pressing
  // Back resumes the same card (still turned over) instead of a fresh setup.
  const [session, setSession] = useFlashcardSession();
  const { direction, showFrontPinyin, deckSize, deck, index, flipped, missed, repeat, round } = session;
  const patch = (next: Partial<typeof session>) => setSession(s => ({ ...s, ...next }));
  // Coming back from details ends that details-Back step, so a later details window
  // opened from a library grid never offers a stale "Back to Flashcards".
  useEffect(() => { detailTrail.clear(); }, []);
  // Details for the exact record (vocabulary entry or library glyph, incl. saved
  // radical variants). Back in the details window returns here via history.
  const detailsFor = (c: Card) => c.libraryKind
    ? { to: '/characters' as const, search: c.radicalVariant ? savedGlyphDestination(c as LibraryEntry) : { tab: c.libraryKind, id: c.id } }
    : { to: '/vocabulary' as const, search: { word: c.id, tab: vocabularyKind(c as unknown as Word) } };
  const rememberReturn = () => detailTrail.replace({ label: 'Flashcards', href: window.location.href });
  const levels = useMemo(() => [...new Set(items.map(w => w.level))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [items]);
  const posOptions = useMemo(() => partOfSpeechOptions(items), [items]);
  const isReference = category.startsWith('Ref:');

  // Deck pool for a category; `savedOnly` narrows it to bookmarked records, like the
  // Drawing game's All/Saved switch. Saved radical variants join the Radicals pool.
  const buildPool = (savedFilter: boolean): Card[] => {
    const referenceCards = (kind: ReferenceKind) => {
      const reference = referenceCatalog.find(c => c.kind === kind);
      if (!reference) return [];
      const libraryKind = libraryKinds[reference.kind];
      return reference.entries.filter(row => includeScript(row[4], preferences.includeTraditional)).map(([hanzi, pinyin, meaning, , script]) => ({ id: `${libraryKind}:${hanzi}`, libraryKind, hanzi, pinyin, meaning: cardMeaning(hanzi, pinyin, meaning), ...(script ? { script } : {}) }));
    };
    let base: Card[];
    if (isReference) {
      const refKind = libraryKinds[category.slice(4) as ReferenceKind];
      const group = refKind ? parseUsageGroup(refKind, usage) : undefined;
      const kangxi = new Map(refKind === 'Radicals' ? referenceCatalog.find(c => c.kind === 'Radical')?.entries.map(row => [row[0], Number((row[3] ?? "").match(/\bRadical #(\d+)\b/i)?.[1]) || undefined] as const) ?? [] : []);
      base = referenceCards(category.slice(4) as ReferenceKind).filter(card => !group || !refKind || usageGroupFor(refKind, usageRank({ ...card, ...(kangxi.get(card.hanzi) ? { kangxiIndex: kangxi.get(card.hanzi) as number } : {}) }, refKind, preferences.includeTraditional))?.value === group);
      if (savedFilter && refKind === 'Radicals') base = [...base, ...saved.flatMap(id => { const entry = id.includes(':variant:') ? savedGlyphEntry(id) : undefined; return entry && includeScript(entry.script, preferences.includeTraditional) ? [{ ...entry, libraryKind: 'Radicals' as const }] : []; })];
    } else {
      base = items.filter(w => (category === 'All vocabulary' || w.collection === category) && (level === 'All levels' || w.level === level) && (pos === 'All types' || partOfSpeechList(w).includes(pos)));
    }
    return savedFilter ? base.filter(card => saved.includes(card.id)) : base;
  };
  const pool = useMemo(() => buildPool(savedOnly), [items, category, level, pos, isReference, savedOnly, saved, usage, preferences.includeTraditional, catalogVersion]);
  // Count shown on the Saved half of the All/Saved switch: bookmarks in this category.
  const savedCount = useMemo(() => buildPool(true).length, [items, category, level, pos, isReference, saved, usage, preferences.includeTraditional, catalogVersion]);

  const roundSize = deckSize === 'all' ? pool.length : Math.min(deckSize, pool.length);
  const cardsUnit = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`;
  // Play-bar summary of the settings a round is dealt with, e.g. "All vocabulary · Chinese → English · 10 cards".
  const settingsLabel = () => {
    const refKind = isReference ? libraryKinds[category.slice(4) as ReferenceKind] : undefined;
    const group = refKind ? parseUsageGroup(refKind, usage) : undefined;
    const groupInfo = refKind && group ? usageGroups(refKind).find(g => g.value === group) : undefined;
    const parts = [...(savedOnly ? ['Saved'] : []), refKind ?? category, ...(!isReference && level !== 'All levels' ? [level] : []), ...(!isReference && pos !== 'All types' ? [pos] : []), ...(refKind && groupInfo ? [usageGroupLabel(groupInfo, refKind, preferences.includeTraditional)] : []), direction === 'zh' ? 'Chinese → English' : 'English → Chinese'];
    return parts.join(' · ');
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Deal a round: a fresh deck from `cards` (capped to the deck size) or, for a review, every card in `cards`. */
  const deal = (dealt: Card[], isReview: boolean) => {
    setSettingsOpen(false);
    setSession(s => ({ ...s, round: isReview ? s.round + 1 : 1, total: dealt.length, deck: dealt, index: 0, flipped: false, missed: [], ended: false, skipped: [], isReview, label: isReview ? `Review · ${cardsUnit(dealt.length)}` : `${settingsLabel()} · ${cardsUnit(dealt.length)}` }));
  };
  const start = (cards: Card[], next = false) => deal(next ? shuffle(cards) : shuffle(cards).slice(0, deckSize === 'all' ? cards.length : deckSize), next);
  const answer = (known: boolean) => {
    if (!deck) return;
    const current = deck[index];
    setSession(s => ({ ...s, flipped: false, missed: !known && current ? [...s.missed, current] : s.missed }));
    // Advance after the flip-back starts; a repeated miss goes to the end of the deck.
    setTimeout(() => setSession(s => ({ ...s, deck: repeat && !known && current && s.deck ? [...s.deck, current] : s.deck, index: s.index + 1 })), 150);
  };
  const done = Boolean(deck && (index >= deck.length || session.ended));
  const card = done ? undefined : deck?.[index];
  const request = { ...characterAudioRequest(card?.hanzi ?? '', card?.pinyin), audio: card?.audio ?? null };
  const source = audioCandidates(request)[0]?.label;
  const audioAvailable = usePronunciationAvailability(audioCandidates(request).some(candidate => candidate.kind === 'recording'), card?.pinyin);

  const uniqueMissed = [...new Map(missed.map(m => [m.id, m])).values()];
  const kept = uniqueMissed.filter(m => !session.skipped.includes(m.id));
  const uniqueDeck = deck ? [...new Map(deck.map(c => [c.id, c])).values()] : [];
  // Cards answered at least once (an early End leaves the rest unanswered).
  const reviewed = deck ? new Set(deck.slice(0, index).map(c => c.id)).size : 0;
  const changeSettings = () => { setSettingsOpen(false); patch({ deck: null, ended: false, flipped: false }); };
  const end = useRoundEnd({ active: Boolean(card), answered: index, onFinish: () => { setSettingsOpen(false); patch({ ended: true, flipped: false }); }, onQuit: changeSettings });
  // Keys while a card is showing: Space flips, ← still learning, → I knew it (after flipping).
  // Esc is useRoundEnd's; while "End now?" is open its own buttons take the keys.
  const keys = useRef({ card, flipped, confirming: end.confirming, answer });
  keys.current = { card, flipped, confirming: end.confirming, answer };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { card: shown, flipped: turned, confirming, answer: mark } = keys.current;
      if (!shown || confirming || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select|button|a)$/i.test(target.tagName))) return;
      if (event.key === ' ') { event.preventDefault(); setSession(s => ({ ...s, flipped: !s.flipped })); }
      else if (event.key === 'ArrowLeft' && turned) { event.preventDefault(); mark(false); }
      else if (event.key === 'ArrowRight' && turned) { event.preventDefault(); mark(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSession]);
  const setup = (action: ReactNode, summary: ReactNode) => <>
      <GameSetup summary={summary} action={action} filters={<DraftFilterForm applied={applied} active={activeFilters} count={pool.length} showCount={false} autoApply onApply={configure} onClear={() => { const empty = { category: isReference ? category : 'All vocabulary', level: 'All levels', pos: 'All types', usage: '' }; configure(empty); return empty; }}>{({ draft, patch, setDraft }) => { const draftReference = draft.category.startsWith('Ref:'); return <>
        <select className="filter-select" aria-label="Category" value={draft.category} onChange={e => setDraft({ category: e.target.value, level: 'All levels', pos: 'All types', usage: '', ...(draft.saved ? { saved: true } : {}) })}>
          <optgroup label="Vocabulary"><option>All vocabulary</option>{collections.map(c => <option key={c}>{c}</option>)}</optgroup>
          <optgroup label="Library">{referenceCatalog.map(c => <option key={c.kind} value={`Ref:${c.kind}`}>{c.kind}s</option>)}</optgroup>
        </select>
        <div className="vocabulary-saved-filter" role="group" aria-label="Saved cards">
          <Button type="button" variant="ghost" className={!draft.saved ? 'selected' : ''} aria-pressed={!draft.saved} onClick={() => patch({ saved: undefined })}>All</Button>
          <Button type="button" variant="ghost" className={draft.saved ? 'selected' : ''} aria-pressed={Boolean(draft.saved)} onClick={() => patch({ saved: true })}>Saved<span className="catalog-tab-count">{savedCount}</span></Button>
        </div>
        {!draftReference && <>
          <select className="filter-select" aria-label="HSK level" value={draft.level} onChange={e => patch({ level: e.target.value })}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select>
          <select className="filter-select" aria-label="Part of speech" value={draft.pos} onChange={e => patch({ pos: e.target.value })}><option>All types</option>{posOptions.map(p => <option key={p}>{p}</option>)}</select>
        </>}
        {draftReference && <select className="filter-select" aria-label="Frequency" value={parseUsageGroup(libraryKinds[draft.category.slice(4) as ReferenceKind], draft.usage) ?? ''} onChange={e => patch({ usage: e.target.value })}><option value="">All ranks</option>{usageGroups(libraryKinds[draft.category.slice(4) as ReferenceKind]).map(group => <option key={group.value} value={group.value}>{usageGroupLabel(group, libraryKinds[draft.category.slice(4) as ReferenceKind], preferences.includeTraditional)}</option>)}</select>}
      </>; }}</DraftFilterForm>}>
        <div className="game-option-row">
        <select className="filter-select" aria-label="Card front" value={direction} onChange={e => patch({ direction: e.target.value as 'zh' | 'en', flipped: false })}><option value="zh">Chinese → English</option><option value="en">English → Chinese</option></select>
        <select className="filter-select" aria-label="Deck size" value={String(deckSize)} onChange={e => patch({ deckSize: e.target.value === 'all' ? 'all' : Number(e.target.value) })}>
          {deckSizes.map(n => <option key={n} value={n}>{n} cards</option>)}
          <option value="all">All cards</option>
        </select>
        </div>
        <div className="flash-options">
          <label className={`flash-option ${direction === 'en' ? 'is-disabled' : ''}`}><Switch checked={showFrontPinyin} onCheckedChange={value => patch({ showFrontPinyin: value })} disabled={direction === 'en'} aria-label="Show pinyin on card front" /><span>Show pinyin on front</span></label>
          <label className="flash-option"><Switch checked={repeat} onCheckedChange={value => patch({ repeat: value })} aria-label="Repeat missed cards until all are known" /><span>Repeat missed until known</span></label>
        </div>
      </GameSetup>
  </>;
  const firstTry = reviewed - uniqueMissed.length;
  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">REMEMBER · RECALL · REPEAT</div><h1>Turn a card, test your memory.</h1></div><span className="heading-hanzi">记<span>jì</span></span></div>
    {/* Game dropdowns apply immediately: filters only shape the next deck, never the active round. */}
    {!deck && <>
      {setup(<Button onClick={() => start(pool)} disabled={!pool.length} aria-label={`Start · ${cardsUnit(roundSize)}`}><Play />Start</Button>, deckSummary(roundSize, pool.length))}
      <GameReady available={pool.length > 0}/>
    </>}

    {deck && !done && <section className="game-play" aria-label="Game">
      <GamePlayBar summary={session.label} settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen(o => !o)}
        onRestart={() => session.isReview ? start(uniqueDeck, true) : start(pool)} restartDisabled={!session.isReview && !pool.length} end={end} />
      {settingsOpen && setup(<Button onClick={() => start(pool)} disabled={!pool.length} aria-label={`Restart · ${cardsUnit(roundSize)}`}><RotateCcw />Restart with these</Button>, <>Changes apply to the next round · {deckSummary(roundSize, pool.length)}</>)}
      {card && <div className={`flash-stage ${card.script === 'Traditional' ? 'is-traditional' : ''}`}>
        <div className="flash-meta"><span>Card {index + 1} of {deck?.length ?? 0}{round > 1 ? ` · round ${round}` : ''}</span><span>{uniqueMissed.length} to review</span></div>
        <div className="flash-progress"><span style={{ width: `${(index / (deck?.length || 1)) * 100}%` }} /></div>
        <div className={`flash-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="flash-inner">
            <div className="flash-face" aria-hidden={flipped} inert={flipped}>
              <Button variant="ghost" className="flash-face-flip" onClick={() => setSession(s => ({ ...s, flipped: !s.flipped }))} aria-label="Flip card"/>
              {direction === 'zh' ? <>{showFrontPinyin && <span className="pinyin flash-pinyin">{card.pinyin}</span>}<span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span></> : <span className="flash-word"><MeaningText text={card.meaning}/></span>}<span className="flash-hint">TAP TO FLIP</span>
            </div>
            <div className="flash-face back" aria-hidden={!flipped} inert={!flipped}>
              <Button variant="ghost" className="flash-face-flip" onClick={() => patch({ flipped: true })} aria-label="Card answer"/>
              {/* Only on the answer side, so opening details never gives the answer away. */}
              <Button asChild variant="ghost" size="sm" className="flash-details"><Link {...detailsFor(card)} onClick={rememberReturn} title={`Open details for ${card.hanzi}`} aria-label={`Open details for ${card.hanzi}`}><DetailsIcon/>Details</Link></Button>
              <div className="flash-pinyin-row">{!card.audio && Array.from(card.hanzi).length === 1 && isMultiReading(card.pinyin) ? <MultiReadingSpeakers spoken={card.hanzi} reading={card.pinyin} variant="header" textClassName="pinyin flash-pinyin"/> : <><span className="pinyin flash-pinyin">{card.pinyin}</span><Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} title={audioAvailable ? `Listen · ${source}` : undefined} aria-label={audioAvailable ? `Listen to ${card.hanzi}` : `No audio available for ${card.hanzi}`} onClick={() => playPronunciation(request, preferences.slow)}><Volume2/></Button></>}</div>
              <span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span><span className="flash-word"><MeaningText text={card.meaning}/></span>
            </div>
          </div>
        </div>
        <div className="flash-actions">
          <Button variant="outline" onClick={() => answer(false)} disabled={!flipped}><X />Still learning</Button>
          <Button onClick={() => answer(true)} disabled={!flipped}><Check />I knew it</Button>
        </div>
        <p className="game-play-keys">Space flips · ← still learning · → I knew it · Esc ends</p>
      </div>}
    </section>}

    {done && deck && <GameResults eyebrow={session.isReview ? 'Review complete' : session.ended ? 'Session ended' : 'Session complete'}
      score={repeat ? firstTry : reviewed - uniqueMissed.length} total={reviewed} unit={repeat ? 'known on the first try' : 'known'}
      sub={<>{reviewed} of {uniqueDeck.length} reviewed{uniqueMissed.length ? ` · ${uniqueMissed.length} ${repeat ? 'took extra tries' : 'still learning'}` : ''}</>}
      listTitle={repeat ? 'Took extra tries' : 'Still learning'} listKind="cards" hasList={uniqueMissed.length > 0}
      empty={reviewed ? 'Every card known — well done.' : 'No cards answered in this round.'}
      actions={<>
        {uniqueMissed.length > 0 && <Button onClick={() => start(kept, true)} disabled={!kept.length}><Target />Review still learning ({kept.length})</Button>}
        <Button variant={uniqueMissed.length ? 'outline' : 'default'} disabled={!pool.length && !kept.length} onClick={() => deal(mixedRound(pool, deckSize === 'all' ? pool.length : deckSize, kept), false)}><Play />{kept.length ? 'New round + these' : 'New round'}</Button>
        <Button variant="ghost" onClick={changeSettings}>Change settings</Button>
      </>}
      note={uniqueMissed.length > 0 && 'Cards you know in a review round drop off the list.'}>
      {uniqueMissed.map(m => {
        const missedRequest = { ...characterAudioRequest(m.hanzi, m.pinyin), audio: m.audio ?? null };
        return <MissedTick key={m.id} label={m.hanzi} kept={!session.skipped.includes(m.id)} onToggle={() => patch({ skipped: toggleSkipped(session.skipped, m.id) })}>
          <Link {...detailsFor(m)} onClick={rememberReturn} className={`game-missed-hanzi${m.script === 'Traditional' ? ' traditional-character' : ''}`} lang="zh-CN" title={openDetailsHint(m.hanzi, m.libraryKind ?? vocabularyKind(m as unknown as Word))}>{m.hanzi}</Link>
          <span className="game-missed-reading example-pinyin-row">{!m.audio && Array.from(m.hanzi).length === 1 && isMultiReading(m.pinyin)
            ? <MultiReadingSpeakers spoken={m.hanzi} reading={m.pinyin} variant="header" textClassName="pinyin"/>
            : <><span className="pinyin">{m.pinyin}</span><ExamplePronunciation request={missedRequest} label={m.hanzi}/></>}</span>
          <span className="game-missed-note"><MeaningText text={m.meaning}/></span>
          <TileBookmark hanzi={m.hanzi} bookmarked={saved.includes(m.id)} onBookmark={() => toggleSaved(m.id)}/>
        </MissedTick>;
      })}
    </GameResults>}
  </div>;
}
