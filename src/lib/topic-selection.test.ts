import { describe, expect, it } from 'vitest';
import { topicSelectionFilters, topicSelectionItems, topicSelectionValue } from './topic-selection';
import { ALL_SUBTOPICS, vocabularySubtopics } from './vocabulary-subtopics';

describe('Combined topic selection', () => {
  it('selects a parent with all its subtopics, clearing the prior child', () => {
    expect(topicSelectionFilters('topic:Animals & Weather', 'All collections', ALL_SUBTOPICS)).toEqual({ collection: 'Animals & Weather', subtopic: 'All subtopics' });
  });
  it('selects an exact child and its recorded parent', () => {
    expect(topicSelectionFilters('subtopic:animals-wildlife', '', '')).toEqual({ collection: 'Animals & Weather', subtopic: 'animals-wildlife' });
  });
  it('clears both filters for All topics using the caller’s sentinels', () => {
    expect(topicSelectionFilters('', 'All collections', ALL_SUBTOPICS)).toEqual({ collection: 'All collections', subtopic: 'All subtopics' });
    expect(topicSelectionFilters('', '', '')).toEqual({ collection: '', subtopic: '' });
  });
  it('restores a child-only legacy URL without mutating its filter', () => {
    expect(topicSelectionValue('', 'animals-wildlife')).toBe('subtopic:animals-wildlife');
    const items = topicSelectionItems([], [], '', 'animals-wildlife');
    expect(items.map(item => item.value)).toEqual(['', 'topic:Animals & Weather', 'subtopic:animals-wildlife']);
  });
  it('lists each child immediately after its selectable parent', () => {
    const children = vocabularySubtopics.filter(s => s.parentLabel === 'Animals & Weather');
    expect(topicSelectionItems(['Animals & Weather', 'Numbers & Quantities'], children, '', '').map(item => item.value)).toEqual(['', 'topic:Animals & Weather', ...children.map(s => `subtopic:${s.id}`), 'topic:Numbers & Quantities']);
  });
  it('rejects unknown child identities', () => {
    expect(topicSelectionFilters('subtopic:unknown', '', '')).toBeUndefined();
  });
});