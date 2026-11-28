import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
const chartDataMock = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('@/lib/pinyin-guide', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pinyin-guide')>('@/lib/pinyin-guide');
  return { ...actual, loadPinyinData: async () => chartDataMock.current };
});
const chipPlayMock = vi.hoisted(() => vi.fn());
vi.mock('./pinyin-shared', () => ({ ToneContour: () => null, sound: (base: string, tone: number) => ({ base, tone }), usePinyinPlayer: () => ({ play: chipPlayMock, stop: vi.fn(), clearError: vi.fn(), error: '', playing: null }) }));
vi.mock('@/lib/audio', () => ({ playRecordingAt: vi.fn(async () => true), stopRecording: vi.fn(), NORMAL_RATE: 1, SLOW_RATE: 0.65 }));

afterEach(() => { cleanup(); detailTrail.clear(); vi.clearAllMocks(); sharedSpeed.slow = false; chartDataMock.current = null; });

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
    expect(onChange).toHaveBeenCalledWith({ rule: 'yi', example: undefined, closed: undefined });
  });

  it.each(['yi', 'bu'] as const)('keeps the current %s rule and exact example when closing and reopening', async rule => {
    const onChange = vi.fn();
    const row = rulePool(data as unknown as TonePairData, rule)[1];
    if (!row) throw new Error(`Missing ${rule} example fixture`);
    const view = render(<ToneSoundsPage mode="changes" search={{ rule, example: row.id }} onChange={onChange}/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Close and show card in list' }));
    expect(onChange).toHaveBeenCalledWith({ rule, closed: true }, true);
    view.rerender(<ToneSoundsPage mode="changes" search={{ rule, example: row.id, closed: true }} onChange={onChange}/>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const selectedRule = screen.getByRole('button', { name: rule === 'yi' ? /The tone of 一/ : /The tone of 不/ });
    expect(selectedRule).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Two third tones/ })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(selectedRule);
    expect(onChange).toHaveBeenLastCalledWith({ rule, example: row.id, closed: undefined });
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

  it('Written → Spoken plays both citation syllables with pauses before the whole word and highlights each playing tone card', async () => {
    const row = rulePool(data as unknown as TonePairData, 'bu').find(example => example.headword === '不错');
    if (!row) throw new Error('Missing recorded 不错 fixture');
    const [first, second] = row.chartLinks;
    if (!first || !second) throw new Error('Missing chartLinks for 不错');
    chartDataMock.current = {
      recordings: {
        [`${first.base}${first.tone}`]: { url: 'https://cdn.example/bu4.mp3' },
        [`${second.base}${second.tone}`]: { url: 'https://cdn.example/cuo4.mp3' },
      },
    };
    const { playRecordingAt } = await import('@/lib/audio');
    const played: string[] = [];
    vi.mocked(playRecordingAt).mockImplementation(async (url, _rate, onSettle) => {
      played.push(url);
      onSettle?.('ended');
      return true;
    });
    render(<ToneSoundsPage mode="changes" search={{ rule: 'bu', example: row.id }} onChange={vi.fn()}/>);
    const btn = await screen.findByRole('button', { name: 'Play 不错' });
    // Wait for lazy loadPinyinData() to resolve.
    await vi.waitFor(() => { expect(btn).toBeTruthy(); });
    fireEvent.click(btn);
    await vi.waitFor(() => {
      expect(played).toEqual(['https://cdn.example/bu4.mp3', 'https://cdn.example/cuo4.mp3', row.audio.url]);
    }, { timeout: 2000 });
  });

  it('clicking a tone tile in Tone pairs plays that exact syllable recording', async () => {
    chartDataMock.current = {
      recordings: {
        ke3: { url: 'https://cdn.example/ke3.mp3' },
        ke2: { url: 'https://cdn.example/ke2.mp3' },
        yi3: { url: 'https://cdn.example/yi3.mp3' },
      },
    };
    render(<ToneSoundsPage mode="pairs" search={{ pair: '3-3' }} onChange={vi.fn()}/>);
    const hero = await vi.waitFor(() => {
      const el = document.querySelector<HTMLElement>('.tone-pair-hero');
      if (!el) throw new Error('waiting for hero');
      return el;
    });
    const writtenTile = await within(hero).findByRole('button', { name: 'Play kě' });
    fireEvent.click(writtenTile);
    expect(chipPlayMock).toHaveBeenCalledWith({ base: 'ke', tone: 3 });
    const spokenTile = within(hero).getByRole('button', { name: 'Play ké' });
    fireEvent.click(spokenTile);
    expect(chipPlayMock).toHaveBeenCalledWith({ base: 'ke', tone: 2 });
  });
});