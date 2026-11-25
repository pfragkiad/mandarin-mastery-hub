import { topicSelectionFilters, topicSelectionItems, topicSelectionValue } from '@/lib/topic-selection';
import { ALL_SUBTOPICS, type VocabularySubtopic } from '@/lib/vocabulary-subtopics';
import { FilterSelect } from './filter-select';

/** Shared combined topic picker. Inputs are available recorded facets and URL-backed
 * selections; callbacks preserve each caller's existing all-filter sentinels. */
export function TopicSelect({ topics, subtopics, collection, subtopic, onChange, allTopics = 'All collections', allSubtopics = ALL_SUBTOPICS }: {
  topics: string[]; subtopics: VocabularySubtopic[]; collection: string; subtopic: string;
  onChange: (filters: { collection: string; subtopic: string }) => void;
  allTopics?: string; allSubtopics?: string;
}) {
  return <FilterSelect ariaLabel="Topic" value={topicSelectionValue(collection, subtopic)}
    items={topicSelectionItems(topics, subtopics, collection, subtopic)}
    onValueChange={value => { const filters = topicSelectionFilters(value, allTopics, allSubtopics); if (filters) onChange(filters); }}/>;
}