#!/usr/bin/env node
/** Adapt the versioned HSK example-pairs handoff to the vocabulary API shape.
 * Shared boundary for the pinned Level 1–3 handoffs; the CLI defaults to Level 1.
 * Audits by default; --write replaces the selected level's study content.
 * Recorded UUIDs, syllabus identities and audio survive exact ID/headword matches.
 * Pinyin tokenization uses the same fail-closed alignment as sentence rendering.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';

const root = fileURLToPath(new URL('../', import.meta.url));
const jiti = createJiti(import.meta.url, { fsCache: false });
const { alignPhrasePinyin } = await jiti.import(resolve(root, 'src/lib/phrase-pinyin-align.ts'));
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const compactReading = value => value.normalize('NFC').toLowerCase().replace(/[\s'’]/g, '');
// Stable UUIDv5 namespace for new topics and sentences; never regenerate entry UUIDs.
function identity(value, level = 1) {
  const namespace = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex');
  const bytes = createHash('sha1').update(namespace).update(`mandarin-tutor:hsk3-level${level}:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const importLevel1 = options => importHskLevel({ ...options, level: 1 });

/** Preserve syllabus identities/kinds while replacing only the selected handoff's content.
 * Level 1 removes legacy unofficial phrases; Level 2 retains all 200 syllabus entries,
 * including its four explicitly classified phrases. Level 3 creates new syllabus records.
 */
