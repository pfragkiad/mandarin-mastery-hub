import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecordDetailTitle } from './record-detail-title';

const head = (container: HTMLElement) => container.querySelector('.catalog-detail-head') as HTMLElement;

describe('Record detail heading', () => {
  it('puts the characters first, then the pinyin line, then the meaning', () => {
    const { container } = render(<RecordDetailTitle hanzi="今天天气怎么样？" pinyin="Jīntiān tiānqì zěnmeyàng?" meaning="How is the weather today?"/>);
    const order = [...head(container).children].map(node => node.className);
    expect(order).toEqual(['catalog-detail-glyph-row', 'catalog-detail-pinyin-row', '']);
    expect(head(container).querySelector('strong')?.textContent).toBe('今天天气怎么样？');
    expect(head(container).querySelector('h2')?.textContent).toBe('How is the weather today?');
  });

  it('puts the audio control on the pinyin line, vertically centered with it', () => {
    const { container } = render(<RecordDetailTitle hanzi="我" pinyin="wǒ" meaning="I" audio={<button type="button" aria-label="Listen to 我"/>}/>);
    const row = head(container).querySelector('.catalog-detail-pinyin-row') as HTMLElement;
    const children = [...row.children].map(node => node.className || node.tagName);
    expect(children[0]).toBe('pinyin');
    expect(row.querySelector('button[aria-label="Listen to 我"]')).not.toBeNull();
    expect(row.className).toBe('catalog-detail-pinyin-row');
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
    expect(head(container).querySelector('.traditional-pill')?.textContent).toBe('Traditional');
  });

  it('keeps the identity pills in the hanzi row (top right), not on the pinyin line', () => {
    const { container } = render(<RecordDetailTitle hanzi="一" pinyin="yī" meaning="one" pill={<span>Radical #1</span>}/>);
    expect(head(container).querySelector('.catalog-detail-glyph-row > .catalog-detail-pills')?.textContent).toBe('Radical #1');
    expect(head(container).querySelector('.catalog-detail-pinyin-row .catalog-detail-pills')).toBeNull();
  });

  it('drops the separate pinyin line when each reading line carries its own speaker', () => {
    const { container } = render(<RecordDetailTitle hanzi="了" pinyin="le / liǎo" readingsInMeaning meaningContent={<h2 className="reading-meanings">lines</h2>}/>);
    expect(head(container).querySelector('.catalog-detail-pinyin-row')).toBeNull();
    expect([...head(container).children].map(node => node.className)).toEqual(['catalog-detail-glyph-row', 'reading-meanings']);
  });

  it('keeps the single selected hanzi in the title and puts a form switch on its own row below the meaning', () => {
    const { container } = render(<RecordDetailTitle hanzi="钅" pinyin="jīn" meaning="gold" glyphClassName="card-ink-radical" formSwitch={<div className="form-switch">switch</div>}/>);
    expect(head(container).querySelector('.catalog-detail-glyph-row > strong')?.textContent).toBe('钅');
    expect(head(container).querySelector('.catalog-detail-glyph-row > strong')?.className).toBe('card-ink-radical');
    expect(head(container).querySelector('.form-switch')).toBeNull();
    const title = container.querySelector('.catalog-detail-title') as HTMLElement;
    expect([...title.children].map(node => node.className)).toEqual(['catalog-detail-head', 'catalog-detail-forms']);
  });
});
