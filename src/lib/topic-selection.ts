import { ALL_SUBTOPICS, subtopicById, type VocabularySubtopic } from './vocabulary-subtopics';
import { UNCLASSIFIED_TOPIC } from './mandarin';

const TOPIC_PREFIX = 'topic:';
const SUBTOPIC_PREFIX = 'subtopic:';

/** One presentation value, while URL filters retain their original separate identities. */
export function topicSelectionValue(collection: string, subtopic: string) {
  return subtopic && subtopic !== ALL_SUBTOPICS ? `${SUBTOPIC_PREFIX}${subtopic}`
    : collection && collection !== 'All collections' ? `${TOPIC_PREFIX}${collection}` : '';
}

/** Selecting a parent clears its child; selecting a child keeps its recorded parent. */
export function topicSelectionFilters(value: string, allTopics: string, allSubtopics: string) {
  if (!value) return { collection: allTopics, subtopic: allSubtopics };
  if (value.startsWith(TOPIC_PREFIX)) return { collection: value.slice(TOPIC_PREFIX.length), subtopic: allSubtopics };
  const child = value.startsWith(SUBTOPIC_PREFIX) ? subtopicById(value.slice(SUBTOPIC_PREFIX.length)) : undefined;
  return child ? { collection: child.parentLabel, subtopic: child.id } : undefined;
}

/** Keep available parents selectable and their recorded children directly underneath. */
export function topicSelectionItems(topics: string[], subtopics: VocabularySubtopic[], collection: string, subtopic: string) {
  const picked = subtopicById(subtopic);
  const children = picked && !subtopics.some(s => s.id === picked.id) ? [...subtopics, picked] : subtopics;
  const parents = [...new Set([...topics.filter(t => t && t !== 'All collections'), ...children.map(s => s.parentLabel), ...(collection && collection !== 'All collections' ? [collection] : [])])].filter(t => t !== UNCLASSIFIED_TOPIC);
  return [{ value: '', label: 'All topics' }, ...parents.flatMap(parent => [
    { value: `${TOPIC_PREFIX}${parent}`, label: parent, parent: true },
    ...children.filter(s => s.parentLabel === parent).map(s => ({ value: `${SUBTOPIC_PREFIX}${s.id}`, label: s.label, nested: true })),
  ]), { value: `${TOPIC_PREFIX}${UNCLASSIFIED_TOPIC}`, label: UNCLASSIFIED_TOPIC }];
}