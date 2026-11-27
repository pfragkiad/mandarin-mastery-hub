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

  it('starts expanded when defaultExpanded is true so a deep-linked item beyond initialCount is visible', () => {
    const cards = ['一', '二', '三'].map(glyph => <a key={glyph} href={`/vocabulary?word=${glyph}`}>{glyph}</a>);
    render(<ExpandableCharacterGrid cards={cards} initialCount={2} defaultExpanded/>);
    expect(screen.getByRole('link', { name: '三' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');
  });
});