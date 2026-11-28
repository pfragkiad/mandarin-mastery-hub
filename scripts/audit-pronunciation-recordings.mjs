#!/usr/bin/env node
/** Offline metadata audit of displayed readings, recording labels and pinned word sources.
 * This does not listen to clips, verify spoken content or change application data.
 * --write saves reports; --check verifies them; no arguments prints the summary only.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => ['--write', '--check'].includes(arg)), 'Use --write or --check');
const hashes = {};
const read = name => {
  const raw = readFileSync(new URL(name, root));
  hashes[name] = createHash('sha256').update(raw).digest('hex');
  return JSON.parse(raw.toString('utf8'));
};
const jiti = createJiti(import.meta.url, { alias: { '@': fileURLToPath(new URL('src/', root)) }, fsCache: false });
const load = name => jiti.import(fileURLToPath(new URL(`src/lib/${name}.ts`, root)));
const store = await load('catalog-store');
const { parsePinyin } = await load('pinyin-guide');
const { pinyinNumbered } = await load('pinyin-tones');
const { recordingCandidates } = await load('audio');
const { componentFormReference } = await load('component-form-references');
read('src/data/component-form-references.json');
store.hydrateCatalog({ ...read('public/data/catalog.json'), ...read('public/data/characters.json'), ...read('public/data/components.json'), ...read('public/data/radicals.json') }, read('public/data/radical-identities.json'), read('public/data/radical-strokes.json'), read('public/data/strokes.json'));
const glyphs = { bindings: 0, nullBindings: 0, missingAttachments: [], labelMismatches: [], quarantinedYanBindings: 0, quarantineStillPlayable: [] };
for (const [glyph, bindings] of Object.entries(store.catalog.readingAudio)) {
  for (const [reading, id] of Object.entries(bindings)) {
    glyphs.bindings++;
    if (!id) { glyphs.nullBindings++; continue; }
    if (!store.catalog.audio[id]) { glyphs.missingAttachments.push({ glyph, reading, id }); continue; }
    const expected = parsePinyin(reading);
    const labeled = id.startsWith('cmn-syl-') ? parsePinyin(id.slice(8)) : null;
    if (JSON.stringify(expected) !== JSON.stringify(labeled)) glyphs.labelMismatches.push({ glyph, reading, id });
    if (id === 'cmn-syl-yan2') {
      glyphs.quarantinedYanBindings++;
      if (recordingCandidates(store.characterAudioRequest(glyph, reading)).length) glyphs.quarantineStillPlayable.push({ glyph, reading });
    }
  }
}

const indexPath = 'importer/data/hsk-audio/cmn-caen-tan-index.xml.bz2';
hashes[indexPath] = createHash('sha256').update(readFileSync(new URL(indexPath, root))).digest('hex');
assert.equal(hashes[indexPath], '59052c11fcdfd0f0f21fcaf9618371f269f4a0228eaed920c3923e827f8d81a6');
// Python's standard library reads the preserved bzip2/XML source; no network or media access.
const python = `import bz2,json,xml.etree.ElementTree as ET
from pathlib import Path
r=ET.fromstring(bz2.decompress(Path('${indexPath}').read_bytes()))
assert r.find('group').get('swac_coll_copyright')=='(c) 2009 Yue Tan'
assert r.find('group').get('swac_coll_license')=='Creative Commons BY-SA 3.0 U.S'
out={}
for f in r.findall('.//file'):
 t=f.find('tag')
 if t is not None:out.setdefault(t.get('swac_text'),[]).append({'reading':t.get('swac_pron_phon'),'file':f.get('path')})
print(json.dumps(out,ensure_ascii=True))`;
const index = JSON.parse(execFileSync('python', ['-c', python], { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
const words = read('src/data/vocabulary/index.json').parts.flatMap(part => read(`src/data/vocabulary/${part}`));
const vocabulary = { records: words.length, attached: 0, sourceCompatible: 0, discrepancies: [], unsupportedSources: [], attachedExamples: 0 };
const key = reading => pinyinNumbered(reading.normalize('NFC').replace(/’/g, "'"));
const compact = reading => reading.normalize('NFC').toLowerCase().replace(/[\s'’]/g, '');
// Respect the importers' word-boundary convention first. Only one-character words
// additionally compare parsed single syllables (source sheí vs displayed shéi);
// do not infer syllable boundaries in joined compound pinyin for matching.
const sameReading = (left, right, word) => compact(left) === compact(right) ||
  (Array.from(word).length === 1 && parsePinyin(left) && parsePinyin(right) && JSON.stringify(parsePinyin(left)) === JSON.stringify(parsePinyin(right)));
for (const entry of words) {
  vocabulary.attachedExamples += (entry.examples ?? []).filter(example => example.audio?.url).length;
  if (!entry.audio?.url) continue;
  vocabulary.attached++;
  if (!entry.audio.source.includes('Shtooka')) { vocabulary.unsupportedSources.push(entry.id); continue; }
  const candidates = index[entry.simplified] ?? [];
  const displayed = entry.pinyinDisplay.split('/').map(value => value.trim());
  const covered = displayed.filter(reading => candidates.some(candidate => sameReading(candidate.reading, reading, entry.simplified)));
  if (covered.length === displayed.length) { vocabulary.sourceCompatible++; continue; }
  const expected = key(displayed[0]);
  const supplied = candidates[0] ? key(candidates[0].reading) : '';
  let category = 'syllable_difference';
  if (covered.length) category = 'partial_alternate_reading_coverage';
  else if (entry.simplified.startsWith('一') && /^yi[24]/.test(expected) && supplied === expected.replace(/^yi[24]/, 'yi1')) category = 'possible_citation_vs_sandhi';
  else if (expected.replace(/[1-5]/g, '') === supplied.replace(/[1-5]/g, '')) category = /5/.test(expected + supplied) ? 'neutral_tone_difference' : 'tone_difference';
  vocabulary.discrepancies.push({ id: entry.id, hskLevel: entry.hskLevel, hskIndex: entry.hsk_index, word: entry.simplified, displayed: entry.pinyinDisplay, sourceCandidates: candidates, coveredAlternates: covered, category, audio: entry.audio, listeningReviewed: false });
}

const manifests = { matchedRows: 0, excludedRows: 0, attachedExcludedRows: [], changedIdentities: [] };
const byId = new Map(words.map(entry => [entry.id, entry]));
for (const level of [2, 3, 4, 5]) {
  for (const row of read(`importer/data/hsk-audio/level${level}-manifest.json`).entries) {
    const entry = byId.get(row.entryId);
    if (!entry || entry.simplified !== row.headword || entry.pinyinDisplay !== row.reading) manifests.changedIdentities.push(row.entryId);
    if (row.status === 'matched') manifests.matchedRows++;
    else { manifests.excludedRows++; if (entry?.audio?.url) manifests.attachedExcludedRows.push(row.entryId); }
  }
}
const chart = read('src/data/pinyin/audio.json');
const chartLabelMismatches = [];
for (const [id, attachment] of Object.entries(chart.recordings)) {
  const filenameId = attachment.url.match(/pinyin-(.+)\.mp3$/)?.[1];
  if (!filenameId || JSON.stringify(parsePinyin(filenameId)) !== JSON.stringify(parsePinyin(id))) chartLabelMismatches.push(id);
}
const references = ['歨', '毌', '丷', '龹'].map(glyph => {
  const ref = componentFormReference(glyph);
  assert(ref);
  const own = store.catalog.components.find(row => row[0] === glyph);
  return { glyph, ownReading: own[1], relatedGlyph: ref.target.glyph, relatedReading: ref.target.reading,
    ownRecording: recordingCandidates(store.characterAudioRequest(glyph, own[1])).map(item => item.attachment.url),
    relatedRecording: recordingCandidates(store.characterAudioRequest(ref.target.glyph, ref.target.reading)).map(item => item.attachment.url) };
});
const report = { schemaVersion: 1, scope: 'Offline metadata and runtime-binding audit. No acoustic/listening review, transcription, CDN-byte verification or pronunciation corrections.', sourceHashes: hashes, glyphs, vocabulary, manifests, chart: { recordings: Object.keys(chart.recordings).length, labelMismatches: chartLabelMismatches }, references };
const categories = Object.fromEntries([...new Set(vocabulary.discrepancies.map(row => row.category))].map(category => [category, vocabulary.discrepancies.filter(row => row.category === category).length]));
const lines = [
  '# Pronunciation and recording metadata audit', '',
  'Generated by `node scripts/audit-pronunciation-recordings.mjs --write`; verify with `--check`. This audit changes no application data.', '',
  '**Scope:** recording labels, exact runtime bindings and the pinned Shtooka source pronunciation index. No clips were listened to, transcribed or acoustically verified; a source-index discrepancy does not establish that the attached recording actually says the source label.', '',
  `- Character-reading bindings: ${glyphs.bindings}; ${glyphs.nullBindings} null bindings; ${glyphs.labelMismatches.length} label mismatches; ${glyphs.missingAttachments.length} missing attachment IDs.`,
  `- The previously reported yán → mén catalogue clip remains blocked across all ${glyphs.quarantinedYanBindings} bindings; ${glyphs.quarantineStillPlayable.length} remain playable. This does not certify the separate Sound chart asset.`,
  `- Vocabulary recordings: ${vocabulary.attached}; ${vocabulary.sourceCompatible} cover all displayed alternatives in the source index; ${vocabulary.discrepancies.length} require review. Flagged HSK levels: ${[...new Set(vocabulary.discrepancies.map(row => row.hskLevel))].join(', ')}.`,
  `- Level 2–5 manifests: ${manifests.matchedRows} matched identities; ${manifests.excludedRows} excluded candidates; ${manifests.attachedExcludedRows.length} excluded candidates attached; ${manifests.changedIdentities.length} changed identities.`,
  `- Sound chart recording labels: ${Object.keys(chart.recordings).length}; ${chartLabelMismatches.length} key/filename conflicts. Labels do not prove spoken content.`,
  '- The four new form references keep their own and linked-record audio requests separate, including 龹 quǎn versus 卷 juǎn.', '',
  '## Source-metadata review candidates', '',
  '| HSK ID | Form | Displayed | Source index | Category |', '| --- | --- | --- | --- | --- |',
  ...vocabulary.discrepancies.map(row => `| ${row.hskIndex} | ${row.word} | ${row.displayed.replaceAll('|', '\\|')} | ${row.sourceCandidates.map(item => item.reading).join(' / ')} | ${row.category.replaceAll('_', ' ')} |`), '',
  'Prioritize 还, 只 and 歌 for listening: their source declarations differ in tone or syllable identity/count. The five neutral-tone cases need source/listening review. 一半/一下 may reflect citation versus sandhi notation; do not automatically change them. 谁’s source spelling `sheí` has the same syllable and second tone as `shéi`, but one clip does not cover the additional displayed `shuí` reading.', '',
  'These are review candidates, not verified spoken errors. Source metadata itself can be wrong. Preserve IDs, source readings and recordings until the actual clips have been checked. Browser TTS is outside this recording audit.', '',
  'Evidence: [pinned source guide](../importer/data/hsk-audio/README.md), [exact JSON results](pronunciation-recording-audit.json).', '',
];
for (const [name, value] of [['reports/pronunciation-recording-audit.json', `${JSON.stringify(report, null, 2)}\n`], ['reports/pronunciation-recording-audit.md', lines.join('\n')]]) {
  if (args[0] === '--write') writeFileSync(new URL(name, root), value);
  if (args[0] === '--check') assert.equal(readFileSync(new URL(name, root), 'utf8').replaceAll('\r\n', '\n'), value, `${name} is stale`);
}
console.log(JSON.stringify({ glyphBindings: glyphs.bindings, glyphLabelMismatches: glyphs.labelMismatches.length, vocabularyAttached: vocabulary.attached, vocabularySourceCompatible: vocabulary.sourceCompatible, reviewCandidates: categories, excludedManifestRowsAttached: manifests.attachedExcludedRows.length, chartLabelMismatches: chartLabelMismatches.length }, null, 2));
