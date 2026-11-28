// Versioned mirror of the Mandarin Tutor API vocabulary contract (v1) plus an adapter to the UI's Word shape.
// Hosted preview uses the fixtures below; a local deployment can fetch the same shape from /api/vocabulary.
import type { AudioAttachment } from './audio';
import type { Word } from './mandarin';
import vocabularyIndex from '@/data/vocabulary/index.json';

export type TextToken = { kind: 'hanzi' | 'punctuation' | 'space'; text: string; pinyin: string | null; reviewed: boolean };
export type SourceRef = { sourceName: string; sourceVersion: string; sourceId: string };
export type Example = {
  id: string; simplified: string; tokens: TextToken[]; english: string; notes?: string | null; audio?: AudioAttachment | null;
  pinyinDisplay?: string; source?: SourceRef; style?: 'conversational' | 'written'; register?: string;
  reviewStatus?: string; provenance?: string; linguisticSource?: string;
  /** Exact handoff evidence for corpus credits and editorial revision history. */
  sourceReference?: Record<string, unknown>; revision?: Record<string, unknown>; importNormalization?: string;
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
  sentenceSource?: { exampleId: string; wordIds: string[]; style: 'conversational' | 'written' | null; notes: string | null; hskFromWord: string | null; hskFromWordId: string | null; subtopicIds?: string[] };
  phraseMetadata?: { internalId: string; syllabusStatus: string; entryType: string; matchedVocabularyIds: number[]; reviewNotes: string | null; linguisticStatus?: string | null; outOfLevelDetail?: string | null; editorialCorrection?: string | null };
  studyMetadata?: {
    source: SourceRef; sourceSha256: string; taxonomyVersion: string;
    primaryTopicId: string; topicIds: string[]; primaryPosId: string; posIds: string[]; posLabels: string[];
    primarySubtopicId?: string | null; subtopicIds?: string[];
    exampleImportPolicy?: 'terms_only_preserve_existing';
    posNote: string | null; verificationStatus: string;
    syllabusHeadword?: string; syllabusPosZh?: string;
    meaningSource?: Record<string, unknown>; classificationStatus?: string;
  };
};
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Alternative translations of one record are joined with "; " everywhere (vocabulary words,
 *  glyph cards, Practice), matching the glyph sources' own sense separator. */
export const TRANSLATION_SEPARATOR = '; ';
export const levelLabel = (e: Pick<Entry, 'hskLevel' | 'hskVersion'>) => (e.hskLevel && e.hskVersion ? `HSK ${e.hskVersion} · ${e.hskLevel}` : 'Unclassified');
export const posLabel = (pos: string | null) => pos?.trim() || 'Unspecified';

/** Display name without the database's sort prefix ("01 Numbers & quantities" → "Numbers & quantities"). */
export const categoryName = (name: string) => name.replace(/^\d+\s+/, '');

/** Imported vocabulary (exported from the Mandarin Tutor SQLite database in exact API shape). */
const index: { categories: Category[]; parts: string[]; entryOrder?: string[] } = vocabularyIndex;
export const vocabularyData = { categories: index.categories, entries: joinVocabularyParts() };

/** The vocabulary is stored split by HSK level (src/data/vocabulary/level-N.json, written by
 *  scripts/vocabulary_store.py / vocabulary-store.mjs). The index records part order and,
 *  when levels are interleaved, exact entry order. Missing or invalid data fails loudly. */
function joinVocabularyParts(): Entry[] {
  const parts = import.meta.glob<Entry[]>('../data/vocabulary/*.json', { eager: true, import: 'default' });
  const entries = index.parts.flatMap(name => {
    const part = parts[`../data/vocabulary/${name}`];
    if (!part) throw new Error(`Vocabulary part missing: ${name}`);
    return part;
  });
  return orderVocabularyEntries(entries, index.entryOrder);
}

export function orderVocabularyEntries(entries: Entry[], order?: string[]): Entry[] {
  if (!order) return entries;
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  if (byId.size !== entries.length || order.length !== entries.length ||
      new Set(order).size !== entries.length || order.some(id => !byId.has(id))) {
    throw new Error('Invalid vocabulary entry order');
  }
  return order.map(id => byId.get(id)!);
}

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
 * Display rule: a sentence's translation ends with the same terminal mark as its pinyin
 * (. ! ?). If the recorded translation ends with a different mark it is replaced; if it
 * has none, the pinyin's mark is appended. A pinyin without a terminal mark leaves the
 * translation untouched. Presentation only — recorded JSON is never rewritten.
 */
