// Sound chart: every attested syllable, grouped by initial, with a player for
// the selected syllable. Inputs: loaded data, remembered progress, the shared
// player, the applied URL filters and the URL-selected syllable and tone (both live
// in the URL, so browser Back and the card's own Back restore them exactly).
// The card's Back trail (soundTrail) remembers syllables opened from inside the card.
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ArrowLeft, ListMusic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FINAL_GROUPS, INITIAL_GROUPS, SPOKEN_TONES, TONE_HINTS, TONE_NAMES, findSyllable, hasRecording, matchesFinal, matchesInitial, matchesSyllable, soundAlikes, soundId, sortSyllables, toneMark, type PinyinData, type PinyinSyllable, type Tone } from '@/lib/pinyin-guide';
import { answered, needsReview, type PinyinProgress } from '@/lib/pinyin-progress';
import { DraftFilterForm } from './filter-form';
import { ToneContour, sound, type PinyinPlayer } from './pinyin-shared';
import { SyllableCharacters } from './pinyin-characters';
import { soundTrail } from '@/lib/detail-trail';
import { Search } from 'lucide-react';

export type ChartFilters = { q: string; initial: string; final: string };

export function InitialSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="filter-select" aria-label="Filter by initial" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">All initials</option>
    {INITIAL_GROUPS.map((group, index) => <optgroup key={group.label} label={group.label}>
      <option value={`group:${index}`}>{group.label}{group.initials[0] ? ` · ${group.initials.join(' ')}` : ''}</option>
      {group.initials[0] !== null && group.initials.map(initial => <option key={initial} value={initial ?? 'none'}>{initial}</option>)}
    </optgroup>)}
  </select>;
}
export function FinalSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="filter-select" aria-label="Filter by final" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">All finals</option>
    {FINAL_GROUPS.map((group, index) => <optgroup key={group.label} label={`Finals with ${group.label}`}>
      <option value={`group:${index}`}>Finals with {group.label}</option>
      {group.finals.map(final => <option key={final} value={final}>{final}</option>)}
    </optgroup>)}
  </select>;
}

/** The tones a tile shows as dots: recorded tones filled, unrecorded attested tones hollow. */
function TileTones({ data, syllable }: { data: PinyinData; syllable: PinyinSyllable }) {
  return <span className="pinyin-tile-tones" aria-hidden="true">{SPOKEN_TONES.map(t => <span key={t} className={`tone-${t} ${hasRecording(data, syllable.base, t) ? 'on' : syllable.tones.includes(t) ? 'off' : 'none'}`} />)}</span>;
}

// Chart instances currently mounted, and whether the last one left to open a character's
// details. The trail is cleared a tick after the chart unmounts unless it left for a
// character (whose details window offers Back to this sound); the deferred check also
// survives React's development double-mount without wiping the trail.
let chartMounts = 0;
let leftForCharacter = false;
// A Back step is identified by its history entry, not just its URL: following
// sound-alikes lai → lei → lai reaches the same URL again as a new entry, which must
// not count as "returned" and drop the step.
const historyEntry = () => `${window.location.href}#${(window.history.state as { __TSR_key?: string } | null)?.__TSR_key ?? ''}`;

