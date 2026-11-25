import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FrequencyRangeControl, StrokeRangeControl } from './game-controls';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

describe('expandable game ranges', () => {
  it('keeps a stroke draft when its panel is closed and reopened', () => {
    const change = vi.fn();
    render(<StrokeRangeControl value="4-9" onChange={change}/>);
    const button = screen.getByRole('button', { name: /^Strokes:/ });
    expect(screen.queryByRole('slider', { name: 'Minimum strokes' })).toBeNull();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByRole('slider', { name: 'Minimum strokes' })).toHaveAttribute('aria-valuenow', '4');
    expect(change).not.toHaveBeenCalled();
  });
  it('records exact numeric drafts and does not reset them when custom options mount', () => {
    const change = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      return <form><FrequencyRangeControl value={value} maxRank={9933}
        groups={[{ value: '1-100', label: 'Rank 1–100', min: 1, max: 100 }, { value: '101-300', label: 'Rank 101–300', min: 101, max: 300 }]}
        onChange={next => { setValue(next); change(next); }}/></form>;
    }
    render(<Harness/>);
    fireEvent.click(screen.getByRole('button', { name: /^Rank:/ }));
    expect(screen.queryByRole('spinbutton', { name: 'From rank' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'To rank' }), { target: { value: '300' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'From rank' }), { target: { value: '37' } });
    expect(change).toHaveBeenLastCalledWith('range:37-300');
    expect(screen.getByRole('spinbutton', { name: 'From rank' })).toHaveValue(37);
    expect(screen.getByRole('spinbutton', { name: 'To rank' })).toHaveValue(300);
  });
  it('clears only the stroke draft', () => {
    const change = vi.fn();
    render(<StrokeRangeControl value="9-15" onChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: /^Strokes:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(change).toHaveBeenCalledExactlyOnceWith('');
  });
  it('clears the rank draft and widening together', () => {
    const change = vi.fn();
    render(<FrequencyRangeControl value="range:254-1000" upTo groups={[]} maxRank={9933} onChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: /^Rank:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(change).toHaveBeenCalledExactlyOnceWith('', false);
  });
  it('Done closes the stroke panel and commits nothing', () => {
    const change = vi.fn();
    render(<StrokeRangeControl value="4-9" onChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: /^Strokes:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('slider', { name: 'Minimum strokes' })).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });
  it('Done closes the rank panel and commits nothing', () => {
    const change = vi.fn();
    render(<FrequencyRangeControl value="range:37-300" groups={[]} maxRank={9933} onChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: /^Rank:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('button', { name: 'Advanced' })).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });
});