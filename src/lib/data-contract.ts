// Versioned mirror of the Mandarin Tutor API vocabulary contract (v1) plus an adapter to the UI's Word shape.
// Hosted preview uses the fixtures below; a local deployment can fetch the same shape from /api/vocabulary.
import type { AudioAttachment } from './audio';
import type { Word } from './mandarin';
import vocabularyJson from '@/data/vocabulary.json';

export type TextToken = { kind: 'hanzi' | 'punctuation' | 'space'; text: string; pinyin: string | null; reviewed: boolean };
export type SourceRef = { sourceName: string; sourceVersion: string; sourceId: string };
export type Example = { id: string; simplified: string; tokens: TextToken[]; english: string; notes?: string | null; audio?: AudioAttachment | null };
export type Category = { id: string; name: string };
export type Entry = {
  id: string; sourceId: string | null; sourceName: string | null; sourceVersion: string | null; secondarySources?: SourceRef[];
  simplified: string; traditional: string | null; tokens: TextToken[]; pinyinDisplay: string; meanings: string[];
  entryKind: 'word' | 'phrase'; hskLevel: number | null; hskVersion: '3.0' | null; hsk_index: number | null; hskSource: SourceRef | null;
  categoryId: string | null; categoryIds?: string[]; partOfSpeech: string | null; partOfSpeechSource?: SourceRef; tags?: string[]; contentStatus: 'draft' | 'reviewed';
  audio: AudioAttachment | null; examples: Example[]; createdAt: string; updatedAt: string;
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

export function entryToWord(e: Entry, categories: Category[]): Word {
  const first = e.examples[0];
  return {
    id: e.id, hanzi: e.simplified, pinyin: e.pinyinDisplay, meaning: e.meanings.join(' · '), type: posLabel(e.partOfSpeech),
    collection: categoryName(categories.find(c => c.id === e.categoryId)?.name ?? 'Uncategorized'), level: levelLabel(e),
    sentence: first?.simplified ?? '', translation: first?.english ?? '',
    sentencePinyin: first
      ? first.tokens.map(tok => tok.pinyin ?? tok.text).join(' ')
          .replace(/\s+([,.!?;:%，。！？；：、])/g, '$1')
          .replace(/[。！？，、；：()]/g, c => LATIN_PUNCTUATION[c] ?? c)
      : '',
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
