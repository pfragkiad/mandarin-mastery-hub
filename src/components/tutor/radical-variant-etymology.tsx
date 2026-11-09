import { useEffect, useState } from 'react';
import { BookOpen, History, Info } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ExamplePronunciation } from './example-pronunciation';
import { characterAudioRequest } from '@/lib/catalog-store';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import { SourceInfo } from './source-info';
import { libraryEntries } from '@/lib/character-library';

/**
 * "Additional meanings and origins" for one radical variant card.
 * Inputs: the Kangxi family id and the exact variant form key (e.g. 86 / '86-1').
 * Data: public/data/radical_variant_etymology_audit.json, fetched lazily once.
 * Only reviewed claims are shown; entries without claims render nothing (the audit says
 * "unverified", never "no other meanings"). Character follow-ups awaiting confirmation are
 * labelled as such. Rendered only by radical variant detail cards — nowhere else.
 */
type Source = { url: string; publisher: string };
type Claim = { claimType: string; englishMeaningOrInterpretation: string; alternativePinyin: string | null; appliesWhen: string | null; sourceEvidenceSummary: string; source: Source; evidenceStatus: string; displayAs: string };
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
  useEffect(() => { let live = true; loadAudit().then(d => { if (live) setData(d); }).catch(() => undefined); return () => { live = false; }; }, []);
  const record = data?.variants.find(v => v.radicalId === familyId && v.formKey === formKey);
  if (!data || !record?.reviewedClaims.length) return null;
  const definitions = record.reviewedClaims.filter(c => c.displayAs === 'alternative_dictionary_definition');
  const notes = record.reviewedClaims.filter(c => c.displayAs !== 'alternative_dictionary_definition');
  const characterNotes = notes.filter(c => isHanzi(c.appliesWhen));
  const generalNotes = notes.filter(c => !isHanzi(c.appliesWhen));
  const followUps = data.characterSpecificFollowUps.filter(f => f.relatedVariant === record.variant && !characterNotes.some(c => c.appliesWhen === f.glyph));
  const altReadings = definitions.map(d => d.alternativePinyin).filter((p): p is string => Boolean(p) && p !== reading);
  const cite = (source: Source, status: string, summary?: string) => <SourceInfo inline className="detail-footnote">{summary && <>{summary}<br/></>}{source.publisher}{status !== 'verified' ? ` · ${status.replace(/_/g, ' ')}` : ''}</SourceInfo>;
  // Character-specific origins reuse the "In a character" row exactly: linked hanzi tile,
  // reading + speaker on the first line, the origin text styled like a translation below.
  const row = (key: string, glyph: string, pinyin: string, text: string, citation: React.ReactNode) => {
    const record = characterRecord(glyph);
    const reading = pinyin || record?.pinyin || '';
    const destination = libraryDestination(glyph, preferences.includeTraditional);
    const tileClass = `decomposition-glyph${record?.script === 'Traditional' ? ' traditional-character' : ''}`;
    return <div className="glyph-usage-reference" key={key}>
      {destination ? <Button asChild variant="ghost" className={tileClass}><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open character ${glyph}`}><strong lang="zh-CN">{glyph}</strong></Link></Button> : <strong lang="zh-CN" className={`${tileClass} decomposition-glyph-static`}>{glyph}</strong>}
      <span className="glyph-usage-facts">
        {reading && <span className="glyph-usage-facts-row"><span className="example-pinyin-row"><span className="pinyin">{reading}</span><ExamplePronunciation request={characterAudioRequest(glyph, reading)} label={`character ${glyph}`}/></span></span>}
        <span className="glyph-usage-meaning">{text}{citation}</span>
      </span>
    </div>;
  };
  return <div className="variant-etymology">
    {altReadings.length > 0 && <p className="variant-etymology-readings"><span lang="zh-CN">{record.variant}</span> <span className="pinyin">{[reading, ...altReadings].filter(Boolean).join(' / ')}</span></p>}
    {definitions.length > 0 && <section className="glyph-usage-section" aria-label="Alternative dictionary definition"><h3 className="eyebrow"><BookOpen size={13} aria-hidden="true"/>ALTERNATIVE DICTIONARY DEFINITION</h3>{definitions.map((d, i) => <p key={i} className="glyph-usage-meaning">{sentence(d.englishMeaningOrInterpretation).replace(/;\s*/g, ', ').replace(/\.$/, '')}{d.alternativePinyin && <> (<em>{d.alternativePinyin}</em>)</>}.{cite(d.source, d.evidenceStatus, d.sourceEvidenceSummary)}</p>)}</section>}
    {generalNotes.length > 0 && <section className="glyph-usage-section" aria-label="Historical origin">{generalNotes.every(c => c.claimType === 'classification_warning') ? <h3 className="eyebrow"><Info size={13} aria-hidden="true"/>NOTE</h3> : <h3 className="eyebrow"><History size={13} aria-hidden="true"/>HISTORICAL ORIGIN</h3>}{generalNotes.map((c, i) => <p key={i} className="glyph-usage-meaning">{sentence(c.englishMeaningOrInterpretation)}{c.appliesWhen && <span className="variant-etymology-scope"> Applies to: {c.appliesWhen}.</span>}{cite(c.source, c.evidenceStatus, c.sourceEvidenceSummary)}</p>)}</section>}
    {(characterNotes.length > 0 || followUps.length > 0) && <section className="glyph-usage-section" aria-label="Other historical origins of this shape"><h3 className="eyebrow"><History size={13} aria-hidden="true"/>OTHER HISTORICAL ORIGINS OF THIS SHAPE</h3><div className="glyph-usage-parents">
      {characterNotes.map((c, i) => row(`c${i}`, c.appliesWhen ?? '', '', sentence(c.englishMeaningOrInterpretation), cite(c.source, c.evidenceStatus, c.sourceEvidenceSummary)))}
      {followUps.map((f, i) => row(`f${i}`, f.glyph, f.pinyin, sentence(f.interpretation), cite(f.source, f.evidenceStatus)))}
    </div></section>}
  </div>;
}
