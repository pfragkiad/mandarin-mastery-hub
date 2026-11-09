import { useEffect, useState } from 'react';
import { BookOpen, History, Info } from 'lucide-react';
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
const readingOf = (glyph: string) => libraryEntries('Characters').find(entry => entry.hanzi === glyph)?.pinyin ?? '';

export function RadicalVariantEtymology({ familyId, formKey, reading }: { familyId: number; formKey: string; reading?: string }) {
  const [data, setData] = useState<Audit | null>(null);
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
  return <section className="variant-etymology">
    {altReadings.length > 0 && <p className="variant-etymology-readings"><span lang="zh-CN">{record.variant}</span> <span className="pinyin">{[reading, ...altReadings].filter(Boolean).join(' / ')}</span></p>}
    <h3>Additional meanings and origins</h3>
    {definitions.length > 0 && <div className="variant-etymology-group"><h3 className="eyebrow"><BookOpen size={13} aria-hidden="true"/>ALTERNATIVE DICTIONARY DEFINITION</h3>{definitions.map((d, i) => <p key={i}>{sentence(d.englishMeaningOrInterpretation).replace(/;\s*/g, ', ').replace(/\.$/, '')}{d.alternativePinyin && <> (<em>{d.alternativePinyin}</em>)</>}.{cite(d.source, d.evidenceStatus, d.sourceEvidenceSummary)}</p>)}</div>}
    {generalNotes.length > 0 && <div className="variant-etymology-group">{generalNotes.every(c => c.claimType === 'classification_warning') ? <h3 className="eyebrow"><Info size={13} aria-hidden="true"/>NOTE</h3> : <h3 className="eyebrow"><History size={13} aria-hidden="true"/>HISTORICAL ORIGIN</h3>}{generalNotes.map((c, i) => <p key={i}>{sentence(c.englishMeaningOrInterpretation)}{c.appliesWhen && <span className="variant-etymology-scope"> Applies to: {c.appliesWhen}.</span>}{cite(c.source, c.evidenceStatus, c.sourceEvidenceSummary)}</p>)}</div>}
    {(characterNotes.length > 0 || followUps.length > 0) && <div className="variant-etymology-group"><h3 className="eyebrow"><History size={13} aria-hidden="true"/>OTHER HISTORICAL ORIGINS OF THIS SHAPE</h3><ul>
      {characterNotes.map((c, i) => <li key={`c${i}`}><strong lang="zh-CN">{c.appliesWhen}</strong> <span className="pinyin">{readingOf(c.appliesWhen ?? '')}</span><p>{sentence(c.englishMeaningOrInterpretation)}{cite(c.source, c.evidenceStatus, c.sourceEvidenceSummary)}</p></li>)}
      {followUps.map((f, i) => <li key={`f${i}`}><strong lang="zh-CN">{f.glyph}</strong> <span className="pinyin">{f.pinyin}</span><p>{sentence(f.interpretation)}{cite(f.source, f.evidenceStatus)}</p></li>)}
    </ul></div>}
  </section>;
}
