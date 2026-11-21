import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { examplePinyin, vocabularyData } from './data-contract';
import { alignPhrasePinyin } from './phrase-pinyin-align';
import { partOfSpeechList, words } from './mandarin';
import { drawingWordPool } from './drawing-game';

const raw = readFileSync('importer/hsk/hsk3_level1_1.6.1.json', 'utf8');
const source = JSON.parse(raw) as { data_version: string; taxonomy: { topics: { id: string; label: string }[] }; entries: { id: number; headword: string; pinyin: string; meaning_en: string; primary_topic_id: string; topic_ids: string[]; examples: { hanzi: string; pinyin: string; english: string; style: string }[] }[] };
const inventory = new Set((JSON.parse(readFileSync('src/data/pinyin/inventory.json', 'utf8')) as { syllables: { base: string }[] }).syllables.map(s => s.base));
const level1 = vocabularyData.entries.filter(e => e.hskLevel === 1);

describe('Versioned Level 1 handoff', () => {
  it('retains every exact headword identity, source meaning, reading and checksum', () => {
    expect(level1).toHaveLength(300);
    for (const recorded of source.entries) {
      const entry = level1.find(e => e.hsk_index === recorded.id)!;
      expect(entry.simplified).toBe(recorded.headword);
      expect(entry.pinyinDisplay).toBe(recorded.pinyin);
      expect(entry.meanings).toEqual(recorded.meaning_en.split(';').map(s => s.trim()).filter(Boolean));
      expect(entry.studyMetadata?.sourceSha256).toBe(createHash('sha256').update(raw).digest('hex'));
      expect(entry.contentStatus).toBe('draft');
      expect(entry.studyMetadata?.verificationStatus).toBe('beginner_editorial_review_not_native_certified');
    }
  });
  it('keeps all 600 examples with source pinyin and unambiguously aligned character tokens', () => {
    const exampleIds = new Set<string>();
    for (const recorded of source.entries) {
      const entry = level1.find(e => e.hsk_index === recorded.id)!;
      expect(entry.examples).toHaveLength(2);
      for (const [index, example] of entry.examples.entries()) {
        const original = recorded.examples[index]!;
        expect(example.simplified).toBe(original.hanzi);
        expect(example.english).toBe(original.english);
        expect(examplePinyin(example)).toBe(original.pinyin);
        expect(example.style).toBe(original.style);
        expect(example.tokens.map(t => t.text).join('')).toBe(original.hanzi);
        const pairing = alignPhrasePinyin(original.hanzi, original.pinyin, inventory)!;
        expect(pairing).not.toBeNull();
        expect(example.tokens.filter(t => t.kind === 'hanzi').map(t => t.pinyin)).toEqual(pairing.tokens.flatMap(t => t.pieces.filter(p => p.pair != null).map(p => p.text)));
        expect(example.tokens.every(t => !t.reviewed && (t.kind === 'hanzi' ? Boolean(t.pinyin) : t.pinyin === null))).toBe(true);
        expect(example.audio).toBeNull();
        exampleIds.add(example.id);
      }
    }
    expect(exampleIds.size).toBe(600);
  });
  it('maps every primary and secondary topic to the updated labels', () => {
    const topics = new Map(source.taxonomy.topics.map(t => [t.id, t.label]));
    for (const recorded of source.entries) {
      const entry = level1.find(e => e.hsk_index === recorded.id)!;
      expect(entry.categoryId).toBe(entry.categoryIds?.[0]);
      expect(entry.categoryIds?.map(id => vocabularyData.categories.find(c => c.id === id)?.name)).toEqual(recorded.topic_ids.map(id => topics.get(id)));
    }
  });
  it('uses secondary topics in the Drawing pool and retains source POS labels intact', () => {
    const love = words.find(w => w.hanzi === '爱')!;
    expect(drawingWordPool(words, { kind: 'Words', collection: 'Qualities, Feelings & Evaluation' }, false).some(card => card.word?.id === love.id)).toBe(true);
    const classifier = words.find(w => w.hanzi === '本')!;
    expect(partOfSpeechList(classifier)).toContain('Classifier / Measure Word');
    expect(partOfSpeechList(classifier)).not.toContain('Classifier');
  });
});
