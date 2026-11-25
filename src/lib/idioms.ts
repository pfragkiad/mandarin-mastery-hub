import { orderLibrary, type LibrarySort } from './library-order';
import { filterWords, type Word } from './mandarin';

export type IdiomRankClass = {
  id: string;
  label: string;
  from: number;
  to: number;
  bandCoveragePct: number;
  cumulativePct: number;
};

export type IdiomRecord = {
  id: string;
  rank: number;
  hanzi: string;
  traditional?: string;
  pinyin: string;
  meaning: string;
  score?: number;
  docFreq?: number;
  cumPct?: number;
};

export type IdiomDataset = {
  schemaVersion: number;
  source: string;
  total: number;
  rankClasses: IdiomRankClass[];
  entries: IdiomRecord[];
};

export const ALL_IDIOM_BANDS = 'All ranks';

let cachedDataset: IdiomDataset | null = null;
let cachedWords: Word[] | null = null;
let pendingLoad: Promise<{ dataset: IdiomDataset; words: Word[] }> | null = null;

/** Adapt a raw idiom record into the shared Word shape used by Vocabulary cards and detail sheets. */
export function idiomToWord(entry: IdiomRecord, source: string): Word {
  return {
    id: entry.id,
    hanzi: entry.hanzi,
    pinyin: entry.pinyin,
    meaning: entry.meaning,
    type: '',
    collection: '',
    level: '',
    sentence: '',
    translation: '',
    entryKind: 'idiom',
    idiomMeta: {
      rank: entry.rank,
      ...(entry.traditional ? { traditional: entry.traditional } : {}),
      ...(entry.score != null ? { score: entry.score } : {}),
      ...(entry.docFreq != null ? { docFreq: entry.docFreq } : {}),
      ...(entry.cumPct != null ? { cumPct: entry.cumPct } : {}),
      source,
    },
  };
}

/** Lazily fetch and cache public/data/idioms.json outside the main JS bundle. */
export function loadIdioms(): Promise<{ dataset: IdiomDataset; words: Word[] }> {
  if (cachedDataset && cachedWords) return Promise.resolve({ dataset: cachedDataset, words: cachedWords });
  if (!pendingLoad) {
    pendingLoad = fetch('/data/idioms.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load idioms (${res.status})`);
        return res.json() as Promise<IdiomDataset>;
      })
      .then(dataset => {
        const words = dataset.entries.map(entry => idiomToWord(entry, dataset.source));
        cachedDataset = dataset;
        cachedWords = words;
        return { dataset, words };
      })
      .catch(err => {
        pendingLoad = null;
        throw err;
      });
  }
  return pendingLoad;
}

/** Match an idiom's frequency rank against a selected rank band (e.g. "1-100"). */
export function matchesIdiomBand(word: Word, bandId: string, rankClasses: readonly IdiomRankClass[]): boolean {
  if (!bandId || bandId === ALL_IDIOM_BANDS) return true;
  const rank = word.idiomMeta?.rank;
  if (rank == null) return false;
  const band = rankClasses.find(c => c.id === bandId);
  if (!band) return false;
  return rank >= band.from && rank <= band.to;
}

/** Filter idioms by rank band, search query, pinyin mode, and saved status. */
export function filterIdioms(
  idioms: Word[],
  rankClasses: readonly IdiomRankClass[],
  query: string,
  band: string,
  status: string,
  saved: string[],
  pinyinOnly = false,
  exactPinyin = false,
): Word[] {
  const byBand = band && band !== ALL_IDIOM_BANDS ? idioms.filter(w => matchesIdiomBand(w, band, rankClasses)) : idioms;
  return filterWords(byBand, query, 'All collections', 'All levels', status, saved, pinyinOnly, 'All types', exactPinyin);
}

/** Order idioms by recorded frequency rank (default), pinyin, or seeded shuffle. */
export function orderIdioms(idioms: readonly Word[], sort: LibrarySort = 'rank', seed = 1): Word[] {
  const effective = sort === 'pinyin' || sort === 'random' ? sort : 'rank';
  return orderLibrary(idioms, effective, seed);
}