export function importHskLevel({ sourcePath, topicsPath, vocabularyPath, level, inventoryPath = resolve(root, 'src/data/pinyin/inventory.json') }) {
  const versions = { 1: '1.6.1', 2: '1.0.3', 3: '1.0.4' };
  requireThat(Object.hasOwn(versions, level), 'Unsupported HSK level');
  const count = level === 1 ? 300 : level === 2 ? 200 : 500;
  const firstId = level === 1 ? 1 : level === 2 ? 301 : 501, lastId = firstId + count - 1;
  const source = read(sourcePath), topics = read(topicsPath), original = read(vocabularyPath);
  const data = structuredClone(original);
  const inventory = new Set(read(inventoryPath).syllables.map(s => s.base));
  requireThat(source.schema_version === 'hsk-example-pairs/1.2.0', 'Unsupported handoff schema');
  requireThat(source.data_version === versions[level] && source.syllabus.level === level && source.syllabus.edition === '2025-11', 'Unexpected dataset version or syllabus');
  requireThat(source.entries.length === count && source.syllabus.entry_count === count, `Expected ${count} entries`);
  requireThat(JSON.stringify(source.syllabus.id_range) === JSON.stringify([firstId, lastId]), 'Unexpected syllabus ID range');
  requireThat(new Set(source.entries.map(e => e.id)).size === count && source.entries.every(e => Number.isInteger(e.id) && e.id >= firstId && e.id <= lastId), `Expected unique IDs ${firstId}–${lastId}`);
  // Level 2's 过 and 花 each have two sourced entries. The ID/headword check below
  // preserves those separate records; the displayed form alone is not an identity.
  if (level === 1) requireThat(new Set(source.entries.map(e => e.headword)).size === count, 'Duplicate headwords');
  requireThat(JSON.stringify(topics) === JSON.stringify(source.taxonomy.topics), 'Topic sidecar differs from the embedded taxonomy');
  const topicMap = new Map(topics.map(t => [t.id, t]));
  const posMap = new Map(source.taxonomy.parts_of_speech.map(p => [p.id, p]));
  requireThat(topicMap.size === topics.length && posMap.size === source.taxonomy.parts_of_speech.length, 'Duplicate taxonomy IDs');
  const oldLevel = original.entries.filter(e => e.hskLevel === level);
  const oldEntries = level === 1 ? oldLevel.filter(e => e.entryKind === 'word') : oldLevel;
  const byId = new Map(oldEntries.map(e => [e.hsk_index, e]));
  requireThat(byId.size === oldEntries.length && (level === 3 ? oldEntries.length === 0 || oldEntries.length === count : oldEntries.length === count), `Existing Level ${level} identities must be complete and unique`);
  requireThat(original.entries.every(e => e.hskLevel === level || e.hsk_index == null || e.hsk_index < firstId || e.hsk_index > lastId), `Level ${level} syllabus IDs already belong to another level`);
  const sourceRef = id => ({ sourceName: basename(sourcePath), sourceVersion: source.data_version, sourceId: String(id) });
  const inputSha256 = hash(sourcePath);
  const importedAt = new Date().toISOString();
  const topicCategories = topics.map(t => ({ id: identity(`topic:${t.id}`), name: t.label, description: t.description }));
  const categoryMap = new Map(topics.map((t, i) => [t.id, topicCategories[i].id]));

  function tokens(text, pinyin, context) {
    // Hyphens in the supplied readings mark syllable boundaries, not syllable text.
    const paired = alignPhrasePinyin(text, pinyin.replace(/-/g, ' '), inventory);
    requireThat(paired, `Ambiguous or mismatched pinyin: ${context}`);
    const readings = paired.tokens.flatMap(t => t.pieces.filter(p => p.pair != null).map(p => p.text));
    return Array.from(text).map((ch, index) => {
      const hanzi = /\p{Script=Han}/u.test(ch), space = /\s/u.test(ch);
      const pair = paired.glyphPairs[index];
      requireThat(!hanzi || (pair != null && readings[pair]), `Missing character reading: ${context}`);
      requireThat(hanzi || space || /\p{P}/u.test(ch), `Unsupported token character: ${context}`);
      return { kind: hanzi ? 'hanzi' : space ? 'space' : 'punctuation', text: ch, pinyin: hanzi ? readings[pair] : null, reviewed: false };
    });
  }

  const entries = source.entries.map(e => {
    const old = byId.get(e.id) ?? (level === 3 && oldEntries.length === 0 ? {
      id: identity(`entry:${e.id}`, level),
      sourceId: String(e.id), sourceName: basename(sourcePath), sourceVersion: source.data_version,
      simplified: e.headword, traditional: null, entryKind: 'word', hskLevel: level,
      hskVersion: '3.0', hsk_index: e.id, hskSource: sourceRef(e.id),
      pinyinDisplay: e.pinyin, audio: null, examples: [], createdAt: importedAt, updatedAt: importedAt,
    } : undefined);
    requireThat(old?.simplified === e.headword, `ID/headword mismatch for ${e.id}; manual identity review required`);
    requireThat(e.meaning_en?.trim() && e.pinyin?.trim(), `Missing meaning or reading: ${e.id}`);
    for (const [key, primary, map] of [['topic_ids', 'primary_topic_id', topicMap], ['pos_ids', 'primary_pos_id', posMap]]) {
      requireThat(e[key]?.length && e[key].includes(e[primary]) && (key !== 'topic_ids' || e[key][0] === e[primary]) && new Set(e[key]).size === e[key].length && e[key].every(id => map.has(id)), `Invalid ${key}: ${e.id}`);
    }
    const readings = e.pinyin.split('/').map(p => p.trim());
    requireThat(readings.some(r => compactReading(r) === compactReading(old.pinyinDisplay.split('/')[0])), `Changed lexical reading for ${e.id}; existing audio needs review`);
    requireThat(e.examples.length === 2 && e.examples[0].style === 'conversational' && e.examples[1].style === 'written', `Expected two ordered example styles: ${e.id}`);
    const examples = e.examples.map(ex => {
      requireThat(ex.hanzi?.trim() && ex.english?.trim() && ex.pinyin?.trim(), `Incomplete example: ${e.id}/${ex.style}`);
      // Level 2 replaces legacy examples even when text matches. Only recordings already
      // attached to this handoff's exact sentence ID and reading survive a later import.
      const exampleId = identity(`example:${old.id}:${ex.style}:${ex.hanzi}`, level);
      const previous = old.examples.find(x => x.simplified === ex.hanzi && (level === 1 || (x.id === exampleId && x.pinyinDisplay === ex.pinyin)));
      return {
        id: previous?.id ?? exampleId,
        simplified: ex.hanzi, tokens: tokens(ex.hanzi, ex.pinyin, `${e.id}/${ex.style}`),
        pinyinDisplay: ex.pinyin, english: ex.english, notes: ex.note,
        audio: previous?.pinyinDisplay === ex.pinyin ? previous.audio ?? null : null,
        source: sourceRef(e.id), style: ex.style, register: ex.register,
        reviewStatus: ex.review_status, provenance: ex.provenance, linguisticSource: ex.linguistic_source,
      };
    });
    const result = {
      ...old, pinyinDisplay: e.pinyin, tokens: tokens(e.headword, readings[0], `${e.id}/headword`),
      meanings: e.meaning_en.split(';').map(s => s.trim()).filter(Boolean),
      categoryId: categoryMap.get(e.primary_topic_id), categoryIds: e.topic_ids.map(id => categoryMap.get(id)),
      partOfSpeech: e.pos_ids.map(id => posMap.get(id).label).join(' / '), partOfSpeechSource: sourceRef(e.id),
      secondarySources: [...new Map([...(old.secondarySources ?? []), ...(old.partOfSpeechSource ? [old.partOfSpeechSource] : []), sourceRef(e.id)].map(s => [`${s.sourceName}:${s.sourceVersion}:${s.sourceId}`, s])).values()],
      contentStatus: 'draft', examples,
      studyMetadata: {
        source: sourceRef(e.id), sourceSha256: inputSha256, taxonomyVersion: source.taxonomy.version,
        primaryTopicId: e.primary_topic_id, topicIds: e.topic_ids,
        primaryPosId: e.primary_pos_id, posIds: e.pos_ids, posLabels: e.pos_ids.map(id => posMap.get(id).label), posNote: e.pos_note ?? null,
        verificationStatus: source.verification.status,
        ...(e.syllabus_headword != null ? { syllabusHeadword: e.syllabus_headword } : {}),
        ...(e.syllabus_pos_zh != null ? { syllabusPosZh: e.syllabus_pos_zh } : {}),
      },
    };
    // Importing an unchanged handoff twice must not churn modification timestamps.
    const previous = { ...old }; delete previous.updatedAt;
    const next = { ...result }; delete next.updatedAt;
    if (JSON.stringify(previous) !== JSON.stringify(next)) result.updatedAt = importedAt;
    return result;
  });
  const imported = new Map(entries.map(e => [e.id, e]));
  data.entries = original.entries.filter(e => level !== 1 || e.hskLevel !== 1 || e.entryKind === 'word').map(e => imported.get(e.id) ?? e);
  if (level === 3 && oldEntries.length === 0) data.entries.push(...entries);
  const used = new Set(data.entries.flatMap(e => [e.categoryId, ...(e.categoryIds ?? [])]).filter(Boolean));
  // Topic IDs deliberately retain the Level 1 namespace: both levels share one taxonomy.
  // Drop only newly orphaned topics of this level; other-level rows stay exact.
  const previousCategories = new Set(oldLevel.flatMap(e => [e.categoryId, ...(e.categoryIds ?? [])]));
  data.categories = data.categories.filter(c => !categoryMapHas(c.id) && (!previousCategories.has(c.id) || used.has(c.id)));
  data.categories.push(...topicCategories);
  function categoryMapHas(id) { return topicCategories.some(c => c.id === id); }
  requireThat(new Set(data.entries.map(e => e.id)).size === data.entries.length, 'Duplicate output record IDs');
  const categories = new Set(data.categories.map(c => c.id));
  requireThat([...used].every(id => categories.has(id)), 'Dangling output categories');
  const report = {
    source: { path: relative(root, sourcePath).replaceAll('\\', '/'), sha256: inputSha256, dataVersion: source.data_version },
    topics: { path: relative(root, topicsPath).replaceAll('\\', '/'), sha256: hash(topicsPath), count: topics.length, matchesEmbeddedTaxonomy: true },
    beforeEntries: original.entries.length, afterEntries: data.entries.length,
    replacedWords: entries.filter(e => e.entryKind === 'word').length,
    ...(level === 1 ? { removedLevel1Phrases: oldLevel.filter(e => e.entryKind === 'phrase').length } : {
      replacedEntries: entries.length, replacedPhrases: entries.filter(e => e.entryKind === 'phrase').length,
      removedLegacyExamples: oldEntries.flatMap(e => e.examples).filter(ex => !entries.some(e => e.examples.some(next => next.id === ex.id))).length,
    }),
    preservedWordRecordings: entries.filter(e => e.audio).length,
    preservedExampleIds: entries.flatMap(e => e.examples).filter(ex => oldEntries.some(e => e.examples.some(old => old.id === ex.id))).length,
    examples: entries.flatMap(e => e.examples).length, alignedHeadwords: entries.length, alignedExamples: count * 2,
    primaryTopicCounts: Object.fromEntries(topics.map(t => [t.id, source.entries.filter(e => e.primary_topic_id === t.id).length])),
    secondaryTopicWords: source.entries.filter(e => e.topic_ids.length > 1).length,
    verification: source.verification,
  };
  return { data, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    requireThat(['--source', '--topics', '--vocabulary', '--output', '--report', '--write'].includes(key), `Unknown argument: ${key}`);
    if (key === '--write') options.write = true;
    else { requireThat(args[i + 1] && !args[i + 1].startsWith('--'), `Missing value: ${key}`); options[key.slice(2)] = args[++i]; }
  }
  const vocabularyPath = resolve(options.vocabulary ?? 'src/data/vocabulary.json');
  const { data, report } = importLevel1({
    sourcePath: resolve(options.source ?? 'importer/hsk/hsk3_level1_1.6.1.json'),
    topicsPath: resolve(options.topics ?? 'importer/hsk/hsk3_topics.json'), vocabularyPath,
  });
  if (options.write) writeFileSync(resolve(options.output ?? vocabularyPath), `${JSON.stringify(data, null, 4)}\n`);
  if (options.report) writeFileSync(resolve(options.report), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ mode: options.write ? 'written' : 'audit-only', ...report }, null, 2));
}
