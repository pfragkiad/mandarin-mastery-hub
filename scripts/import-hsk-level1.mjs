#!/usr/bin/env node
/** Adapt the versioned HSK example-pairs handoff to the vocabulary API shape.
 * Shared boundary for the pinned Level 1–6 handoffs; the CLI defaults to Level 1.
 * Audits by default; --write replaces the selected level's study content.
 * Recorded UUIDs, syllabus identities and audio survive exact ID/headword matches.
 * Pinyin tokenization uses the same fail-closed alignment as sentence rendering.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { readVocabulary, VOCABULARY_DIRECTORY, writeVocabulary } from './vocabulary-store.mjs';
import { currentHskRuntimeEntry } from './hsk-runtime-references.mjs';
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
// Owner-approved spacing corrections (2026-11-22) already present in vocabulary.
// Bind each to exact text and source reading so later revisions remain sourced.
const spacingCorrections = {
  '1:36:conversational': ['我在电脑上学习。', 'wǒ zài diànnǎo shàngxué xí.', 'wǒ zài diànnǎo shàng xuéxí.'],
  '3:873:written': ['学生在网站上学习汉语。', 'xuéshēng zài wǎngzhàn shàngxué xí Hànyǔ.', 'xuéshēng zài wǎngzhàn shàng xuéxí Hànyǔ.'],
};
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
 * including its four explicitly classified phrases. Levels 3 and 4 create syllabus records.
 */
