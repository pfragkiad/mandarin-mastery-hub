import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { words } from '@/lib/mandarin';
import { VocabularyPage } from './vocabulary';

// Isolate the page's real keyboard wiring from data loading and card rendering;
// URL callbacks and selected record identity remain the inputs under test.
vi.mock('./workspace', () => ({ useWorkspace: () => ({ items: words, saved: [], preferences: { cardReveal: 'all' }, addWord: vi.fn() }) }));
vi.mock('./use-library-density', () => ({ useLibraryDensity: () => ({ size: 12, onPerPageChange: vi.fn() }) }));
vi.mock('@/lib/selection-scroll', () => ({ useRecordScroll: vi.fn() }));
vi.mock('./detail-loading', () => ({ useDetailLoading: () => ({ run: vi.fn() }), DetailLoading: () => null }));
vi.mock('./detail-sheet', () => ({ DetailSheet: () => null }));
vi.mock('./word-card', () => ({ WordCard: () => null, WordDetailContent: () => null }));
vi.mock('./catalog-pagination', () => ({ CatalogPagination: () => null, StickyPagination: () => null }));
vi.mock('./filter-form', () => ({ DraftFilterForm: () => null }));
vi.mock('./library-play-menu', () => ({ LibraryPlayMenu: () => null }));
vi.mock('./card-reveal-toggle', () => ({ CardRevealToggle: () => null, cardRevealClass: () => '' }));
vi.mock('./source-info', () => ({ SourceInfo: () => null }));

afterEach(cleanup);

describe('Vocabulary keyboard paging', () => {
  it.each(['word', 'phrase'] as const)('pages %s records with no selection', tab => {
    const onPageChange = vi.fn();
    render(<VocabularyPage tab={tab} page={2} onPageChange={onPageChange} onWordOpen={vi.fn()}/>);
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(onPageChange).toHaveBeenLastCalledWith(12);
    fireEvent.keyDown(window, { key: 'PageUp' });
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('blocks paging while a matching reference is open', () => {
    const onPageChange = vi.fn();
    const record = words.find(word => word.hanzi === '意思');
    if (!record) throw new Error('Missing 意思');
    render(<VocabularyPage initialWordId={record.id} onPageChange={onPageChange} onWordOpen={vi.fn()}/>);
    fireEvent.keyDown(window, { key: 'PageDown' });
    fireEvent.keyDown(window, { key: 'PageUp' });
    expect(onPageChange).not.toHaveBeenCalled();
  });
});