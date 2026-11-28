import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Puzzle, Quote } from 'lucide-react';
import { ExampleSection, ExampleTabs } from './example-tabs';
import { exampleTabSearch } from '@/lib/detail-example-tabs';

const state = vi.hoisted(() => ({ search: { id: 'Characters:的', examples: undefined as string | undefined }, navigate: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useSearch: () => state.search, useNavigate: () => state.navigate }));
beforeEach(() => { state.search = { id: 'Characters:的', examples: undefined }; state.navigate.mockReset(); });
const fixture = (idiomAvailable = true) => <ExampleTabs>
  <ExampleSection id="word" label="In a word" icon={Puzzle}><a href="/vocabulary?word=exact-word">word destination</a></ExampleSection>
  <ExampleSection id="phrase" label="In a phrase" icon={Quote}><a href="/vocabulary?word=exact-phrase">phrase destination</a></ExampleSection>
  <ExampleSection id="idiom" label="In an idiom" icon={Quote} available={idiomAvailable}><a href="/vocabulary?word=exact-idiom">idiom destination</a></ExampleSection>
</ExampleTabs>;

describe('Detail example selection', () => {
  it('renders only the chosen section and preserves the owning exact record on tab navigation', () => {
    const { rerender } = render(fixture());
    expect(screen.getByRole('link', { name: 'word destination' })).toHaveAttribute('href', '/vocabulary?word=exact-word');
    expect(screen.queryByRole('link', { name: 'phrase destination' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'In a phrase' }));
    const call = state.navigate.mock.calls[0]?.[0] as { search: (prev: typeof state.search) => typeof state.search } | undefined;
    if (!call) throw new Error('Tab navigation did not run');
    expect(call.search(state.search)).toEqual({ id: 'Characters:的', examples: 'phrase' });
    state.search.examples = 'phrase';
    rerender(fixture());
    expect(screen.queryByRole('link', { name: 'word destination' })).toBeNull();
    expect(screen.getByRole('link', { name: 'phrase destination' })).toHaveAttribute('href', '/vocabulary?word=exact-phrase');
    act(() => { state.search.examples = 'word'; rerender(fixture()); });
    expect(screen.getByRole('link', { name: 'word destination' })).toBeInTheDocument();
  });
  it('restores a collapsed URL without mounting any example links', () => {
    state.search.examples = 'off';
    render(fixture());
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
  it('falls back to an available exact section if the requested source has no examples', () => {
    state.search.examples = 'idiom';
    render(fixture(false));
    expect(screen.getByRole('link', { name: 'word destination' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'idiom destination' })).toBeNull();
  });
  it('accepts only the four shared example identities and explicit collapse state', () => {
    expect(['character', 'word', 'phrase', 'idiom', 'off'].map(exampleTabSearch)).toEqual(['character', 'word', 'phrase', 'idiom', 'off']);
    expect(exampleTabSearch('etymology')).toBeUndefined();
  });
  it('hides both word/phrase tabs and their empty bodies when both sources are empty', () => {
    render(<ExampleTabs hideEmptyWordPhrase>
      <ExampleSection id="word" label="In a word" icon={Puzzle} hasContent={false}>empty word</ExampleSection>
      <ExampleSection id="phrase" label="In a phrase" icon={Quote} hasContent={false}>empty phrase</ExampleSection>
    </ExampleTabs>);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('empty word')).toBeNull();
    expect(screen.queryByText('empty phrase')).toBeNull();
  });
  it('keeps both tabs while either source has content or is still loading', () => {
    render(<ExampleTabs hideEmptyWordPhrase>
      <ExampleSection id="word" label="In a word" icon={Puzzle} hasContent={false}>empty word</ExampleSection>
      <ExampleSection id="phrase" label="In a phrase" icon={Quote} hasContent>recorded phrase</ExampleSection>
    </ExampleTabs>);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
  it('retains an available idiom when the word/phrase pair is hidden', () => {
    state.search.examples = 'word';
    render(<ExampleTabs hideEmptyWordPhrase>
      <ExampleSection id="word" label="In a word" icon={Puzzle} hasContent={false}>empty word</ExampleSection>
      <ExampleSection id="phrase" label="In a phrase" icon={Quote} hasContent={false}>empty phrase</ExampleSection>
      <ExampleSection id="idiom" label="In an idiom" icon={Quote}>recorded idiom</ExampleSection>
    </ExampleTabs>);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'In an idiom', selected: true })).toBeTruthy();
    expect(screen.getByText('recorded idiom')).toBeTruthy();
  });
});