export function alignSentenceEnding(pinyin: string, translation: string): string {
  const mark = pinyin.trimEnd().match(/[.!?]$/)?.[0];
  if (!mark) return translation;
  const trimmed = translation.trimEnd();
  if (trimmed.endsWith(mark)) return translation;
  return /[.!?]$/.test(trimmed) ? trimmed.slice(0, -1) + mark : trimmed + mark;
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
 * recorded tokens, pinyin, translation, audio and style. It inherits every parent word's
 * topics, plus the HSK level, syllabus index and source of one owning parent — the parent
 * with the highest recorded level (ties: the first recorded) — so the card's
 * "HSK L<level>/#<index>" pill always states one word's own recorded identity instead of
 * mixing one word's level with another word's index. The owner is named in
 * sentenceSource.hskFromWord so the pill can say where the index came from. A sentence
 * recorded under several words appears once, listing every parent word. IDs derive from
 * the first example ID, so links stay stable.
 */
export function sentencePhraseEntries(entries: Entry[]): Entry[] {
  // One group per distinct sentence, in first-recorded order, keeping every parent word.
  const groups = new Map<string, { example: Example; words: Entry[] }>();
  for (const word of entries) {
    if (word.entryKind !== 'word') continue;
    for (const example of word.examples) {
      const group = groups.get(example.simplified);
      if (!group) groups.set(example.simplified, { example, words: [word] });
      else if (!group.words.some(parent => parent.id === word.id)) group.words.push(word);
    }
  }
  const phrases: Entry[] = [];
  for (const { example, words } of groups.values()) {
    const first = words[0]!;
    const owner = words.reduce((best, word) => ((word.hskLevel ?? 0) > (best.hskLevel ?? 0) ? word : best), first);
    const topics = [...new Set(words.flatMap(word => [word.categoryId, ...(word.categoryIds ?? [])].filter((id): id is string => Boolean(id))))];
    const subtopicIds = [...new Set(words.flatMap(word => [word.studyMetadata?.primarySubtopicId, ...(word.studyMetadata?.subtopicIds ?? [])].filter((id): id is string => Boolean(id))))];
    phrases.push({
      id: `sentence-${example.id}`, sourceId: null, sourceName: example.source?.sourceName ?? first.sourceName, sourceVersion: example.source?.sourceVersion ?? first.sourceVersion,
      simplified: example.simplified, traditional: null, tokens: example.tokens, pinyinDisplay: examplePinyin(example), meanings: [alignSentenceEnding(examplePinyin(example), example.english)],
      entryKind: 'phrase', hskLevel: owner.hskLevel, hskVersion: owner.hskVersion, hsk_index: owner.hsk_index, hskSource: owner.hskSource,
      categoryId: first.categoryId, categoryIds: topics, partOfSpeech: null, contentStatus: 'draft',
      audio: example.audio ?? null, examples: [], createdAt: first.createdAt, updatedAt: first.updatedAt,
      sentenceSource: { exampleId: example.id, wordIds: words.map(word => word.id), style: example.style ?? null, notes: example.notes ?? null, hskFromWord: owner.simplified, hskFromWordId: owner.id, ...(subtopicIds.length ? { subtopicIds } : {}) },
    });
  }
  return phrases;
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

/** Default type of a phrase with a recorded Conversational/Written style and no recorded part of
 *  speech (example sentences, styled standalone phrases); unclassified phrases keep posLabel. */
export const EXAMPLE_PHRASE_TYPE = 'Example Phrase';
export const entryTypeLabel = (e: Entry): string =>
  !e.partOfSpeech?.trim() && e.entryKind === 'phrase' && phraseStyle(e) !== 'Unclassified' ? EXAMPLE_PHRASE_TYPE : posLabel(e.partOfSpeech);

export function entryToWord(e: Entry, categories: Category[]): Word {
  const first = orderExamples(e.examples)[0];
  return {
    id: e.id, hanzi: e.simplified, pinyin: e.pinyinDisplay, meaning: e.meanings.join(TRANSLATION_SEPARATOR), type: entryTypeLabel(e),
    collection: categoryName(categories.find(c => c.id === e.categoryId)?.name ?? 'Uncategorized'), level: levelLabel(e),
    collections: [...new Set([e.categoryId, ...(e.categoryIds ?? [])].flatMap(id => {
      const category = categories.find(c => c.id === id);
      return category ? [categoryName(category.name)] : [];
    }))],
    hskId: e.hsk_index ?? null,
    sentence: first?.simplified ?? '', translation: first ? alignSentenceEnding(examplePinyin(first), first.english) : '',
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