export function importHskLevel({ sourcePath, topicsPath, vocabularyPath, level, includeExamples = true, inventoryPath = resolve(root, 'src/data/pinyin/inventory.json') }) {
  const versions = { 1: '1.7.2', 2: '1.1.3', 3: '1.1.4', 4: '1.1.3', 5: '1.0.7', 6: '1.0.1' };
  requireThat(Object.hasOwn(versions, level), 'Unsupported HSK level');
  const count = { 1: 300, 2: 200, 3: 500, 4: 1000, 5: 1600, 6: 1800 }[level];
  const firstId = { 1: 1, 2: 301, 3: 501, 4: 1001, 5: 2001, 6: 3601 }[level], lastId = firstId + count - 1;
  const source = read(sourcePath), taxonomy = read(topicsPath), original = readVocabulary(vocabularyPath);
  const { topics, subtopics } = taxonomy;
  const data = structuredClone(original);
  const inventory = new Set(read(inventoryPath).syllables.map(s => s.base));
  const syllabicNg = source.entries.some(e => e.headword === '嗯' && e.pinyin?.normalize('NFC').toLowerCase() === 'ǹg');
  if (syllabicNg) inventory.add('ng');
  requireThat(source.schema_version === 'hsk-example-pairs/1.3.0', 'Unsupported handoff schema');
  requireThat(source.data_version === versions[level] && source.syllabus.level === level && source.syllabus.edition === '2025-11', 'Unexpected dataset version or syllabus');
  requireThat(source.entries.length === count && source.syllabus.entry_count === count, `Expected ${count} entries`);
  requireThat(JSON.stringify(source.syllabus.id_range) === JSON.stringify([firstId, lastId]), 'Unexpected syllabus ID range');
  requireThat(new Set(source.entries.map(e => e.id)).size === count && source.entries.every(e => Number.isInteger(e.id) && e.id >= firstId && e.id <= lastId), `Expected unique IDs ${firstId}–${lastId}`);
  // Level 2's 过 and 花 each have two sourced entries. The ID/headword check below
  // preserves those separate records; the displayed form alone is not an identity.
  if (level === 1) requireThat(new Set(source.entries.map(e => e.headword)).size === count, 'Duplicate headwords');
  requireThat(taxonomy.schema_version === 'hsk-topics/2.0.0' && taxonomy.version === '2.0.0' &&
    taxonomy.version === source.taxonomy.version && Array.isArray(topics) && Array.isArray(subtopics), 'Unsupported topic taxonomy');
  requireThat(JSON.stringify(topics) === JSON.stringify(source.taxonomy.topics) &&
    JSON.stringify(subtopics) === JSON.stringify(source.taxonomy.subtopics), 'Topic sidecar differs from the embedded taxonomy');
  const topicMap = new Map(topics.map(t => [t.id, t]));
  const subtopicMap = new Map(subtopics.map(t => [t.id, t]));
  const posMap = new Map(source.taxonomy.parts_of_speech.map(p => [p.id, p]));
  requireThat(topicMap.size === topics.length && subtopicMap.size === subtopics.length &&
    posMap.size === source.taxonomy.parts_of_speech.length, 'Duplicate taxonomy IDs');
  requireThat(subtopics.every(t => topicMap.has(t.parent_topic_id)), 'Unknown subtopic parent');
  const oldLevel = original.entries.filter(e => e.hskLevel === level);
  const oldEntries = level === 1 ? oldLevel.filter(e => e.entryKind === 'word') : oldLevel;
  const inputSha256 = hash(sourcePath);
  const renumbered = Boolean(source.verification.numbering_revision);
  const byLegacyId = new Map(source.entries.map(e => [e.legacy_syllabus_id, e]));
  const currentNumberingSource = old => old.studyMetadata?.sourceSha256 === inputSha256 ||
    (source.verification.runtime_compatible_handoffs ?? []).some(binding => binding.numbering === 'official-site-1219' &&
      binding.sha256 === old.studyMetadata?.sourceSha256 && binding.file === old.studyMetadata?.source.sourceName);
  // Swapped serials must never match another word's UUID/audio. Accept only the
  // exact old handoff checksum or this current handoff before choosing an ID map.
  const mappedId = old => {
    if (!renumbered || currentNumberingSource(old)) return old.hsk_index;
    requireThat(old.studyMetadata?.sourceSha256 === source.verification.numbering_revision.baseline.sha256,
      `Unknown Level ${level} numbering source; manual identity review required`);
    const target = byLegacyId.get(old.hsk_index);
    requireThat(target?.headword === old.simplified && target.pinyin === old.pinyinDisplay &&
      (old.studyMetadata.syllabusHeadword == null || (target.legacy_syllabus_headword ?? target.syllabus_headword) === old.studyMetadata.syllabusHeadword) &&
      (old.studyMetadata.syllabusPosZh == null || (target.legacy_syllabus_pos_zh ?? target.syllabus_pos_zh) === old.studyMetadata.syllabusPosZh),
      `ID/headword mismatch for legacy ${old.hsk_index}; manual identity review required`);
    return target.id;
  };
  const byId = new Map(oldEntries.map(e => [mappedId(e), e]));
  requireThat(byId.size === oldEntries.length && (level >= 3 ? oldEntries.length === 0 || oldEntries.length === count : oldEntries.length === count), `Existing Level ${level} identities must be complete and unique`);
  requireThat(original.entries.every(e => e.hskLevel === level || e.hsk_index == null || e.hsk_index < firstId || e.hsk_index > lastId), `Level ${level} syllabus IDs already belong to another level`);
  const sourceRef = id => ({ sourceName: basename(sourcePath), sourceVersion: source.data_version, sourceId: String(id) });
  const importedAt = new Date().toISOString();
  const exampleNormalizations = [];
  const topicCategories = topics.map(t => ({ id: identity(`topic:${t.id}`), name: t.label, description: t.description }));
  const categoryMap = new Map(topics.map((t, i) => [t.id, topicCategories[i].id]));
  // Sentence alternatives are accepted only when the same exact two readings are
  // already recorded for one unambiguous single-character vocabulary identity.
  const readingAlternatives = new Map();
  for (const entry of [...original.entries.map(e => ({ glyph: e.simplified, reading: e.pinyinDisplay })),
    ...source.entries.map(e => ({ glyph: e.headword, reading: e.pinyin }))]) {
    const choices = entry.reading?.split('/').map(compactReading);
    if (Array.from(entry.glyph).length !== 1 || !/\p{Script=Han}/u.test(entry.glyph) || choices?.length !== 2) continue;
    const key = choices.join('/');
    const glyphs = readingAlternatives.get(key) ?? new Set();
    glyphs.add(entry.glyph); readingAlternatives.set(key, glyphs);
  }

  function tokens(text, pinyin, context) {
    // The handoff's standalone erhua r joins its preceding syllable for alignment only.
    const alignmentPinyin = pinyin.replace(/-/g, ' ').replace(/(\p{L})\s+r(?=[\s\p{P}]|$)/gu, '$1r');
    // A slash recorded in the Chinese sentence separates literal words (复制/粘贴),
    // rather than offering alternative readings of a single character.
    const literalSlashes = (text.match(/\//g) ?? []).length;
    if (literalSlashes) requireThat(literalSlashes === (alignmentPinyin.match(/\//g) ?? []).length, `Mismatched literal slashes: ${context}`);
    const alternativesPattern = /(?<![\p{L}\p{M}])([\p{L}\p{M}]+)\s*\/\s*([\p{L}\p{M}]+)(?![\p{L}\p{M}])/gu;
    const alternatives = (literalSlashes ? [] : [...alignmentPinyin.matchAll(alternativesPattern)]).map(match => {
      const glyphs = readingAlternatives.get(`${compactReading(match[1])}/${compactReading(match[2])}`);
      requireThat(glyphs?.size === 1, `Unrecorded or ambiguous reading alternatives: ${context}`);
      return [...glyphs][0];
    });
    const chooseReadings = (selected = -1) => {
      if (literalSlashes) return alignmentPinyin;
      let index = 0;
      return alignmentPinyin.replace(alternativesPattern, (_raw, first, second) => index++ === selected ? second : first);
    };
    const paired = alignPhrasePinyin(text, chooseReadings(), inventory);
    requireThat(paired, `Ambiguous or mismatched pinyin: ${context}`);
    const readings = paired.tokens.flatMap(t => t.pieces.filter(p => p.pair != null).map(p => p.text));
    const hanGlyphs = Array.from(text).filter(ch => /\p{Script=Han}/u.test(ch));
    for (const [index, glyph] of alternatives.entries()) {
      const alternate = alignPhrasePinyin(text, chooseReadings(index), inventory);
      requireThat(alternate, `Ambiguous or mismatched alternative pinyin: ${context}`);
      const other = alternate.tokens.flatMap(t => t.pieces.filter(p => p.pair != null).map(p => p.text));
      const changed = readings.flatMap((reading, pair) => compactReading(reading) !== compactReading(other[pair]) ? [pair] : []);
      requireThat(changed.length === 1 && hanGlyphs[changed[0]] === glyph, `Reading alternatives do not match their recorded glyph: ${context}`);
    }
    return Array.from(text).map((ch, index) => {
      const hanzi = /\p{Script=Han}/u.test(ch), space = /\s/u.test(ch);
      const pair = paired.glyphPairs[index];
      requireThat(!hanzi || (pair != null && readings[pair]), `Missing character reading: ${context}`);
      const reading = hanzi ? readings[pair]?.normalize('NFC').toLowerCase() : null;
      if (reading?.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '') === 'ng') requireThat(syllabicNg && ch === '嗯' && reading === 'ǹg', `Unsupported syllabic nasal: ${context}`);
      requireThat(hanzi || space || /\p{P}/u.test(ch), `Unsupported token character: ${context}`);
      return { kind: hanzi ? 'hanzi' : space ? 'space' : 'punctuation', text: ch, pinyin: hanzi ? readings[pair] : null, reviewed: false };
    });
  }

  const entries = source.entries.map(e => {
    const old = byId.get(e.id) ?? (level >= 3 && oldEntries.length === 0 ? {
      id: identity(`entry:${e.legacy_syllabus_id ?? e.id}`, level),
      sourceId: String(e.id), sourceName: basename(sourcePath), sourceVersion: source.data_version,
      simplified: e.headword, traditional: null, entryKind: 'word', hskLevel: level,
      hskVersion: '3.0', hsk_index: e.id, hskSource: sourceRef(e.id),
      pinyinDisplay: e.pinyin, audio: null, examples: [], createdAt: importedAt, updatedAt: importedAt,
    } : undefined);
    requireThat(old?.simplified === e.headword, `ID/headword mismatch for ${e.id}; manual identity review required`);
    if (renumbered && old.studyMetadata) {
      const currentNumbering = currentNumberingSource(old);
      const expectedHeadword = currentNumbering ? e.syllabus_headword : (e.legacy_syllabus_headword ?? e.syllabus_headword);
      const expectedPos = currentNumbering ? e.syllabus_pos_zh : (e.legacy_syllabus_pos_zh ?? e.syllabus_pos_zh);
      requireThat((old.studyMetadata.syllabusHeadword == null || old.studyMetadata.syllabusHeadword === expectedHeadword) &&
        (old.studyMetadata.syllabusPosZh == null || old.studyMetadata.syllabusPosZh === expectedPos),
      `ID/headword mismatch for ${e.id}; source identity differs`);
    }
    requireThat(e.meaning_en?.trim() && e.pinyin?.trim(), `Missing meaning or reading: ${e.id}`);
    for (const [key, primary, map] of [['topic_ids', 'primary_topic_id', topicMap], ['pos_ids', 'primary_pos_id', posMap]]) {
      requireThat(e[key]?.length && e[key].includes(e[primary]) && (key !== 'topic_ids' || e[key][0] === e[primary]) && new Set(e[key]).size === e[key].length && e[key].every(id => map.has(id)), `Invalid ${key}: ${e.id}`);
    }
    // Subtopics retain their exact source IDs; they do not become top-level collections.
    requireThat(Array.isArray(e.subtopic_ids) && new Set(e.subtopic_ids).size === e.subtopic_ids.length &&
      e.subtopic_ids.every(id => subtopicMap.has(id) && e.topic_ids.includes(subtopicMap.get(id).parent_topic_id)), `Invalid subtopic_ids: ${e.id}`);
    requireThat(e.primary_subtopic_id === null || (e.subtopic_ids[0] === e.primary_subtopic_id &&
      subtopicMap.get(e.primary_subtopic_id)?.parent_topic_id === e.primary_topic_id), `Invalid primary_subtopic_id: ${e.id}`);
    const readings = e.pinyin.split('/').map(p => p.trim());
    requireThat(readings.some(r => compactReading(r) === compactReading(old.pinyinDisplay.split('/')[0])), `Changed lexical reading for ${e.id}; existing audio needs review`);
    if (includeExamples) requireThat(e.examples.length === 2 && e.examples[0].style === 'conversational' && e.examples[1].style === 'written', `Expected two ordered example styles: ${e.id}`);
    // Explicit terms-only imports preserve existing examples; current handoffs import examples by default.
    const examples = includeExamples ? e.examples.map(recordedExample => {
      // One legacy corpus sentence has an invisible leading soft hyphen in both
      // fields. Bind this import-only normalization to its exact source identity/text.
      const normalizeSoftHyphen = level === 6 && (e.legacy_syllabus_id ?? e.id) === 4491 && recordedExample.style === 'written' &&
        recordedExample.hanzi === '\u00ad很多人学日语是为了看漫画。' &&
        recordedExample.pinyin === '\u00ad hěn duō rén xué rìyǔ shì wèile kàn mànhuà.';
      const ex = normalizeSoftHyphen ? { ...recordedExample, hanzi: recordedExample.hanzi.slice(1), pinyin: recordedExample.pinyin.slice(2) } : recordedExample;
      if (normalizeSoftHyphen) exampleNormalizations.push({ entryId: e.id, style: ex.style,
        fields: ['hanzi', 'pinyin'], change: 'Removed leading U+00AD soft hyphen; source bytes preserved.' });
      requireThat(ex.hanzi?.trim() && ex.english?.trim() && ex.pinyin?.trim(), `Incomplete example: ${e.id}/${ex.style}`);
      const correction = spacingCorrections[`${level}:${e.legacy_syllabus_id ?? e.id}:${ex.style}`];
      const pinyin = correction && ex.hanzi === correction[0] && ex.pinyin === correction[1] ? correction[2] : ex.pinyin;
      // Level 2 replaces legacy examples even when text matches. Only recordings already
      // attached to this handoff's exact sentence ID and reading survive a later import.
      const exampleId = identity(`example:${old.id}:${ex.style}:${ex.hanzi}`, level);
      const previous = old.examples.find(x => x.simplified === ex.hanzi && (level === 1 || (x.id === exampleId && x.pinyinDisplay === pinyin)));
      return {
        id: previous?.id ?? exampleId,
        simplified: ex.hanzi, tokens: tokens(ex.hanzi, pinyin, `${e.id}/${ex.style}`),
        pinyinDisplay: pinyin, english: ex.english, notes: ex.note,
        audio: previous?.pinyinDisplay === pinyin ? previous.audio ?? null : null,
        source: sourceRef(e.id), style: ex.style, register: ex.register,
        reviewStatus: ex.review_status, provenance: ex.provenance, linguisticSource: ex.linguistic_source,
        ...(ex.source_reference ? { sourceReference: ex.source_reference } : {}),
        ...(ex.revision ? { revision: ex.revision } : {}),
        ...(normalizeSoftHyphen ? { importNormalization: 'Removed leading U+00AD from Chinese and pinyin; source handoff unchanged.' } : {}),
      };
    }) : old.examples;
    const result = currentHskRuntimeEntry({
      ...old, pinyinDisplay: e.pinyin, tokens: tokens(e.headword, readings[0], `${e.id}/headword`),
      ...(renumbered ? { hsk_index: e.id, hskSource: sourceRef(e.id), sourceId: String(e.id),
        sourceName: basename(sourcePath), sourceVersion: source.data_version } : {}),
      meanings: e.meaning_en.split(';').map(s => s.trim()).filter(Boolean),
      categoryId: categoryMap.get(e.primary_topic_id), categoryIds: e.topic_ids.map(id => categoryMap.get(id)),
      partOfSpeech: e.pos_ids.map(id => posMap.get(id).label).join(' / '), partOfSpeechSource: sourceRef(e.id),
      secondarySources: [...new Map([...(old.secondarySources ?? []), ...(old.partOfSpeechSource ? [old.partOfSpeechSource] : []), sourceRef(e.id)].map(s => [`${s.sourceName}:${s.sourceVersion}:${s.sourceId}`, s])).values()],
      contentStatus: 'draft', examples,
      studyMetadata: {
        source: sourceRef(e.id), sourceSha256: inputSha256, taxonomyVersion: source.taxonomy.version,
        primaryTopicId: e.primary_topic_id, topicIds: e.topic_ids,
        primarySubtopicId: e.primary_subtopic_id, subtopicIds: e.subtopic_ids,
        primaryPosId: e.primary_pos_id, posIds: e.pos_ids, posLabels: e.pos_ids.map(id => posMap.get(id).label), posNote: e.pos_note ?? null,
        verificationStatus: source.verification.status,
        ...(!includeExamples ? { exampleImportPolicy: 'terms_only_preserve_existing' } : {}),
        ...(e.syllabus_headword != null ? { syllabusHeadword: e.syllabus_headword } : {}),
        ...(e.syllabus_pos_zh != null ? { syllabusPosZh: e.syllabus_pos_zh } : {}),
        ...(e.syllabus_pinyin != null ? { syllabusPinyin: e.syllabus_pinyin } : {}),
        ...(e.pronunciation_note ? { pronunciationNote: e.pronunciation_note } : {}),
        ...(e.meaning_source ? { meaningSource: e.meaning_source } : {}),
        ...(e.classification_status ? { classificationStatus: e.classification_status } : {}),
      },
    });
    // Importing an unchanged handoff twice must not churn modification timestamps.
    const previous = { ...old }; delete previous.updatedAt;
    const next = { ...result }; delete next.updatedAt;
    if (JSON.stringify(previous) !== JSON.stringify(next)) result.updatedAt = importedAt;
    return result;
  });
  const imported = new Map(entries.map(e => [e.id, e]));
  data.entries = original.entries.filter(e => level !== 1 || e.hskLevel !== 1 || e.entryKind === 'word').map(e => imported.get(e.id) ?? e);
  if (level >= 3 && oldEntries.length === 0) data.entries.push(...entries);
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
    topics: { path: relative(root, topicsPath).replaceAll('\\', '/'), sha256: hash(topicsPath), version: taxonomy.version,
      count: topics.length, subtopicCount: subtopics.length, matchesEmbeddedTaxonomy: true },
    beforeEntries: original.entries.length, afterEntries: data.entries.length,
    replacedWords: entries.filter(e => e.entryKind === 'word').length,
    ...(level === 1 ? { removedLevel1Phrases: oldLevel.filter(e => e.entryKind === 'phrase').length } : {
      replacedEntries: entries.length, replacedPhrases: entries.filter(e => e.entryKind === 'phrase').length,
      removedLegacyExamples: oldEntries.flatMap(e => e.examples).filter(ex => !entries.some(e => e.examples.some(next => next.id === ex.id))).length,
    }),
    preservedWordRecordings: entries.filter(e => e.audio).length,
    preservedExampleIds: entries.flatMap(e => e.examples).filter(ex => oldEntries.some(e => e.examples.some(old => old.id === ex.id))).length,
    examples: entries.flatMap(e => e.examples).length, alignedHeadwords: entries.length, alignedExamples: includeExamples ? count * 2 : 0,
    ...(!includeExamples ? { withheldDraftExamples: source.entries.reduce((sum, e) => sum + (e.examples?.length ?? 0), 0) } : {}),
    primaryTopicCounts: Object.fromEntries(topics.map(t => [t.id, source.entries.filter(e => e.primary_topic_id === t.id).length])),
    assignedPrimarySubtopics: source.entries.filter(e => e.primary_subtopic_id !== null).length,
    secondaryTopicWords: source.entries.filter(e => e.topic_ids.length > 1).length,
    verification: source.verification,
    ...(level === 6 ? { exampleNormalizations } : {}),
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
  const vocabularyPath = resolve(options.vocabulary ?? VOCABULARY_DIRECTORY);
  const { data, report } = importLevel1({
    sourcePath: resolve(options.source ?? 'importer/hsk/hsk3_level1_1.7.2.json'),
    topicsPath: resolve(options.topics ?? 'importer/hsk/hsk3_topics.json'), vocabularyPath,
  });
  if (options.write) writeVocabulary(resolve(options.output ?? vocabularyPath), data);
  if (options.report) writeFileSync(resolve(options.report), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ mode: options.write ? 'written' : 'audit-only', ...report }, null, 2));
}
