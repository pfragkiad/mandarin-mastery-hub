import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExpandableCharacterGrid } from './expandable-character-grid';

describe('Expandable character examples', () => {
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
});