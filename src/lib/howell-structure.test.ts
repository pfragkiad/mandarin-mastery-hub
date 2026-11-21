import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { howellInline, howellStructure, type HowellPart } from './howell-structure';

const partText = (part: HowellPart) => part.kind === 'text' ? part.text : `${part.lead ? `${part.lead} ` : ''}${part.glyphs.join('/')}${part.phonosemantic ? '#' : ''}${part.gloss ? ` ${part.gloss}` : ''}`;
const squash = (text: string) => text.replace(/\s+|→|\+/g, '');

describe('howellStructure', () => {
  it('splits 好 into its two parts and the meaning path', () => {
    const s = howellStructure('子# child + 女 woman → woman clasping a child → *like*; *love* → *desirable*.');
    expect(s.formation).toEqual([
      { kind: 'component', lead: '', glyphs: ['子'], phonosemantic: true, gloss: 'child' },
      { kind: 'component', lead: '', glyphs: ['女'], phonosemantic: false, gloss: 'woman' },
    ]);
    expect(s.steps).toEqual(['woman clasping a child', '*like*; *love*', '*desirable*.']);
    expect(s.notes).toEqual([]);
  });

  it('keeps "As per" as the lead and never splits inside parentheses', () => {
    const s = howellStructure('古# hard; dried out + 辛 (cutting tool → punish) → severe punishment.');
    expect(s.formation?.[1]).toEqual({ kind: 'component', lead: '', glyphs: ['辛'], phonosemantic: false, gloss: '(cutting tool → punish)' });
    expect(s.steps).toEqual(['severe punishment.']);
    expect(howellStructure('As per 固# (hardened/hard object) + 人 person → *individual*.').formation?.[0]).toMatchObject({ lead: 'As per', glyphs: ['固'], phonosemantic: true });
  });

  it('moves later sentences into notes', () => {
    const s = howellStructure('A depiction of the *sun* → *day* (← appearance of the sun). As with 熱, the heat.');
    expect(s.formation).toBeNull();
    expect(s.steps).toEqual(['A depiction of the *sun*', '*day* (← appearance of the sun).']);
    expect(s.notes).toEqual(['As with 熱, the heat.']);
  });

  it('loses no text in any recorded Howell entry', () => {
    const dir = join(process.cwd(), 'public/data/etymology/glyphs');
    let checked = 0;
    for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
      const shard = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { characters: Record<string, { entries: { sourceId: string; text: string }[] }> };
      for (const character of Object.values(shard.characters)) for (const entry of character.entries) {
        if (entry.sourceId !== 'howell') continue;
        const s = howellStructure(entry.text);
        const rebuilt = [...(s.formation ?? []).map(partText), ...s.steps, ...s.notes].join('');
        expect(squash(rebuilt)).toBe(squash(entry.text));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(6000);
  });
});

describe('howellInline', () => {
  it('marks meanings, hanzi with their # and the (← …) reason aside', () => {
    expect(howellInline('*counter* (← 竹 pieces) via 箇#')).toEqual([
      { kind: 'meaning', text: 'counter', reason: false },
      { kind: 'text', text: ' ', reason: false },
      { kind: 'text', text: '(← ', reason: true },
      { kind: 'glyph', glyph: '竹', phonosemantic: false, reason: true },
      { kind: 'text', text: ' pieces)', reason: true },
      { kind: 'text', text: ' via ', reason: false },
      { kind: 'glyph', glyph: '箇', phonosemantic: true, reason: false },
    ]);
  });
});
