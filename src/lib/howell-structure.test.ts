import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { howellInline, howellPresentation, howellSourceText, howellTokenText, type HowellBlock } from './howell-structure';

/** Fixture texts copied verbatim from the recorded Howell entries the guide names. */
const FIX = {
  好: '子# child + 女 woman → woman clasping a child → *like*; *love* → *desirable*; *favorable*; *fondness*; *pleasing*; *fine*; *taste*; *choice*; *preference*.',
  是: 'The relevant bronzeware inscription form is 止# (stand straight) + a spoon/ladle → straight spoon/ladle → *correct*; *just*; *right* (← abstract applications of straightness/uprightness).',
  古: 'The relevant oracle bone form of 古 combines 口 mouth + an object filling it → expectorate *old*, *dried out*, *hard* food → *dry up*; *stale* → *used*; *old-fashioned*.',
  丞: 'A simplification of a seal inscription character composed of 廾# pair of hands + an element combining 山 mountain and a squatting figure → *help* raise a person (compare 乘 and 登) out of danger etc. → *assist*; *adjutant*.',
  乾: 'The relevant bronzeware inscription form is 乙 (rise) + an element# combining 日 sun/day and a pennant/banner → the sun likened to a flag that rises high in and adheres to the sky → *high and bright sky* → *dry* (← air/water that rises due to heat).',
  丸: 'The relevant seal inscription form is 人 person bending beneath a curved line# suggesting a cliff (compare 宛) → *round*; *circular*; *spherical* (← posture of the figure) → *roll up*; *make a ball of*; *wad up*. Also, *entire* (← complete ← round). *Suffix in the names of ships* is by confusion with the classical Japanese term まろ (maro), meaning "lineage."',
  久: 'The relevant seal inscription form shows an aged/long-lived person with a curved back (compare 老) + a line indicating a stick on which the person leans. *Long (time)* and *long duration* are associated meanings, likened to the longevity of an aged person.',
  固: '古# hard; dried out + 囗 circular enclosure → harden about an object → *hard/harden*; *stiff/stiffen* → *resolute*; *stubborn*. Other extended meanings include *tight*, *firm*, *rigid*, *strict*, *solid*, *jell*, *fortify*, *collect*, *settle*, and *settle down*.',
  据: 'As per 居# (settle/set in place) + 手 hand/action indicator (for emphasis/clarification) → *set*; *place*; *settle down to*; *settle upon*.',
};
const kinds = (blocks: HowellBlock[]) => blocks.filter(b => b.kind !== 'gap').map(b => b.kind);
const parts = (text: string) => (howellPresentation(text).blocks.find(b => b.kind === 'composition') as Extract<HowellBlock, { kind: 'composition' }> | undefined)?.parts.map(p => p.text);
const steps = (text: string) => (howellPresentation(text).blocks.find(b => b.kind === 'progression') as Extract<HowellBlock, { kind: 'progression' }> | undefined)?.steps.map(p => p.text);
const context = (text: string) => howellPresentation(text).blocks.filter(b => b.kind === 'context').map(b => (b as { text: string }).text);

