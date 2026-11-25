import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterSelect, orderedFilterItems } from './filter-select';

// Exercise the Radix value callback directly, including its hidden form reset.
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { onValueChange: (value: string) => void; children: React.ReactNode }) => <div>{children}<button onClick={() => onValueChange('')}>Form reset</button><button onClick={() => onValueChange('All collections')}>Default topic</button><button onClick={() => onValueChange('People')}>Choose topic</button><button onClick={() => onValueChange('__empty__')}>Empty option</button></div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Dropdown defaults are not filter edits', () => {
  it('puts Unclassified last across ordinary and grouped classification choices', () => {
    expect(orderedFilterItems([
      { value: '', label: 'All styles' },
      { label: 'Styles', options: [{ value: 'missing', label: 'Unclassified' }, { value: 'written', label: 'Written' }] },
      { value: 'spoken', label: 'Conversational' },
    ])).toEqual([
      { value: '', label: 'All styles' },
      { label: 'Styles', options: [{ value: 'written', label: 'Written' }] },
      { value: 'spoken', label: 'Conversational' },
      { value: 'missing', label: 'Unclassified' },
    ]);
  });
  it.each([
    ['All collections', 'All topics'],
    ['All types', 'All types'],
  ])('keeps %s unchanged on an empty form reset', (value, label) => {
    const change = vi.fn();
    render(<FilterSelect value={value} onValueChange={change} items={[{ value, label }, { value: 'People', label: 'People' }]}/>);
    fireEvent.click(screen.getByText('Form reset'));
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Choose topic'));
    expect(change).toHaveBeenCalledExactlyOnceWith('People');
  });

  it('does not submit selecting the already displayed All topics default', () => {
    const change = vi.fn();
    render(<FilterSelect value="All collections" onValueChange={change} items={[{ value: 'All collections', label: 'All topics' }]}/>);
    fireEvent.click(screen.getByText('Default topic'));
    expect(change).not.toHaveBeenCalled();
  });

  it('preserves explicit empty options used to clear active filters', () => {
    const change = vi.fn();
    render(<FilterSelect value="People" onValueChange={change} items={[{ value: '', label: 'All topics' }, { value: 'People', label: 'People' }]}/>);
    fireEvent.click(screen.getByText('Empty option'));
    expect(change).toHaveBeenCalledExactlyOnceWith('');
  });
  it('ignores hidden resets even when an explicit All option exists', () => {
    const change = vi.fn();
    render(<FilterSelect value="range:37-300" onValueChange={change} items={[{ value: '', label: 'All ranks' }, { value: 'range:37-300', label: 'Rank 37–300' }]}/>);
    fireEvent.click(screen.getByText('Form reset'));
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Empty option'));
    expect(change).toHaveBeenCalledExactlyOnceWith('');
  });
});