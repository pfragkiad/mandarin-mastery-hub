// "In a character" section of the Sound chart's Selected sound card: the characters
// whose recorded reading is exactly this syllable in the chosen tone, most used first.
// Inputs: the syllable base, the chosen tone (null = none chosen yet, so nothing is
// listed), the label the details window's Back button shows, and onLeave (called just
// before a character opens so the chart keeps its own Back trail). State: whether the
// full list is expanded; it collapses again for every new syllable or tone.
// The catalogue loads lazily in the workspace; catalogVersion re-runs the lookup once
// it arrives. Matching is exact (src/lib/syllable-characters.ts) — never inferred.
// Simplified + traditional forms of an ordinary script pair that both read this sound
// with the same recorded meaning share one row (groupScriptForms); each box still opens
// its own record and different ranks are listed per box.
import { useEffect, useMemo, useState } from 'react';
import { openDetailsHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { detailTrail } from '@/lib/detail-trail';
import { radicalIdentity } from '@/lib/radical-identities';
import { readingMeaning } from '@/lib/catalog-store';
import { toneMark, type Tone } from '@/lib/pinyin-guide';
import { characterDestinations, groupScriptForms, radicalDestinations, radicalsFirst, syllableCharacters } from '@/lib/syllable-characters';
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
  const radicalCard = useMemo(() => (catalogVersion ? radicalDestinations(libraryEntries('Radicals'), includeTraditional) : () => undefined), [catalogVersion, includeTraditional]);
  const destinationFor = (entry: (typeof entries)[number]) => radicalCard(entry.hanzi)?.search ?? destinations.get(entry.id) ?? { tab: 'Characters' as const, id: entry.id };
  // A radical row's rank is its radical family's supplied rank (Radicals scope), never the
  // character-corpus rank; radical rows come first, then ordinary characters by their rank.
  const rankFor = (entry: (typeof entries)[number]) => {
    const radical = radicalCard(entry.hanzi);
    return radical ? { kind: 'Radicals' as const, rank: usageRank(radical.entry, 'Radicals', includeTraditional) } : { kind: 'Characters' as const, rank: usageRank(entry, 'Characters', includeTraditional) };
  };
  const usageLoaded = usageOrder.loaded;
  const matches = useMemo(() => {
    if (tone === null || !entries.length) return [];
    const found = syllableCharacters(entries, base, tone, includeTraditional);
    return radicalsFirst(found, entry => { const radical = radicalCard(entry.hanzi); return radical ? usageRank(radical.entry, 'Radicals', includeTraditional) : undefined; });
  }, [entries, base, tone, includeTraditional, radicalCard, usageLoaded]);
  // A multi-reading character (了 le / liǎo) shows the reviewed meaning of the reading this
  // sound card is about; without a reviewed split it keeps its combined dictionary meaning.
  const shownMeaning = (entry: (typeof entries)[number]) => (tone !== null ? readingMeaning(entry.hanzi, toneMark(base, tone)) : undefined) ?? entry.meaning;
  // Simplified + traditional forms share a row only for an ordinary script pair recording
  // the same meaning for this reading (groupScriptForms); "Show all" pages by rows, while
  // the eyebrow keeps counting every listed character.
  const rows = useMemo(() => groupScriptForms(matches, shownMeaning), [matches, base, tone]);
  const shown = expanded ? rows : rows.slice(0, SYLLABLE_CHARACTERS_SHOWN);
  const rankOf = (entry: (typeof entries)[number]) => rankFor(entry);

  return <section className="pinyin-characters" aria-label="In a character">
    <div className="eyebrow">IN A CHARACTER{matches.length ? ` · ${matches.length}` : ''}</div>
    {tone === null ? <p className="pinyin-characters-note">Click a tone to see its characters.</p>
      : !catalogVersion ? <p className="pinyin-characters-note">Loading characters…</p>
      : !matches.length ? <p className="pinyin-characters-note">No character in the dictionary reads <span lang="zh-Latn-pinyin">{toneMark(base, tone)}</span>.</p>
      : <>
        <ul className="pinyin-character-list">{shown.map(({ key, forms }) => {
          // All forms in a row record the same meaning (groupScriptForms), so one line serves them.
          const meaning = shownMeaning(forms[0]!);
          const onlyTraditional = forms.every(form => form.script === 'Traditional');
          return <li key={key} className={`pinyin-character${forms.length > 1 ? ' is-grouped' : ''}`}>
          {/* Only the hanzi boxes are links (like decomposition tiles), so hover and focus
              outline one box alone; the rank and meaning beside them stay plain, selectable
              text. A grouped row shows one box per form, each opening its own exact record. */}
          <span className="pinyin-character-glyphs">{forms.map(entry => {
            const traditional = entry.script === 'Traditional';
            // The hint always states the action, never the meaning (already printed to the
            // right of the boxes) or the script alone (the purple box / Traditional pill
            // already show it). A Kangxi radical character opens its radical card, every
            // other form opens its own character details — the same rule as destinationFor.
            const kind = radicalCard(entry.hanzi) ? 'Radicals' : 'Characters';
            const target = kind === 'Radicals' ? 'radical details' : 'character details';
            return <Link key={entry.id} to="/characters" search={destinationFor(entry)}
              className={`pinyin-character-glyph${traditional ? ' is-traditional' : ''}${kind === 'Radicals' ? ' is-radical' : ''}`} lang={traditional ? 'zh-TW' : 'zh-CN'}
              title={openDetailsHint(entry.hanzi, kind)}
              aria-label={`${entry.hanzi}${traditional && forms.length > 1 ? ' (traditional form)' : ''}${meaning ? `, ${meaning}` : ''} · open its ${target}`}
              // The details window's Back returns to this exact sound (syllable + tone in the URL).
              onClick={() => { onLeave(); detailTrail.replace({ label: backLabel, href: window.location.href }); }}>
              {entry.hanzi}
            </Link>;
          })}</span>
          {/* To the right of the boxes, centred on them: the coloured corpus rank and the
              meaning styled like the glyph details' "In a character" rows. */}
          <span className="pinyin-character-text">
            {/* Top line: rank, then the same pills Decomposition shows — Radical #N only from
                the exact sourced glyph identity (never shape), Traditional from record metadata
                (a grouped row's purple box already marks its traditional form). Forms whose own
                ranks differ list each rank in box order, joined by " / ". */}
            {(() => {
              const radicals = [...new Map(forms.flatMap(form => radicalIdentity(form.hanzi).radicals).map(radical => [radical.id, radical])).values()];
              if (!usageOrder.loaded && !radicals.length && !onlyTraditional) return null;
              const ranks = usageOrder.loaded ? forms.map(rankOf) : [];
              const sameRank = ranks.every(({ kind, rank }) => kind === ranks[0]?.kind && rank === ranks[0]?.rank);
              return <span className="pinyin-character-facts">
                {ranks.length > 0 && (sameRank ? <UsageLabel rank={ranks[0]!.rank} kind={ranks[0]!.kind} compact />
                  : <span className="pinyin-character-ranks">{ranks.map(({ kind, rank }, i) => <span key={forms[i]!.id}>{i > 0 && <span className="pinyin-character-rank-sep" aria-hidden="true">/</span>}<UsageLabel rank={rank} kind={kind} compact /></span>)}</span>)}
                {radicals.map(radical => <span key={radical.id} className="word-hsk-id radical-tag">Radical #{radical.number}</span>)}
                {onlyTraditional && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
              </span>;
            })()}
            {meaning && <span className="pinyin-character-meaning"><MeaningText text={meaning} /></span>}
          </span>
        </li>; })}</ul>
        {rows.length > SYLLABLE_CHARACTERS_SHOWN && <Button variant="link" size="sm" className="pinyin-characters-more" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer' : `Show all ${matches.length}`}</Button>}
      </>}
  </section>;
}
