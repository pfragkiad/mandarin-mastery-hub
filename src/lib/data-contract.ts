// Versioned mirror of the Mandarin Tutor API vocabulary contract (v1) plus an adapter to the UI's Word shape.
// Hosted preview uses the fixtures below; a local deployment can fetch the same shape from /api/vocabulary.
import type { AudioAttachment } from './audio';
import type { Word } from './mandarin';
import vocabularyJson from '@/data/vocabulary.json';

export type TextToken = { kind: 'hanzi' | 'punctuation' | 'space'; text: string; pinyin: string | null; reviewed: boolean };
export type SourceRef = { sourceName: string; sourceVersion: string; sourceId: string };
export type Example = {
  id: string; simplified: string; tokens: TextToken[]; english: string; notes?: string | null; audio?: AudioAttachment | null;
  pinyinDisplay?: string; source?: SourceRef; style?: 'conversational' | 'written'; register?: string;
  reviewStatus?: string; provenance?: string; linguisticSource?: string;
};
export type Category = { id: string; name: string; description?: string };
export type Entry = {
  id: string; sourceId: string | null; sourceName: string | null; sourceVersion: string | null; secondarySources?: SourceRef[];
  simplified: string; traditional: string | null; tokens: TextToken[]; pinyinDisplay: string; meanings: string[];
  entryKind: 'word' | 'phrase'; hskLevel: number | null; hskVersion: '3.0' | null; hsk_index: number | null; hskSource: SourceRef | null;
  categoryId: string | null; categoryIds?: string[]; partOfSpeech: string | null; partOfSpeechSource?: SourceRef; tags?: string[]; contentStatus: 'draft' | 'reviewed';
  audio: AudioAttachment | null; examples: Example[]; createdAt: string; updatedAt: string;
  /** Set only on phrases derived from a word's recorded example sentence (sentencePhraseEntries). */
  /** Optional recorded style for a standalone phrase ("conversational" | "written"); absent = Unclassified. */
  style?: 'conversational' | 'written';
  sentenceSource?: { exampleId: string; wordIds: string[]; style: 'conversational' | 'written' | null; notes: string | null };
  phraseMetadata?: { internalId: string; syllabusStatus: string; entryType: string; matchedVocabularyIds: number[]; reviewNotes: string | null; linguisticStatus?: string | null; outOfLevelDetail?: string | null; editorialCorrection?: string | null };
  studyMetadata?: {
    source: SourceRef; sourceSha256: string; taxonomyVersion: string;
    primaryTopicId: string; topicIds: string[]; primaryPosId: string; posIds: string[]; posLabels: string[];
    posNote: string | null; verificationStatus: string;
  };
};
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export const levelLabel = (e: Pick<Entry, 'hskLevel' | 'hskVersion'>) => (e.hskLevel && e.hskVersion ? `HSK ${e.hskVersion} · ${e.hskLevel}` : 'Unclassified');
export const posLabel = (pos: string | null) => pos?.trim() || 'Unspecified';

/** Display name without the database's sort prefix ("01 Numbers & quantities" → "Numbers & quantities"). */
export const categoryName = (name: string) => name.replace(/^\d+\s+/, '');

/** Imported vocabulary (exported from the Mandarin Tutor SQLite database in exact API shape). */
export const vocabularyData = vocabularyJson as unknown as { categories: Category[]; entries: Entry[] };

/** Full-width sentence punctuation becomes its standard (Latin) equivalent in pinyin text. */
const LATIN_PUNCTUATION: Record<string, string> = {
  '。': '.', '？': '?', '！': '!', '，': ',', '、': ',', '；': ';', '：': ':', '（': '(', '）': ')', '《': '«', '》': '»',
};

/** Prefer the source's whole sentence reading; legacy exports carry only tokens. */
export function examplePinyin(example: Example): string {
  return example.pinyinDisplay ?? example.tokens.map(tok => tok.pinyin ?? tok.text).join(' ')
    .replace(/\s+([,.!?;:%，。！？；：、])/g, '$1')
    .replace(/[。！？，、；：()]/g, c => LATIN_PUNCTUATION[c] ?? c);
}

/**
 * Display order for a record's example sentences: conversational style first, then the
 * rest in recorded order (stable). Presentation only — the recorded array is never
 * mutated, so provenance and IDs stay exactly as imported.
 */
export function orderExamples(examples: Example[]): Example[] {
  return examples.map((example, index) => ({ example, index }))
    .sort((a, b) => (a.example.style === 'conversational' ? 0 : 1) - (b.example.style === 'conversational' ? 0 : 1) || a.index - b.index)
    .map(({ example }) => example);
}

/**
 * Phrases derived from the recorded example sentences of every word (presentation only,
 * no new data file): each distinct sentence becomes one phrase record carrying the exact
 * recorded tokens, pinyin, translation, audio and style. It inherits the parent words'
 * HSK level and topics, but never an HSK syllabus index or source, because a sentence is
 * not a syllabus item. A sentence recorded under several words appears once, listing
 * every parent word's topics. IDs derive from the first example ID, so links stay stable.
 */
