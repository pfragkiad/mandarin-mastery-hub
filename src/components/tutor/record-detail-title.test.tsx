import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecordDetailTitle } from './record-detail-title';

const head = (container: HTMLElement) => container.querySelector('.catalog-detail-head') as HTMLElement;

describe('Record detail heading', () => {
  it('stacks pinyin above the characters and the meaning below', () => {
    const { container } = render(<RecordDetailTitle hanzi="今天天气怎么样？" pinyin="Jīntiān tiānqì zěnmeyàng?" meaning="How is the weather today?"/>);
    const order = [...head(container).children].map(node => node.className);
    expect(order).toEqual(['catalog-detail-pinyin-row', '', '']);
    expect(head(container).querySelector('strong')?.textContent).toBe('今天天气怎么样？');
    expect(head(container).querySelector('h2')?.textContent).toBe('How is the weather today?');
  });

  it('puts the audio control on the pinyin line, vertically centered with it', () => {
    const { container } = render(<RecordDetailTitle hanzi="我" pinyin="wǒ" meaning="I" audio={<button type="button" aria-label="Listen to 我"/>}/>);
    const row = head(container).querySelector('.catalog-detail-pinyin-row') as HTMLElement;
    const children = [...row.children].map(node => node.className || node.tagName);
    expect(children[0]).toBe('pinyin');
    expect(row.querySelector('button[aria-label="Listen to 我"]')).not.toBeNull();
    expect(row).toHaveStyle({ alignItems: 'center' });
  });

  it('tells the layout how many glyphs to fit so a long phrase keeps its translation readable', () => {
    const { container } = render(<RecordDetailTitle hanzi="我的生日是八月八号。" pinyin="Wǒ de shēngrì shì bā yuè bā hào." meaning="My birthday is August 8."/>);
    expect(head(container).style.getPropertyValue('--detail-chars')).toBe('10');
    expect(head(container).querySelector('strong')?.getAttribute('lang')).toBe('zh-CN');
  });

  it('marks traditional forms and falls back when a reading or meaning is missing', () => {
    const { container } = render(<RecordDetailTitle hanzi="中" script="Traditional"/>);
    expect(head(container).querySelector('strong')?.className).toBe('traditional-character');
    expect(head(container).querySelector('.pinyin')?.textContent).toBe('Pinyin not recorded');
    expect(head(container).querySelector('h2')?.textContent).toBe('No English meaning recorded yet');
    expect(head(container).querySelector('.traditional-label')?.textContent).toBe('Traditional');
  });
});
