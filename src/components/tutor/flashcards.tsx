import { DraftFilterForm } from './filter-form';
import { GameSetup, GameReady } from './game-setup';
import { MeaningText } from './meaning-text';
import { useEffect, useMemo, useState } from 'react';
import { useFlashcardSession, type FlashCard } from './flashcard-session';
import { DetailsIcon } from './practice-icons';
import { detailTrail } from '@/lib/detail-trail';
import { RotateCcw, Shuffle, Volume2, Check, X, Play, Bookmark } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { includeScript } from '@/lib/learning-preferences';
import { collections, partOfSpeechList, partOfSpeechOptions, vocabularyKind, type Word } from '@/lib/mandarin';
import { audioCandidates, playPronunciation } from '@/lib/audio';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { referenceCatalog, savedGlyphEntry, savedGlyphDestination, type LibraryEntry, type LibraryKind, type ReferenceKind } from '@/lib/character-library';
import { displayMeaning } from '@/lib/glyph-presentation';
import { useWorkspace } from './workspace';
import { usageGroupLabel, usageGroups, usageGroupFor, usageRank, parseUsageGroup } from '@/lib/usage-frequency';

type Card = FlashCard;
const libraryKinds: Record<ReferenceKind, LibraryKind> = { Radical: 'Radicals', Component: 'Components', Character: 'Characters' };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i] as T; b[i] = b[j] as T; b[j] = t; } return b; };

const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;