export function PinyinChart({ data, progress, player, filters, selected, tone, slow, onSlow, onSelect, onTone, onFilters }: {
  data: PinyinData; progress: PinyinProgress; player: PinyinPlayer; filters: ChartFilters; selected?: string | undefined; tone: Tone | null; slow: boolean;
  onSlow: (slow: boolean) => void; onSelect: (base: string | undefined, tone?: Tone) => void; onTone: (tone: Tone | undefined) => void; onFilters: (filters: ChartFilters) => void;
}) {
  const sorted = useMemo(() => sortSyllables(data.syllables), [data]);
  const visible = useMemo(() => sorted.filter(s => matchesSyllable(s, filters.q) && matchesInitial(s, filters.initial) && matchesFinal(s, filters.final)), [sorted, filters]);
  const groups = useMemo(() => INITIAL_GROUPS.map(group => ({ ...group, items: visible.filter(s => group.initials.includes(s.initial)) })).filter(g => g.items.length), [visible]);
  const active = Boolean(filters.q || filters.initial || filters.final);
  const syllable = selected ? findSyllable(data, selected) : undefined;
  // The URL tone is the one the learner last chose, or null when none is chosen yet.
  // Picking a syllable on the grid never chooses (or plays) a tone for them, so the
  // player opens with no tone highlighted until one is clicked or keyed (1–4).
  // Choosing a tone plays it only when it has a recording (the neutral tone never does).
  const chooseTone = (t: Tone) => { onTone(t); if (syllable && hasRecording(data, syllable.base, t)) void player.play(sound(syllable.base, t)); };

  // Drop the card's Back step once history is back at it (card Back or browser Back).
  useEffect(() => { soundTrail.sync(historyEntry()); }, [selected, tone]);
  useEffect(() => {
    chartMounts += 1; leftForCharacter = false;
    return () => { chartMounts -= 1; setTimeout(() => { if (chartMounts === 0 && !leftForCharacter) soundTrail.clear(); }, 0); };
  }, []);

  // Number keys 1–4 play that tone of the selected syllable (not while typing).
  useEffect(() => {
    if (!syllable) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
      const t = Number(event.key) as Tone;
      if (t >= 1 && t <= 4 && hasRecording(data, syllable.base, t)) { event.preventDefault(); onTone(t); void player.play(sound(syllable.base, t)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [syllable, data, player, onTone]);

  // A syllable picked from "Sounds alike" also brings its grid tile into view and
  // focus once the new selection has rendered. Only that path sets the ref, so a
  // grid click (tile already on screen) or a URL/history change never scrolls.
  // A tile hidden by the current filters simply isn't found and nothing moves.
  const chartRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<string | null>(null);
  useEffect(() => {
    const base = revealRef.current;
    if (!base || base !== selected) return;
    revealRef.current = null;
    const tile = chartRef.current?.querySelector<HTMLElement>(`.pinyin-tile[data-base="${CSS.escape(base)}"]`);
    if (!tile) return;
    tile.focus({ preventScroll: true });
    // Scroll only when the tile is not fully visible: below the sticky header
    // (84px, matching .pinyin-player's top) and above the phone-size player
    // docked at the bottom of the window, so visible tiles never move.
    const rect = tile.getBoundingClientRect();
    const player = chartRef.current?.querySelector<HTMLElement>('.pinyin-player')?.getBoundingClientRect();
    const bottom = player && player.top > window.innerHeight / 2 ? player.top : window.innerHeight;
    if (rect.top < 84 || rect.bottom > bottom) tile.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selected]);
  // A sound-alike is a link inside the card: remember the sound being left for Back,
  // keep the chosen tone when the other syllable has it, and play it if recorded.
  const selectAlike = (base: string, label: string, current: Tone | null) => {
    const keep = current !== null && findSyllable(data, base)?.tones.includes(current) ? current : undefined;
    soundTrail.push({ label, href: historyEntry() });
    revealRef.current = base;
    onSelect(base, keep);
    if (keep !== undefined && hasRecording(data, base, keep)) void player.play(sound(base, keep));
  };

  return <div className="pinyin-chart-layout" ref={chartRef}>
    <div className="pinyin-chart-main">
      <DraftFilterForm applied={filters} active={active} count={visible.length} onApply={onFilters} onClear={() => { const empty = { q: '', initial: '', final: '' }; onFilters(empty); return empty; }}
        chips={[...(filters.initial ? [{ label: filters.initial === 'none' ? 'No initial' : filters.initial.startsWith('group:') ? INITIAL_GROUPS[Number(filters.initial.slice(6))]?.label ?? '' : filters.initial, clear: { initial: '' } }] : []), ...(filters.final ? [{ label: filters.final.startsWith('group:') ? `Finals with ${FINAL_GROUPS[Number(filters.final.slice(6))]?.label}` : filters.final, clear: { final: '' } }] : [])]}
        filterFields={({ draft, patch }) => <><InitialSelect value={draft.initial} onChange={initial => patch({ initial })} /><FinalSelect value={draft.final} onChange={final => patch({ final })} /></>}>
        {({ draft, patch }) => <div className="search-field"><Search /><input type="search" aria-label="Search syllables" placeholder="Find a syllable: rén, ren2, lv4…" value={draft.q} onChange={e => patch({ q: e.target.value })} /></div>}
      </DraftFilterForm>
      {groups.length === 0 ? <div className="record-gap pinyin-absent"><p>No syllable matches this search.</p></div> : groups.map(group => <section key={group.label} className="pinyin-group" aria-label={group.label}>
        <h2 className="pinyin-group-title">{group.label}{group.initials[0] !== null && <span>{group.initials.join(' ')}</span>}</h2>
        <div className="pinyin-tiles">{group.items.map(s => {
          const sounds = s.tones.filter(t => t !== 5).map(t => progress[soundId(s.base, t)]);
          const review = sounds.some(needsReview), done = sounds.some(answered);
          const recorded = s.tones.filter(t => hasRecording(data, s.base, t)).length;
          return <button key={s.base} type="button" data-base={s.base} className={`pinyin-tile${s.base === selected ? ' is-selected' : ''}`} aria-pressed={s.base === selected}
            aria-label={`${s.base}, ${recorded} tone${recorded === 1 ? '' : 's'} recorded${review ? ', needs review' : done ? ', practised' : ''}`}
            // Selecting a tile only opens it in the player — it never plays or highlights
            // a tone by itself; any sound still running from the previous syllable stops.
            // A grid card starts a fresh Back trail, like Previous/Next in the details window.
            onClick={() => { player.stop(); soundTrail.clear(); onSelect(s.base === selected ? undefined : s.base); }}>
            <span className="pinyin-tile-base" lang="zh-Latn-pinyin">{s.base}</span>
            <TileTones data={data} syllable={s} />
            {(review || done) && <span className={`pinyin-tile-state ${review ? 'review' : 'done'}`} aria-hidden="true" />}
          </button>;
        })}</div>
      </section>)}
    </div>
    <PinyinPlayerPanel data={data} progress={progress} player={player} syllable={syllable} tone={tone} slow={slow} onSlow={onSlow} onTone={chooseTone}
      onPlayAll={() => { if (!syllable) return; onTone(undefined); void player.sequence(syllable.tones.filter(t => hasRecording(data, syllable.base, t)).map(t => sound(syllable.base, t))); }}
      onSelect={selectAlike} onLeave={() => { player.stop(); leftForCharacter = true; }} />
  </div>;
}

/** Selected-syllable player: Back, tone buttons (neutral selectable but never playable), play-all, slow, parts, sound-alikes and characters. */
function PinyinPlayerPanel({ data, progress, player, syllable, tone, slow, onSlow, onTone, onPlayAll, onSelect, onLeave }: {
  data: PinyinData; progress: PinyinProgress; player: PinyinPlayer; syllable?: PinyinSyllable | undefined; tone: Tone | null; slow: boolean;
  onSlow: (slow: boolean) => void; onTone: (tone: Tone) => void; onPlayAll: () => void; onSelect: (base: string, label: string, current: Tone | null) => void; onLeave: () => void;
}) {
  const trail = useSyncExternalStore(soundTrail.subscribe, soundTrail.get, soundTrail.get);
  if (!syllable) return <aside className="pinyin-player is-empty" aria-label="Selected syllable"><div className="eyebrow">SELECTED SOUND</div><p className="pinyin-player-empty">Pick a syllable to hear its tones.</p><p className="pinyin-player-tip">Then press 1–4 to replay a tone.</p></aside>;
  const recorded = syllable.tones.filter(t => hasRecording(data, syllable.base, t));
  // With no tone chosen, the title is the bare syllable, "You" totals every recorded
  // tone, and sound-alikes are any syllable with at least one of those tones recorded.
  // While Play all runs, the tone being heard is the selected one; when the
  // sequence ends nothing stays selected (Play all clears the chosen tone first).
  const sequenceTone = player.sequencing ? recorded.find(t => player.playing === soundId(syllable.base, t)) ?? null : null;
  // The chosen tone may be the unrecorded neutral tone: it is selectable to show its characters.
  const chosen = tone !== null && syllable.tones.includes(tone) ? tone : null;
  const current = sequenceTone ?? chosen;
  const title = current !== null ? toneMark(syllable.base, current) : syllable.base;
  const back = trail[trail.length - 1];
  const alikes = current !== null && hasRecording(data, syllable.base, current) ? soundAlikes(data, syllable.base, current) : [...new Set(recorded.flatMap(t => soundAlikes(data, syllable.base, t)))].sort();
  const totals = (current !== null ? [current] : recorded).map(t => progress[soundId(syllable.base, t)]).reduce((sum, s) => ({ right: sum.right + (s?.right ?? 0), wrong: sum.wrong + (s?.wrong ?? 0) }), { right: 0, wrong: 0 });
  // Stop replaces Play all only for the sequence; single tones are too short to need it.
  const sequencePlaying = player.sequencing;
  return <aside className="pinyin-player" aria-label="Selected syllable">
    <div className="pinyin-player-head"><div className="eyebrow">SELECTED SOUND</div>
      {back && <Button variant="ghost" size="sm" className="pinyin-player-back" title={`Back to ${back.label}`} aria-label={`Back to ${back.label}`} onClick={() => { player.stop(); window.history.back(); }}><ArrowLeft/><span lang="zh-Latn-pinyin">{back.label}</span></Button>}
    </div>
    <h2 className="pinyin-player-title pinyin" lang="zh-Latn-pinyin">{title}</h2>
    <p className="pinyin-player-tone">{current !== null ? `${TONE_NAMES[current]} · ${TONE_HINTS[current]}${hasRecording(data, syllable.base, current) ? '' : ' · no recording'}` : 'Click a tone to hear it'}</p>
    <div className="pinyin-tone-buttons" role="group" aria-label="Tones">{syllable.tones.map(t => {
      const playable = hasRecording(data, syllable.base, t);
      // An unrecorded tone stays clickable (it shows its characters) but plays nothing; it gets its own grey look.
      return <button key={t} type="button" className={`pinyin-tone-button tone-${t}${playable ? '' : ' is-unrecorded'}${t === current ? ' is-current' : ''}${player.playing === soundId(syllable.base, t) ? ' is-playing' : ''}`} aria-pressed={t === current}
        aria-label={`${TONE_NAMES[t]}: ${toneMark(syllable.base, t)}${playable ? '' : ' · no recording'}`} title={playable ? `${TONE_NAMES[t]} (${t})` : `${TONE_NAMES[t]} · no recording; shows its characters`} onClick={() => onTone(t)}>
        {/* Neutral tone: name the tone, not the bare syllable, so "No recording" never reads as the whole syllable missing. */}
        <ToneContour tone={t} />{t === 5 ? <span>Neutral</span> : <span lang="zh-Latn-pinyin">{toneMark(syllable.base, t)}</span>}<small>{playable ? t : 'No recording'}</small>
      </button>;
    })}</div>
    <div className="pinyin-player-actions">
      {/* One button whose two labels share a grid cell: the hidden one still
          reserves its width, so switching Play all ⇄ Stop never resizes it. */}
      <Button variant="outline" size="sm" className="pinyin-playall" disabled={!sequencePlaying && recorded.length === 0} onClick={sequencePlaying ? player.stop : onPlayAll}>
        <span className={sequencePlaying ? 'is-hidden' : undefined} aria-hidden={sequencePlaying}><ListMusic />Play all</span>
        <span className={sequencePlaying ? undefined : 'is-hidden'} aria-hidden={!sequencePlaying}><Square />Stop</span>
      </Button>
      <label className="pinyin-slow"><Switch checked={slow} onCheckedChange={onSlow} aria-label="Slower pronunciation" />Slower</label>
    </div>
    {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
    <dl className="pinyin-parts">
      <div><dt>Initial</dt><dd>{syllable.initial ?? '—'}</dd></div>
      <div><dt>Final</dt><dd>{syllable.final}</dd></div>
      <div><dt>You</dt><dd>{totals.right + totals.wrong > 0 ? `${totals.right} right · ${totals.wrong} wrong` : 'Not practised yet'}</dd></div>
    </dl>
    {syllable.note && <p className="pinyin-note">{syllable.note}</p>}
    {alikes.length > 0 && <div className="pinyin-alikes"><div className="eyebrow">SOUNDS ALIKE — COMPARE</div><div>{alikes.map(base => <button key={base} type="button" className="pinyin-alike" onClick={() => onSelect(base, title, current)} lang="zh-Latn-pinyin">{current !== null && findSyllable(data, base)?.tones.includes(current) ? toneMark(base, current) : base}</button>)}</div></div>}
    <SyllableCharacters base={syllable.base} tone={chosen} backLabel={chosen !== null ? toneMark(syllable.base, chosen) : syllable.base} onLeave={onLeave} />
  </aside>;
}
