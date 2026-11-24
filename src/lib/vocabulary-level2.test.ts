import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { examplePinyin, vocabularyData } from './data-contract';
import { alignPhrasePinyin } from './phrase-pinyin-align';
import { partOfSpeechList, vocabularyFacetOptions, vocabularyKind, wordCollections, words } from './mandarin';

const raw = readFileSync('importer/hsk/hsk3_level2_1.1.1.json', 'utf8');
const source = JSON.parse(raw) as {
  data_version: string; taxonomy: { topics: { id: string; label: string }[]; parts_of_speech: { id: string; label: string }[] };
  entries: { id: number; headword: string; pinyin: string; meaning_en: string; topic_ids: string[]; pos_ids: string[]; syllabus_headword: string; syllabus_pos_zh: string;
    examples: { hanzi: string; pinyin: string; english: string; style: string; register: string; note: string; review_status: string }[] }[];
};
const inventory = new Set((JSON.parse(readFileSync('src/data/pinyin/inventory.json', 'utf8')) as { syllables: { base: string }[] }).syllables.map(s => s.base));
const level2 = vocabularyData.entries.filter(e => e.hskLevel === 2);

describe('Versioned Level 2 replacement', () => {
  it('retains every exact syllabus identity and imports supplied meanings, readings, topics and POS', () => {
    expect(level2).toHaveLength(200);
    const topics = new Map(source.taxonomy.topics.map(t => [t.id, t.label]));
    const pos = new Map(source.taxonomy.parts_of_speech.map(p => [p.id, p.label]));
    for (const recorded of source.entries) {
      const entry = level2.find(e => e.hsk_index === recorded.id)!;
      expect(entry.simplified).toBe(recorded.headword);
      expect(entry.hskSource?.sourceId).toBe(String(recorded.id));
      expect(entry.pinyinDisplay).toBe(recorded.pinyin);
      expect(entry.meanings).toEqual(recorded.meaning_en.split(';').map(s => s.trim()).filter(Boolean));
      expect(entry.studyMetadata?.sourceSha256).toBe(createHash('sha256').update(raw).digest('hex'));
      expect(entry.studyMetadata?.verificationStatus).toBe('editorial_examples_not_native_certified');
      expect(entry.studyMetadata?.syllabusHeadword).toBe(recorded.syllabus_headword);
      expect(entry.studyMetadata?.syllabusPosZh).toBe(recorded.syllabus_pos_zh);
      expect(entry.contentStatus).toBe('draft');
      expect(entry.categoryId).toBe(entry.categoryIds?.[0]);
      expect(entry.categoryIds?.map(id => vocabularyData.categories.find(c => c.id === id)?.name)).toEqual(recorded.topic_ids.map(id => topics.get(id)));
      expect(partOfSpeechList(words.find(w => w.id === entry.id)!)).toEqual(recorded.pos_ids.map(id => pos.get(id)));
      expect(entry.secondarySources?.some(s => s.sourceName === 'HSK3_Level2_200_Official_IDs_POS_Examples_Classified.xlsx')).toBe(true);
    }
  });

  it('uses only the 400 supplied examples with original whole readings and aligned, unreviewed tokens', () => {
    const ids = new Set<string>();
    for (const recorded of source.entries) {
      const entry = level2.find(e => e.hsk_index === recorded.id)!;
      expect(entry.examples).toHaveLength(2);
      for (const [index, example] of entry.examples.entries()) {
        const supplied = recorded.examples[index]!;
        expect(example.simplified).toBe(supplied.hanzi);
        expect(examplePinyin(example)).toBe(supplied.pinyin);
        expect(example.english).toBe(supplied.english);
        expect(example.style).toBe(supplied.style);
        expect(example.register).toBe(supplied.register);
        expect(example.notes).toBe(supplied.note);
        expect(example.reviewStatus).toBe(supplied.review_status);
        expect(example.source).toEqual({ sourceName: 'hsk3_level2_1.1.1.json', sourceVersion: '1.1.1', sourceId: String(recorded.id) });
        expect(example.tokens.map(t => t.text).join('')).toBe(supplied.hanzi);
        const pairing = alignPhrasePinyin(supplied.hanzi, supplied.pinyin, inventory)!;
        expect(pairing).not.toBeNull();
        expect(example.tokens.filter(t => t.kind === 'hanzi').map(t => t.pinyin)).toEqual(pairing.tokens.flatMap(t => t.pieces.filter(p => p.pair != null).map(p => p.text)));
        expect(example.tokens.every(t => !t.reviewed && (t.kind === 'hanzi' ? Boolean(t.pinyin) : t.pinyin === null))).toBe(true);
        expect(example.audio).toBeNull();
        ids.add(example.id);
      }
    }
    expect(ids.size).toBe(400);
  });

  it('offers both recorded styles in the Level 2 phrase filters and shares topic destinations', () => {
    const phrases = words.filter(w => vocabularyKind(w) === 'phrase');
    expect(vocabularyFacetOptions(phrases, { collection: 'All collections', level: 'HSK 3.0 · 2', pos: 'All types' }).styles).toEqual(['Conversational', 'Written', 'Unclassified']);
    const interests = words.find(w => w.entry?.hsk_index === 302 && !w.entry?.sentenceSource)!;
    expect(wordCollections(interests)).toEqual(source.entries.find(e => e.id === 302)!.topic_ids.map(id => source.taxonomy.topics.find(t => t.id === id)!.label));
  });

  it('keeps homographic syllabus entries distinct instead of merging their readings or senses', () => {
    for (const [hanzi, indexes] of [['过', [347, 351]], ['花', [357, 358]]] as const) {
      const entries = level2.filter(e => e.simplified === hanzi);
      expect(entries.map(e => e.hsk_index)).toEqual(indexes);
      expect(new Set(entries.map(e => e.id)).size).toBe(2);
      expect(new Set(entries.flatMap(e => e.examples.map(ex => ex.id))).size).toBe(4);
    }
  });
});