export type FlashcardFilters = { category: string; level: string; pos: string; usage: string };
export function FlashcardsPage({ category: controlledCategory, level: controlledLevel, pos: controlledPos, usage: controlledUsage, onFiltersChange }: Partial<FlashcardFilters> & { onFiltersChange?: (filters: FlashcardFilters) => void } = {}) {
  const { items, preferences, saved, toggleSaved, catalogVersion } = useWorkspace();
  const [localFilters, setLocalFilters] = useState<FlashcardFilters>({ category: 'All vocabulary', level: 'All levels', pos: 'All types', usage: '' });
  const applied = { category: controlledCategory ?? localFilters.category, level: controlledLevel ?? localFilters.level, pos: controlledPos ?? localFilters.pos, usage: controlledUsage ?? localFilters.usage };
  const { category, level, pos, usage } = applied;
  const activeFilters = Boolean((!category.startsWith('Ref:') && category !== 'All vocabulary') || level !== 'All levels' || pos !== 'All types' || usage);
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
  const isSaved = category === 'Saved';

  const pool = useMemo<Card[]>(() => {
    if (isReference || isSaved) {
      const referenceCards = (kind: ReferenceKind) => {
        const reference = referenceCatalog.find(c => c.kind === kind);
        if (!reference) return [];
        const libraryKind = libraryKinds[reference.kind];
        return reference.entries.filter(row => includeScript(row[4], preferences.includeTraditional)).map(([hanzi, pinyin, meaning, , script]) => ({ id: `${libraryKind}:${hanzi}`, libraryKind, hanzi, pinyin, meaning: displayMeaning(meaning), ...(script ? { script } : {}) }));
      };
      if (isSaved) {
        const kinds = Object.keys(libraryKinds) as ReferenceKind[];
        return [...items.filter(w => saved.includes(w.id)), ...kinds.flatMap(kind => referenceCards(kind).filter(card => saved.includes(card.id))), ...saved.flatMap(id => { const entry = id.includes(':variant:') ? savedGlyphEntry(id) : undefined; return entry && includeScript(entry.script, preferences.includeTraditional) ? [{ ...entry, libraryKind: 'Radicals' as const }] : []; })];
      }
      const refKind = libraryKinds[category.slice(4) as ReferenceKind];
      const group = refKind ? parseUsageGroup(refKind, usage) : undefined;
      const kangxi = new Map(refKind === 'Radicals' ? referenceCatalog.find(c => c.kind === 'Radical')?.entries.map(row => [row[0], Number((row[3] ?? "").match(/\bRadical #(\d+)\b/i)?.[1]) || undefined] as const) ?? [] : []);
      return referenceCards(category.slice(4) as ReferenceKind).filter(card => !group || !refKind || usageGroupFor(refKind, usageRank({ ...card, ...(kangxi.get(card.hanzi) ? { kangxiIndex: kangxi.get(card.hanzi) as number } : {}) }, refKind, preferences.includeTraditional))?.value === group);
    }
    return items.filter(w => (category === 'All vocabulary' || w.collection === category) && (level === 'All levels' || w.level === level) && (pos === 'All types' || partOfSpeechList(w).includes(pos)));
  }, [items, category, level, pos, isReference, isSaved, saved, usage, preferences.includeTraditional, catalogVersion]);

  const roundSize = deckSize === 'all' ? pool.length : Math.min(deckSize, pool.length);
  const start = (cards: Card[], next = false) => {
    const dealt = next ? shuffle(cards) : shuffle(cards).slice(0, deckSize === 'all' ? cards.length : deckSize);
    setSession(s => ({ ...s, round: next ? s.round + 1 : 1, total: next ? s.total : dealt.length, deck: dealt, index: 0, flipped: false, missed: [] }));
  };
  const answer = (known: boolean) => {
    if (!deck) return;
    const current = deck[index];
    setSession(s => ({ ...s, flipped: false, missed: !known && current ? [...s.missed, current] : s.missed }));
    // Advance after the flip-back starts; a repeated miss goes to the end of the deck.
    setTimeout(() => setSession(s => ({ ...s, deck: repeat && !known && current && s.deck ? [...s.deck, current] : s.deck, index: s.index + 1 })), 150);
  };
  const card = deck?.[index];
  const done = deck && index >= deck.length;
  const request = { ...characterAudioRequest(card?.hanzi ?? '', card?.pinyin), audio: card?.audio ?? null };
  const source = audioCandidates(request)[0]?.label;
  const audioAvailable = usePronunciationAvailability(audioCandidates(request).some(candidate => candidate.kind === 'recording'), card?.pinyin);

  const uniqueMissed = [...new Map(missed.map(m => [m.id, m])).values()];
  const unsavedMissed = uniqueMissed.filter(m => !saved.includes(m.id));
  const firstTry = repeat ? deck ? new Set(deck.map(c => c.id)).size - uniqueMissed.length : 0 : 0;
  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">REMEMBER · RECALL · REPEAT</div><h1>Turn a card, test your memory.</h1></div><span className="heading-hanzi">记<span>jì</span></span></div>
    {/* Game dropdowns apply immediately: filters only shape the next deck, never the active round. */}
    <GameSetup filters={<DraftFilterForm applied={applied} active={activeFilters} count={pool.length} autoApply onApply={configure} onClear={() => { const empty = { category: isReference ? category : 'All vocabulary', level: 'All levels', pos: 'All types', usage: '' }; configure(empty); return empty; }}>{({ draft, patch, setDraft }) => { const draftReference = draft.category.startsWith('Ref:'); const draftSaved = draft.category === 'Saved'; return <>
      <select className="filter-select" aria-label="Category" value={draft.category} onChange={e => setDraft({ category: e.target.value, level: 'All levels', pos: 'All types', usage: '' })}>
        <optgroup label="Vocabulary"><option>All vocabulary</option>{collections.map(c => <option key={c}>{c}</option>)}</optgroup>
        <optgroup label="Library">{referenceCatalog.map(c => <option key={c.kind} value={`Ref:${c.kind}`}>{c.kind}s</option>)}</optgroup>
        <optgroup label="Workspace"><option>Saved</option></optgroup>
      </select>
      {!draftReference && !draftSaved && <>
        <select className="filter-select" aria-label="HSK level" value={draft.level} onChange={e => patch({ level: e.target.value })}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select>
        <select className="filter-select" aria-label="Part of speech" value={draft.pos} onChange={e => patch({ pos: e.target.value })}><option>All types</option>{posOptions.map(p => <option key={p}>{p}</option>)}</select>
      </>}
      {draftReference && <select className="filter-select" aria-label="Frequency" value={parseUsageGroup(libraryKinds[draft.category.slice(4) as ReferenceKind], draft.usage) ?? ''} onChange={e => patch({ usage: e.target.value })}><option value="">All ranks</option>{usageGroups(libraryKinds[draft.category.slice(4) as ReferenceKind]).map(group => <option key={group.value} value={group.value}>{usageGroupLabel(group, libraryKinds[draft.category.slice(4) as ReferenceKind], preferences.includeTraditional)}</option>)}</select>}
    </>; }}</DraftFilterForm>}>
      <select className="filter-select" aria-label="Card front" value={direction} onChange={e => patch({ direction: e.target.value as 'zh' | 'en', flipped: false })}><option value="zh">Chinese → English</option><option value="en">English → Chinese</option></select>
      <select className="filter-select" aria-label="Deck size" value={String(deckSize)} onChange={e => patch({ deckSize: e.target.value === 'all' ? 'all' : Number(e.target.value) })}>
        {deckSizes.map(n => <option key={n} value={n}>{n} cards</option>)}
        <option value="all">All cards</option>
      </select>
      <div className="flash-options">
        <label className={`flash-option ${direction === 'en' ? 'is-disabled' : ''}`}><Switch checked={showFrontPinyin} onCheckedChange={value => patch({ showFrontPinyin: value })} disabled={direction === 'en'} aria-label="Show pinyin on card front" /><span>Show pinyin on front</span></label>
        <label className="flash-option"><Switch checked={repeat} onCheckedChange={value => patch({ repeat: value })} aria-label="Repeat missed cards until all are known" /><span>Repeat missed until known</span></label>
      </div>
      <div className="flash-start"><Button onClick={() => start(pool)} disabled={!pool.length}><Play />{deck ? 'Restart' : 'Start'} · {roundSize} {roundSize === 1 ? 'card' : 'cards'}</Button></div>
    </GameSetup>

    {!deck && <GameReady available={pool.length > 0}/>}

    {card && !done && <div className={`flash-stage ${card.script === 'Traditional' ? 'is-traditional' : ''}`}>
      <div className="flash-meta"><span>Card {index + 1} of {deck?.length ?? 0}{round > 1 ? ` · round ${round}` : ''}</span><span>{missed.length} to review</span></div>
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
            <div className="flash-pinyin-row"><span className="pinyin flash-pinyin">{card.pinyin}</span><Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} title={audioAvailable ? `Listen · ${source}` : undefined} aria-label={audioAvailable ? `Listen to ${card.hanzi}` : `No audio available for ${card.hanzi}`} onClick={() => playPronunciation(request, preferences.slow)}><Volume2/></Button></div>
            <span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span><span className="flash-word"><MeaningText text={card.meaning}/></span>
          </div>
        </div>
      </div>
      <div className="flash-actions">
        <Button variant="outline" onClick={() => answer(false)} disabled={!flipped}><X />Still learning</Button>
        <Button onClick={() => answer(true)} disabled={!flipped}><Check />I knew it</Button>
      </div>
    </div>}

    {done && <div className="flash-stage"><div className="flash-result">
      <div className="eyebrow">DECK COMPLETE</div>
      {repeat ? <><strong>All {new Set(deck?.map(c => c.id)).size} known</strong><p>{uniqueMissed.length ? `${firstTry} on the first try. These took extra tries:` : 'Every card on the first try — well done.'}</p></>
        : <><strong>{(deck?.length ?? 0) - uniqueMissed.length} / {deck?.length ?? 0}</strong><p>{uniqueMissed.length ? 'These deserve another look — tap one to open it:' : 'A perfect round — well done.'}</p></>}
      {uniqueMissed.length > 0 && <div className="flash-missed">{uniqueMissed.map(m => <Link key={m.id} {...detailsFor(m)} onClick={rememberReturn} title={`${m.pinyin} · ${m.meaning} — open in ${m.libraryKind ? 'Glyphs' : 'Vocabulary'}`}><span lang="zh-CN">{m.hanzi}</span><small>{m.pinyin}</small></Link>)}</div>}
      {uniqueMissed.length > 0 && <div className="flex justify-center mb-4"><Button variant="outline" disabled={!unsavedMissed.length} onClick={() => unsavedMissed.forEach(m => toggleSaved(m.id))}>{unsavedMissed.length ? <Bookmark/> : <Check/>}{unsavedMissed.length ? `Save ${unsavedMissed.length} unknown ${unsavedMissed.length === 1 ? 'card' : 'cards'}` : 'Unknown cards saved'}</Button></div>}
      <div className="flex gap-2 flex-wrap justify-center">
        {uniqueMissed.length > 0 && <Button onClick={() => start(uniqueMissed, true)}><RotateCcw />New round with {uniqueMissed.length} missed</Button>}
        <Button variant="outline" onClick={() => start(pool)}><Shuffle />New round</Button>
      </div>
      {uniqueMissed.length > 0 && !unsavedMissed.length && <p role="status">Bookmarked in Saved for this session.</p>}
    </div></div>}
  </div>;
}
