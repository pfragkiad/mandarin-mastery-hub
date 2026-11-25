import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameBookmarkCollection } from './saved-filter';

afterEach(cleanup);

describe('Game bookmark collection', () => {
  it('does not select an empty bookmark collection', () => {
    const onToggle = vi.fn();
    render(<GameBookmarkCollection on={false} count={0} noun="cards" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('lets a selected empty collection be cleared', () => {
    const onToggle = vi.fn();
    render(<GameBookmarkCollection on count={0} noun="cards" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('selects available bookmarks through the existing draft callback', () => {
    const onToggle = vi.fn();
    render(<GameBookmarkCollection on={false} count={12} noun="cards" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});