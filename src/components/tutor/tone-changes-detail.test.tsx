import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToneSoundsPage, RuleList } from './tone-pairs-page';
import { detailTrail } from '@/lib/detail-trail';
import data from '@/data/pinyin/tone-pairs.json';
import { rulePool, type TonePairData } from '@/lib/tone-pairs';
import type { ReactNode } from 'react';

vi.mock('@/lib/tone-pairs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tone-pairs')>('@/lib/tone-pairs');
  return { ...actual, loadTonePairs: async () => data as unknown as TonePairData };
});
const sharedSpeed = vi.hoisted(() => ({ slow: false, setPreferences: vi.fn() }));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences: { slow: sharedSpeed.slow }, setPreferences: sharedSpeed.setPreferences }) }));
vi.mock('@/lib/section-switch', () => ({ usePublishSections: vi.fn() }));
vi.mock('./one-line-title', () => ({ useOneLineTitle: vi.fn() }));
vi.mock('./source-info', () => ({ SourceInfo: () => null }));
vi.mock('./sentence-section', () => ({ SentenceHints: ({ children }: { children: ReactNode }) => children, ExampleCardMeta: () => null }));
vi.mock('./sound-example-glyph', () => ({ SoundExampleGlyph: ({ fallback }: { fallback: ReactNode }) => fallback }));
vi.mock('./expandable-character-grid', () => ({ ExpandableCharacterGrid: ({ cards }: { cards: ReactNode[] }) => cards }));
vi.mock('./example-pronunciation', () => ({ ExamplePronunciation: () => null }));
vi.mock('./small-grid-meaning', () => ({ SmallGridMeaning: () => null }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <span>{children}</span>, useSearch: () => ({}), useNavigate: () => vi.fn() }));
vi.mock('@/lib/pinyin-guide', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pinyin-guide')>('@/lib/pinyin-guide');
  return { ...actual, loadPinyinData: async () => null };
});
vi.mock('./pinyin-shared', () => ({ ToneContour: () => null, sound: vi.fn(), usePinyinPlayer: () => ({ stop: vi.fn(), clearError: vi.fn(), error: '', playing: null }) }));
vi.mock('@/lib/audio', () => ({ playRecordingAt: vi.fn(async () => true), stopRecording: vi.fn(), NORMAL_RATE: 1, SLOW_RATE: 0.65 }));

afterEach(() => { cleanup(); detailTrail.clear(); vi.clearAllMocks(); sharedSpeed.slow = false; });

describe('Tone changes shared detail navigation', () => {
  it.each(['pairs', 'changes'] as const)('uses the shared Slower preference in %s details', async mode => {
    const { playRecordingAt } = await import('@/lib/audio');
    const view = render(<ToneSoundsPage mode={mode} search={mode === 'pairs' ? { pair: '3-3' } : { rule: 'yi' }} onChange={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('switch', { name: 'Slower pronunciation' }));
    expect(sharedSpeed.setPreferences).toHaveBeenCalledWith({ slow: true });
    sharedSpeed.slow = true;
    view.rerender(<ToneSoundsPage mode={mode} search={mode === 'pairs' ? { pair: '3-3' } : { rule: 'yi' }} onChange={vi.fn()}/>);
    expect(screen.getByRole('switch', { name: 'Slower pronunciation' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /^Play (可以|一些)$/ }));
    expect(playRecordingAt).toHaveBeenCalledWith(expect.any(String), 0.65, expect.any(Function));
  });
  it('steps between rules and clears the previous exact word selection', async () => {
    const onChange = vi.fn();
    render(<ToneSoundsPage mode="changes" search={{ rule: 'third' }} onChange={onChange}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Next tone change in this list' }));
    expect(onChange).toHaveBeenCalledWith({ rule: 'yi', example: undefined });
  });

  it('closes back to the rules without leaving a selected example', async () => {
    const onChange = vi.fn();
    render(<ToneSoundsPage mode="changes" search={{ rule: 'yi' }} onChange={onChange}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Close and show card in list' }));
    expect(onChange).toHaveBeenCalledWith({ rule: undefined, example: undefined }, true);
  });

  it('plays the exact selected word attachment, not the previous rule recording', async () => {
    const row = rulePool(data as unknown as TonePairData, 'bu').find(example => example.headword === '不错');
    if (!row) throw new Error('Missing recorded 不错 fixture');
    const { playRecordingAt } = await import('@/lib/audio');
    render(<ToneSoundsPage mode="changes" search={{ rule: 'bu', example: row.id }} onChange={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Play 不错' }));
    expect(playRecordingAt).toHaveBeenCalledWith(row.audio.url, 1, expect.any(Function));
  });

  it('starts a new grid-originated browsing session when choosing a rule', () => {
    detailTrail.replace({ label: 'Old word', href: '/vocabulary?word=old' });
    const onPick = vi.fn();
    render(<RuleList rule="third" onPick={onPick}/>);
    fireEvent.click(screen.getByRole('button', { name: /The tone of 一/ }));
    expect(onPick).toHaveBeenCalledWith('yi');
    expect(detailTrail.get()).toEqual([]);
  });
});