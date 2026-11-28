import assert from 'node:assert/strict';
import test from 'node:test';
import { currentHskRuntimeEntry } from './hsk-runtime-references.mjs';

test('drops historical syllabus numbers without changing recordings, text or corpus IDs', () => {
  const current = { sourceName: 'hsk3_level6_1.0.1.json', sourceId: '3603', sourceVersion: '1.0.1' };
  const entry = { id: 'stable-uuid', hskVersion: '3.0', hsk_index: 3603,
    audio: { url: 'exact-recording' }, studyMetadata: { source: current, numberingRevision: { previousId: 3602 } },
    secondarySources: [{ sourceName: 'hsk3_level6_1.0.0.json', sourceId: '3602' }, current],
    examples: [
      { id: 'editorial', simplified: '完整的句子。', sourceReference: { handoff: 'hsk3_level5_1.0.5.json', entry_id: 2676, sha256: 'original' }, revision: { baseline_id: 3602, evidence: 'preserved offline' } },
      { id: 'corpus', sourceReference: { chinese: { id: 3602, url: 'https://tatoeba.org/en/sentences/show/3602' }, license: 'CC BY' } },
    ],
  };
  const before = structuredClone(entry), result = currentHskRuntimeEntry(entry);
  assert.deepEqual(entry, before, 'Cleaning must not mutate source evidence');
  assert.equal(result.id, entry.id);
  assert.deepEqual(result.audio, entry.audio);
  assert.equal(result.studyMetadata.numberingRevision, undefined);
  assert.deepEqual(result.secondarySources, [current]);
  assert.deepEqual(result.examples[0].sourceReference, { handoff: 'hsk3_level5_1.0.5.json', sha256: 'original' });
  assert.deepEqual(result.examples[0].revision, { evidence: 'preserved offline' });
  assert.equal(result.examples[0].simplified, entry.examples[0].simplified);
  assert.deepEqual(result.examples[1], entry.examples[1], 'Corpus IDs are not HSK serials');
  assert.deepEqual(currentHskRuntimeEntry(result), result, 'Cleanup must be idempotent');
});
