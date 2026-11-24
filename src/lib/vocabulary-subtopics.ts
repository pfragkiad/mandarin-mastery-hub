/**
 * Vocabulary subtopics (browser-safe, no React).
 *
 * Purpose: the Vocabulary page's Subtopic dropdown, shown beside Topic.
 *
 * Sources, never inferred:
 * - Which subtopics a word belongs to comes only from its recorded
 *   `studyMetadata.primarySubtopicId` and `studyMetadata.subtopicIds` (HSK topic taxonomy v2).
 *   A word with neither has no subtopic and is never placed in one.
 * - Subtopic labels and parents come from the shared taxonomy registry
 *   (src/data/study_lessons/core/lesson_categories.json, `kind: "subtopic"`), whose labels and
 *   parent relations are copied exactly from the same hsk-topics/2.0.0 source as the words.
 *   Only `active` entries are offered.
 *
 * The URL keeps the stable subtopic ID (`subtopic=digital-technology`); the dropdown shows its
 * label. The parent topic is matched to the Topic dropdown by its exact registry label, which
 * equals the vocabulary topic name for every recorded word.
 */
import registry from '@/data/study_lessons/core/lesson_categories.json';
import type { Word } from './mandarin';

export type VocabularySubtopic = { id: string; label: string; parentId: string; parentLabel: string };

/** Draft/URL sentinel for "no subtopic picked", like "All collections" for Topic. */
export const ALL_SUBTOPICS = 'All subtopics';

type RegistryEntry = { id: string; label: string; status: string; kind?: string; parent_topic_id?: string };
const entries = registry.categories as RegistryEntry[];
const topicLabels = new Map(entries.filter(c => (c.kind ?? 'topic') === 'topic').map(c => [c.id, c.label]));

/** Every active subtopic, in registry order (grouped by parent there). */
export const vocabularySubtopics: VocabularySubtopic[] = entries
  .filter(c => c.kind === 'subtopic' && c.status === 'active' && c.parent_topic_id && topicLabels.has(c.parent_topic_id))
  .map(c => ({ id: c.id, label: c.label, parentId: c.parent_topic_id!, parentLabel: topicLabels.get(c.parent_topic_id!)! }));

const byId = new Map(vocabularySubtopics.map(s => [s.id, s]));
export const subtopicById = (id: string | undefined): VocabularySubtopic | undefined => (id ? byId.get(id) : undefined);

/** The word's recorded subtopic IDs (primary first), or none. */
export function wordSubtopicIds(word: Word): string[] {
  const meta = word.entry?.studyMetadata;
  if (!meta) return [];
  return [...new Set([...(meta.primarySubtopicId ? [meta.primarySubtopicId] : []), ...(meta.subtopicIds ?? [])])];
}

export const inSubtopic = (word: Word, subtopic: string | undefined): boolean =>
  !subtopic || subtopic === ALL_SUBTOPICS || wordSubtopicIds(word).includes(subtopic);

/**
 * Dropdown choices: subtopics recorded on at least one of `items`, limited to the chosen
 * topic's own subtopics when a topic is picked. A current pick stays listed so it can be seen
 * and changed even when nothing matches it any more.
 */
export function subtopicOptions(items: Word[], topic: string, current?: string): VocabularySubtopic[] {
  const used = new Set(items.flatMap(wordSubtopicIds));
  const options = vocabularySubtopics.filter(s => used.has(s.id) && (topic === 'All collections' || s.parentLabel === topic));
  const picked = subtopicById(current);
  return picked && !options.includes(picked) ? [...options, picked] : options;
}
