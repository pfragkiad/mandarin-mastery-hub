import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExpandableCharacterGrid } from './expandable-character-grid';

describe('Expandable character examples', () => {
  it('filters only expanded results and restores the original preview on collapse', () => {
    const cards = ['destination', 'school', 'home'].map(id => <a key={id} href={`/vocabulary?word=${id}`}>{id}</a>);
    render(<ExpandableCharacterGrid cards={cards} initialCount={2} label="All phrase examples" searchTexts={['目的地 mùdìdi destination', '学校 xuéxiào school', '家 jiā home']}/>);
    expect(screen.queryByRole('searchbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 3' }));
    expect(screen.getByText('3 matches')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'mudidi' } });
    expect(screen.getByRole('link', { name: 'destination' })).toHaveAttribute('href', '/vocabulary?word=destination');
    expect(screen.queryByRole('link', { name: 'school' })).toBeNull();
    expect(screen.getByText('1 matches')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getAllByRole('link')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('hides the collapse control while a search filter is typed and restores it when the box empties', () => {
    const cards = ['destination', 'school', 'home'].map(id => <a key={id} href={`/vocabulary?word=${id}`}>{id}</a>);
    render(<ExpandableCharacterGrid cards={cards} initialCount={2} label="All phrase examples" searchTexts={['目的地 mùdìdi destination', '学校 xuéxiào school', '家 jiā home']}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 3' }));
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'school' } });
    expect(screen.queryByRole('button', { name: 'Show fewer' })).toBeNull();
    expect(screen.getByText('1 matches')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });

  it('reveals exact remaining destinations only after expansion and hides them again on collapse', () => {
    const cards = ['人', '你', '他'].map(glyph => <a key={glyph} href={`/characters?tab=Characters&id=Characters:${glyph}`}>{glyph}</a>);
    render(<ExpandableCharacterGrid cards={cards} initialCount={2}/>);
    expect(screen.queryByRole('link', { name: '他' })).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('link', { name: '他' })).toHaveAttribute('href', '/characters?tab=Characters&id=Characters:他');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('link', { name: '他' })).toBeNull();
  });

  it('starts compact when the selected record changes', () => {
    const cards = ['你', '他'].map(glyph => <a key={glyph} href={`/characters?id=Characters:${glyph}`}>{glyph}</a>);
    const { rerender } = render(<ExpandableCharacterGrid key="人" cards={cards} initialCount={1}/>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('link', { name: '他' })).toBeInTheDocument();
    rerender(<ExpandableCharacterGrid key="亻" cards={cards} initialCount={1}/>);
    expect(screen.queryByRole('link', { name: '他' })).toBeNull();
  });

  it('starts expanded when defaultExpanded is true so a deep-linked item beyond initialCount is visible', () => {
    const cards = ['一', '二', '三'].map(glyph => <a key={glyph} href={`/vocabulary?word=${glyph}`}>{glyph}</a>);
    render(<ExpandableCharacterGrid cards={cards} initialCount={2} defaultExpanded/>);
    expect(screen.getByRole('link', { name: '三' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('frames the expanded list only while it actually scrolls', () => {
    const cards = ['一', '二', '三'].map(glyph => <a key={glyph} href={`/vocabulary?word=${glyph}`}>{glyph}</a>);
    render(<ExpandableCharacterGrid cards={cards} initialCount={2}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 3' }));
    const grid = screen.getByRole('region', { name: 'All character examples' });
    // jsdom measures nothing, so the list is treated as fitting: no frame.
    expect(grid).not.toHaveClass('is-scrollable');
    // A list taller than its box gets the frame, and losing that height takes it back off.
    Object.defineProperty(grid, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(grid, 'clientHeight', { configurable: true, value: 300 });
    fireEvent(window, new Event('resize'));
    expect(grid).toHaveClass('is-scrollable');
    Object.defineProperty(grid, 'scrollHeight', { configurable: true, value: 300 });
    fireEvent(window, new Event('resize'));
    expect(grid).not.toHaveClass('is-scrollable');
  });
});