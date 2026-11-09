import { useEffect, useState } from 'react';
import { BookOpen, History, Info, Tag } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ExamplePronunciation } from './example-pronunciation';
import { characterAudioRequest } from '@/lib/catalog-store';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import { loadPinyinData, parsePinyin, hasRecording, soundId, type PinyinData } from '@/lib/pinyin-guide';
import type { AudioAttachment } from '@/lib/audio';
import { SourceInfo } from './source-info';
import { libraryEntries } from '@/lib/character-library';
import { radicalForm } from '@/lib/radical-strokes';
import { contextualVariantIdentity } from '@/lib/radical-contextual-identity';

/**
 * "Additional meanings and origins" for one radical variant card.
 * Inputs: the Kangxi family id and the exact variant form key (e.g. 86 / '86-1').
 * Data: public/data/radical_variant_etymology_audit.json, fetched lazily once.
 * Only reviewed claims are shown; entries without claims render nothing (the audit says
 * "unverified", never "no other meanings"). Character follow-ups awaiting confirmation are
 * labelled as such. Rendered only by radical variant detail cards — nowhere else.
 * A reviewed contextual identity (radical #96's 王-shaped jade component) adds a
 * "Component identity" section (label, component name, reading note) and a "Look-alike
 * character" row linking to the independent character; it comes from the small extracted
 * src/data/radical-contextual-identities.json, so it renders without waiting for the audit.
 */
type Source = { url: string; publisher: string };
type Claim = { claimType: string; englishMeaningOrInterpretation: string; alternativePinyin: string | null; appliesWhen: string | null; scopeNote?: string | null; sourceEvidenceSummary: string; source: Source; evidenceStatus: string; displayAs: string };
type Variant = { radicalId: number; variant: string; formKey: string; reviewedClaims: Claim[] };
type FollowUp = { glyph: string; pinyin: string; relatedVariant: string; interpretation: string; source: Source; evidenceStatus: string };
type Audit = { variants: Variant[]; characterSpecificFollowUps: FollowUp[] };

let audit: Promise<Audit> | undefined;
const loadAudit = () => (audit ??= fetch('/data/radical_variant_etymology_audit.json').then(r => { if (!r.ok) throw new Error(`etymology ${r.status}`); return r.json() as Promise<Audit>; }));
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1) + (/[.!?]$/.test(text) ? '' : '.');
const isHanzi = (text: string | null) => Boolean(text && /^\p{Script=Han}$/u.test(text));
const characterRecord = (glyph: string) => libraryEntries('Characters').find(entry => entry.hanzi === glyph);