describe('howellPresentation fixtures', () => {
  it('好: direct composition, ordered path, marked senses at one step', () => {
    expect(kinds(howellPresentation(FIX.好).blocks)).toEqual(['composition', 'progression']);
    expect(parts(FIX.好)).toEqual(['子# child', '女 woman']);
    expect(steps(FIX.好)?.[1]).toBe('*like*; *love*');
  });
  it('是: preface kept as context, 止# plus a described spoon/ladle, reason stays with the final senses', () => {
    expect(context(FIX.是)).toEqual(['The relevant bronzeware inscription form is ']);
    expect(parts(FIX.是)).toEqual(['止# (stand straight)', 'a spoon/ladle']);
    expect(steps(FIX.是)?.at(-1)).toBe('*correct*; *just*; *right* (← abstract applications of straightness/uprightness).');
  });
  it('古: narrative preface with the self glyph, a named mouth and a described element', () => {
    expect(context(FIX.古)).toEqual(['The relevant oracle bone form of 古 combines ']);
    expect(parts(FIX.古)).toEqual(['口 mouth', 'an object filling it']);
  });
  it('丞: prefaced composition with 廾# and a described complex element', () => {
    expect(parts(FIX.丞)).toEqual(['廾# pair of hands', 'an element combining 山 mountain and a squatting figure']);
    expect(steps(FIX.丞)?.[0]).toContain('(compare 乘 and 登)');
  });
  it('乾: the # stays on "element", never on the nearby 日', () => {
    const tokens = howellInline(parts(FIX.乾)?.[1] ?? '');
    expect(tokens[1]).toEqual({ kind: 'marker', reason: false });
    expect(tokens.find(t => t.kind === 'glyph')).toEqual({ kind: 'glyph', glyph: '日', phonosemantic: false, reason: false });
  });
  it('丸: no composition; described line# stays inline; later meanings stay visible prose', () => {
    const p = howellPresentation(FIX.丸);
    expect(kinds(p.blocks)).toEqual(['context', 'progression', 'prose', 'prose']);
    expect(howellInline(context(FIX.丸)[0] ?? '').some(t => t.kind === 'marker')).toBe(true);
    const also = p.blocks.find(b => b.kind === 'prose') as { text: string };
    expect(also.text).toBe('Also, *entire* (← complete ← round).');
    expect(howellInline(also.text).filter(t => t.kind === 'arrow' && t.reason)).toHaveLength(2);
  });
  it('久: no arrow chain is manufactured; associated meanings stay prose', () => {
    const p = howellPresentation(FIX.久);
    expect(p.blocks.some(b => b.kind === 'progression')).toBe(false);
    expect((p.blocks.at(-1) as { text: string }).text).toMatch(/^\*Long \(time\)\* and/);
  });
  it('固: semicolon senses stay one step; "Other extended meanings" stays one prose block', () => {
    expect(steps(FIX.固)).toEqual(['harden about an object', '*hard/harden*; *stiff/stiffen*', '*resolute*; *stubborn*.']);
    expect(kinds(howellPresentation(FIX.固).blocks)).toEqual(['composition', 'progression', 'prose']);
  });
  it('据: "As per" stays with its element inside the composition', () => {
    expect(parts(FIX.据)?.[0]).toBe('As per 居# (settle/set in place)');
  });
});

describe('fallback notation (synthetic grammar cases, not records)', () => {
  it.each([
    'A (broken → paren + here → x.',
    'Unpaired *star → and 字 + 女 woman.',
    'He said "stop. Now" → later + more.',
    'Compare e.g. Another → thing (a → b (c + d)) + e.',
  ])('rebuilds %s exactly', text => {
    expect(howellSourceText(howellPresentation(text))).toBe(text);
  });
  it('keeps malformed parentheses as prose', () => {
    expect(kinds(howellPresentation('A (broken → paren + here → x.').blocks)).toEqual(['prose']);
  });
  it('never splits inside quotes or after an abbreviation', () => {
    expect(howellPresentation('He said "stop. Now go" fast.').blocks).toHaveLength(1);
    expect(howellPresentation('Dogs, cats etc. Then more.').blocks).toHaveLength(1);
  });
});

describe('every recorded Howell entry', () => {
  it('rebuilds exactly from its blocks and inline tokens', () => {
    const dir = join(process.cwd(), 'public/data/etymology/glyphs');
    let checked = 0;
    for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
      const shard = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { characters: Record<string, { entries: { sourceId: string; text: string }[] }> };
      for (const character of Object.values(shard.characters)) for (const entry of character.entries) {
        if (entry.sourceId !== 'howell') continue;
        const p = howellPresentation(entry.text);
        expect(howellSourceText(p)).toBe(entry.text);
        for (const block of p.blocks) {
          const pieces = block.kind === 'composition' ? block.parts : block.kind === 'progression' ? block.steps : [{ sep: '', text: block.text }];
          for (const piece of pieces) expect(howellTokenText(howellInline(piece.text))).toBe(piece.text);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(6000);
  });
});