export function sentencePhraseEntries(entries: Entry[]): Entry[] {
  const bySentence = new Map<string, Entry>();
  for (const word of entries) {
    if (word.entryKind !== 'word') continue;
    for (const example of word.examples) {
      const topics = [word.categoryId, ...(word.categoryIds ?? [])].filter((id): id is string => Boolean(id));
      const existing = bySentence.get(example.simplified);
      if (existing) {
        existing.sentenceSource!.wordIds.push(word.id);
        existing.categoryIds = [...new Set([...(existing.categoryIds ?? []), ...topics])];
        if (existing.hskLevel !== word.hskLevel) existing.hskLevel = Math.max(existing.hskLevel ?? 0, word.hskLevel ?? 0) || null;
        continue;
      }
      bySentence.set(example.simplified, {
        id: `sentence-${example.id}`, sourceId: null, sourceName: example.source?.sourceName ?? word.sourceName, sourceVersion: example.source?.sourceVersion ?? word.sourceVersion,
        simplified: example.simplified, traditional: null, tokens: example.tokens, pinyinDisplay: examplePinyin(example), meanings: [example.english],
        entryKind: 'phrase', hskLevel: word.hskLevel, hskVersion: word.hskVersion, hsk_index: null, hskSource: null,
        categoryId: word.categoryId, categoryIds: [...new Set(topics)], partOfSpeech: null, contentStatus: 'draft',
        audio: example.audio ?? null, examples: [], createdAt: word.createdAt, updatedAt: word.updatedAt,
        sentenceSource: { exampleId: example.id, wordIds: [word.id], style: example.style ?? null, notes: example.notes ?? null },
      });
    }
  }
  return [...bySentence.values()];
}

export type PhraseStyle = 'Conversational' | 'Written' | 'Unclassified';
export const PHRASE_STYLES: PhraseStyle[] = ['Conversational', 'Written', 'Unclassified'];
/** Recorded sentence style of a phrase; syllabus phrases and unstyled sentences are Unclassified. */
export const phraseStyle = (e: Entry | undefined): PhraseStyle => {
  const recorded = e?.sentenceSource?.style ?? e?.style;
  return recorded === 'conversational' ? 'Conversational' : recorded === 'written' ? 'Written' : 'Unclassified';
};
/** Shared by the Phrases library and the Flashcards Phrases deck: '' / 'All styles' keeps every phrase. */
export const matchesPhraseStyle = (e: Entry | undefined, style: string | undefined): boolean =>
  !style || style === 'All styles' || phraseStyle(e) === style;

export function entryToWord(e: Entry, categories: Category[]): Word {
  const first = orderExamples(e.examples)[0];
  return {
    id: e.id, hanzi: e.simplified, pinyin: e.pinyinDisplay, meaning: e.meanings.join(' · '), type: posLabel(e.partOfSpeech),
    collection: categoryName(categories.find(c => c.id === e.categoryId)?.name ?? 'Uncategorized'), level: levelLabel(e),
    collections: [...new Set([e.categoryId, ...(e.categoryIds ?? [])].flatMap(id => {
      const category = categories.find(c => c.id === id);
      return category ? [categoryName(category.name)] : [];
    }))],
    hskId: e.hsk_index ?? null,
    sentence: first?.simplified ?? '', translation: first?.english ?? '',
    sentencePinyin: first ? examplePinyin(first) : '',
    audio: e.audio, entry: e,
  };
}

// Fixtures in exact API shape (dated local record, not a new source verification).
export const fixtureCategories: Category[] = [{ id: 'c0a1f3e2-0000-4000-8000-000000000001', name: 'Places & travel' }];
const t = (text: string, pinyin: string): TextToken => ({ kind: 'hanzi', text, pinyin, reviewed: true });
export const fixtureEntries: Entry[] = [{
  id: '5b1d3c2a-0000-4000-8000-000000000289', sourceId: '289', sourceName: 'CLEC HSK Examination Syllabus', sourceVersion: '2025-11; effective 2026-07',
  secondarySources: [{ sourceName: 'Workbook', sourceVersion: '1', sourceId: '280' }], simplified: '中国', traditional: '中國',
  tokens: [t('中', 'zhōng'), t('国', 'guó')], pinyinDisplay: 'zhōng guó', meanings: ['China'], entryKind: 'word', hskLevel: 1, hskVersion: '3.0', hsk_index: 289,
  hskSource: { sourceName: 'CLEC HSK Examination Syllabus', sourceVersion: '2025-11; effective 2026-07', sourceId: '289' },
  categoryId: fixtureCategories[0]!.id, partOfSpeech: null, contentStatus: 'reviewed', audio: null, examples: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}];