export function RadicalVariantEtymology({ familyId, formKey, reading }: { familyId: number; formKey: string; reading?: string }) {
  const [data, setData] = useState<Audit | null>(null);
  const { preferences } = useWorkspace();
  // Alternative readings (e.g. 灬 biāo) have no character recording; the Pinyin guide's human
  // recording of that exact syllable + tone is the same sound, so it is attached only on an exact match.
  const [pinyin, setPinyin] = useState<PinyinData | null>(null);
  useEffect(() => { let live = true; loadPinyinData().then(d => { if (live) setPinyin(d); }).catch(() => undefined); return () => { live = false; }; }, []);
  const syllableRecording = (reading: string): AudioAttachment | null => {
    const parsed = parsePinyin(reading);
    if (!pinyin || !parsed?.tone || !hasRecording(pinyin, parsed.base, parsed.tone)) return null;
    const clip = pinyin.recordings[soundId(parsed.base, parsed.tone)];
    return clip ? { url: clip.url, source: pinyin.audioSource.name, license: pinyin.audioSource.license, recordingKind: 'syllable' } : null;
  };
  useEffect(() => { let live = true; loadAudit().then(d => { if (live) setData(d); }).catch(() => undefined); return () => { live = false; }; }, []);
  const record = data?.variants.find(v => v.radicalId === familyId && v.formKey === formKey);
  const identity = contextualVariantIdentity(familyId, formKey, radicalForm(familyId, formKey)?.character ?? '');
  if (!identity && (!data || !record?.reviewedClaims.length)) return null;
  const claims = record?.reviewedClaims ?? [];
  const definitions = claims.filter(c => c.displayAs === 'alternative_dictionary_definition');
  const notes = claims.filter(c => c.displayAs !== 'alternative_dictionary_definition');
  const characterNotes = notes.filter(c => isHanzi(c.appliesWhen));
  const generalNotes = notes.filter(c => !isHanzi(c.appliesWhen));
  const followUps = !data || !record ? [] : data.characterSpecificFollowUps.filter(f => f.relatedVariant === record.variant && !characterNotes.some(c => c.appliesWhen === f.glyph));
  // One (i) per section caption lists every source behind that section's lines, so the
  // meanings themselves carry no buttons and stay aligned like "In a character".
  type Cited = { source: Source; evidenceStatus: string; summary?: string };
  const sources = (items: Cited[]) => <SourceInfo inline className="detail-footnote">{items.map((item, i) => <span key={i}>{i > 0 && <br/>}{item.summary && <>{item.summary} · </>}{item.source.publisher}{item.evidenceStatus !== 'verified' ? ` · ${item.evidenceStatus.replace(/_/g, ' ')}` : ''}</span>)}</SourceInfo>;
  const claimSources = (claims: Claim[]) => sources(claims.map(c => ({ source: c.source, evidenceStatus: c.evidenceStatus, summary: c.sourceEvidenceSummary })));
  // Character-specific origins reuse the "In a character" row exactly: linked hanzi tile,
  // reading + speaker on the first line, the origin text styled like a translation below.
  const row = (key: string, glyph: string, pinyin: string, text: string, options: { link?: boolean; audio?: boolean; recording?: AudioAttachment | null; word?: boolean } = {}) => {
    const record = characterRecord(glyph);
    const reading = pinyin || record?.pinyin || '';
    const destination = options.link === false ? undefined : libraryDestination(glyph, preferences.includeTraditional);
    // `word` widens the tile so one border frames a whole multi-character name (斜玉旁).
    const tileClass = `decomposition-glyph${options.word ? ' variant-etymology-word-tile' : ''}${record?.script === 'Traditional' ? ' traditional-character' : ''}`;
    return <div className="glyph-usage-reference" key={key}>
      {destination ? <Button asChild variant="ghost" className={tileClass}><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open character ${glyph}`}><strong lang="zh-CN">{glyph}</strong></Link></Button> : <strong lang="zh-CN" className={`${tileClass} decomposition-glyph-static`}>{glyph}</strong>}
      <span className="glyph-usage-facts">
        {reading && <span className="glyph-usage-facts-row"><span className="example-pinyin-row"><span className="pinyin">{reading}</span>{options.recording ? <ExamplePronunciation request={{ text: reading, reading, audio: options.recording }} label={`${glyph} ${reading}`}/> : options.audio !== false && <ExamplePronunciation request={characterAudioRequest(glyph, reading)} label={`character ${glyph}`}/>}</span></span>}
        <span className="glyph-usage-meaning">{text}</span>
      </span>
    </div>;
  };
  // Identity first: it replaces the look-alike character's reading and meaning in the heading,
  // so the learner sees why right below the translation.
  const identitySection = identity && <section className="glyph-usage-section" aria-label="Component identity"><h3 className="eyebrow"><Tag size={13} aria-hidden="true"/>COMPONENT IDENTITY<SourceInfo inline className="detail-footnote">{identity.readingNote && <>{identity.readingNote}<br/></>}{identity.usageConstraint && <>{identity.usageConstraint}<br/></>}Radical variant etymology audit · {identity.formKey} · reviewed contextual identity</SourceInfo></h3>
    <p className="glyph-usage-meaning">{identity.preferredLabel}.</p>
    {/* The component name is a name, not a reading of the form: it gets its own bordered word tile, its
        recorded pinyin and speech (validated Mandarin TTS — no recording exists for the name). */}
    {identity.componentName && <div className="glyph-usage-parents">{row('name', identity.componentName.hanzi, identity.componentName.pinyin, 'Component name', { link: false, word: true })}</div>}
    {/* Learners read the plain note; the technical reading note sits in the (i) tooltip above. */}
    {identity.learnerNote && <p className="glyph-usage-meaning variant-etymology-scope">{identity.learnerNote}</p>}
  </section>;
  const lookAlikeSection = identity?.lookAlike && <section className="glyph-usage-section" aria-label="Look-alike character"><h3 className="eyebrow"><BookOpen size={13} aria-hidden="true"/>LOOK-ALIKE CHARACTER<SourceInfo inline className="detail-footnote">{identity.lookAlike.note}</SourceInfo></h3><div className="glyph-usage-parents">{row('look', identity.lookAlike.glyph, identity.lookAlike.pinyin, sentence(identity.lookAlike.meaning).replace(/;\s*/g, ', '))}</div></section>;
  return <div className="variant-etymology">
    {identitySection}
    {definitions.length > 0 && <section className="glyph-usage-section" aria-label="Alternative dictionary definition"><h3 className="eyebrow"><BookOpen size={13} aria-hidden="true"/>ALTERNATIVE DICTIONARY DEFINITION{claimSources(definitions)}</h3><div className="glyph-usage-parents">{definitions.map((d, i) => row(`d${i}`, record?.variant ?? '', d.alternativePinyin ?? '', sentence(d.englishMeaningOrInterpretation).replace(/;\s*/g, ', '), { link: false, audio: false, recording: d.alternativePinyin ? syllableRecording(d.alternativePinyin) : null }))}</div></section>}
    {generalNotes.length > 0 && <section className="glyph-usage-section" aria-label="Historical origin">{generalNotes.every(c => c.claimType === 'classification_warning') ? <h3 className="eyebrow"><Info size={13} aria-hidden="true"/>NOTE{claimSources(generalNotes)}</h3> : <h3 className="eyebrow"><History size={13} aria-hidden="true"/>HISTORICAL ORIGIN{claimSources(generalNotes)}</h3>}{generalNotes.map((c, i) => <p key={i} className="glyph-usage-meaning">{sentence(c.englishMeaningOrInterpretation)}{/* A reviewed full-sentence scope (scopeNote) reads naturally; older claims keep the raw appliesWhen label. */}{c.scopeNote ? <span className="variant-etymology-scope"> {c.scopeNote}</span> : c.appliesWhen && <span className="variant-etymology-scope"> Applies to: {c.appliesWhen}.</span>}</p>)}</section>}
    {(characterNotes.length > 0 || followUps.length > 0) && <section className="glyph-usage-section" aria-label="Other historical origins of this shape"><h3 className="eyebrow"><History size={13} aria-hidden="true"/>OTHER HISTORICAL ORIGINS OF THIS SHAPE{sources([...characterNotes.map(c => ({ source: c.source, evidenceStatus: c.evidenceStatus, summary: `${c.appliesWhen}: ${c.sourceEvidenceSummary}` })), ...followUps.map(f => ({ source: f.source, evidenceStatus: f.evidenceStatus, summary: f.glyph }))])}</h3><div className="glyph-usage-parents">
      {characterNotes.map((c, i) => row(`c${i}`, c.appliesWhen ?? '', '', sentence(c.englishMeaningOrInterpretation)))}
      {followUps.map((f, i) => row(`f${i}`, f.glyph, f.pinyin, sentence(f.interpretation)))}
    </div></section>}
    {lookAlikeSection}
  </div>;
}
