// "In a character" section of the Sound chart's Selected sound card: the characters
// whose recorded reading is exactly this syllable in the chosen tone, most used first.
// Inputs: the syllable base, the chosen tone (null = none chosen yet, so nothing is
// listed), the label the details window's Back button shows, and onLeave (called just
// before a character opens so the chart keeps its own Back trail). State: whether the
// full list is expanded; it collapses again for every new syllable or tone.
// The catalogue loads lazily in the workspace; catalogVersion re-runs the lookup once
// it arrives. Matching is exact (src/lib/syllable-characters.ts) — never inferred.
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { detailTrail } from '@/lib/detail-trail';
import { radicalIdentity } from '@/lib/radical-identities';
import { toneMark, type Tone } from '@/lib/pinyin-guide';
import { characterDestinations, radicalDestinations, syllableCharacters } from '@/lib/syllable-characters';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import { MeaningText } from './meaning-text';
import { UsageLabel } from './usage-label';
import { useWorkspace } from './workspace';

/** Characters shown before "Show all". */
export const SYLLABLE_CHARACTERS_SHOWN = 5;

export function SyllableCharacters({ base, tone, backLabel, onLeave }: { base: string; tone: Tone | null; backLabel: string; onLeave: () => void }) {
  const { preferences, catalogVersion } = useWorkspace();
  const includeTraditional = preferences.includeTraditional;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [base, tone]);
  // catalogVersion is 0 until the lazily fetched catalogue is installed.
  const entries = useMemo(() => (catalogVersion ? libraryEntries('Characters') : []), [catalogVersion]);
  const destinations = useMemo(() => characterDestinations(entries, includeTraditional), [entries, includeTraditional]);
  // A character that is itself a Kangxi radical (exact sourced identity) opens its radical card.
  const radicalCards = useMemo(() => (catalogVersion ? radicalDestinations(libraryEntries('Radicals'), includeTraditional) : new Map()), [catalogVersion, includeTraditional]);
  const destinationFor = (entry: (typeof entries)[number]) => (radicalIdentity(entry.hanzi).radicals.length ? radicalCards.get(entry.hanzi) : undefined)
    ?? destinations.get(entry.id) ?? { tab: 'Characters' as const, id: entry.id };
  const matches = useMemo(() => (tone === null || !entries.length ? [] : syllableCharacters(entries, base, tone, includeTraditional)), [entries, base, tone, includeTraditional]);
  const shown = expanded ? matches : matches.slice(0, SYLLABLE_CHARACTERS_SHOWN);

  return <section className="pinyin-characters" aria-label="In a character">
    <div className="eyebrow">IN A CHARACTER{matches.length ? ` · ${matches.length}` : ''}</div>
    {tone === null ? <p className="pinyin-characters-note">Click a tone to see its characters.</p>
      : !catalogVersion ? <p className="pinyin-characters-note">Loading characters…</p>
      : !matches.length ? <p className="pinyin-characters-note">No character in the dictionary reads <span lang="zh-Latn-pinyin">{toneMark(base, tone)}</span>.</p>
      : <>
        <ul className="pinyin-character-list">{shown.map(entry => <li key={entry.id} className={`pinyin-character${entry.script === 'Traditional' ? ' traditional-character' : ''}`}>
          {/* Only the hanzi box is the link (like decomposition tiles), so hover and focus
              outline the box alone; the rank and meaning beside it stay plain, selectable text. */}
          <Link to="/characters" search={destinationFor(entry)}
            className="pinyin-character-glyph" lang="zh-CN"
            title={entry.meaning || undefined} aria-label={`${entry.hanzi}${entry.meaning ? `, ${entry.meaning}` : ''} · open its details`}
            // The details window's Back returns to this exact sound (syllable + tone in the URL).
            onClick={() => { onLeave(); detailTrail.replace({ label: backLabel, href: window.location.href }); }}>
            {entry.hanzi}
          </Link>
          {/* To the right of the box, centred on it: the coloured corpus rank and the
              meaning styled like the glyph details' "In a character" rows. */}
          <span className="pinyin-character-text">
            {/* Top line: rank, then the same pills Decomposition shows — Radical #N only from
                the exact sourced glyph identity (never shape), Traditional from record metadata. */}
            {(() => {
              const radicals = radicalIdentity(entry.hanzi).radicals;
              const traditional = entry.script === 'Traditional';
              if (!usageOrder.loaded && !radicals.length && !traditional) return null;
              return <span className="pinyin-character-facts">
                {usageOrder.loaded && <UsageLabel rank={usageRank(entry, 'Characters', includeTraditional)} kind="Characters" compact />}
                {radicals.map(radical => <span key={radical.id} className="word-hsk-id radical-tag">Radical #{radical.number}</span>)}
                {traditional && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
              </span>;
            })()}
            {entry.meaning && <span className="pinyin-character-meaning"><MeaningText text={entry.meaning} /></span>}
          </span>
        </li>)}</ul>
        {matches.length > SYLLABLE_CHARACTERS_SHOWN && <Button variant="link" size="sm" className="pinyin-characters-more" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer' : `Show all ${matches.length}`}</Button>}
      </>}
  </section>;
}
