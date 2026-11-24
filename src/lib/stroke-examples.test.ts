import { describe, expect, it } from 'vitest';
import { strokeExamples } from './stroke-examples';
import { cncharStrokeNames } from './stroke-names';

describe('exact representative stroke occurrences', () => {
  it('uses the second stroke of 入 for ㇝, never its initial 撇', async () => {
    expect(strokeExamples['㇝']).toEqual({ code: 'TN', character: '入', strokeIndex: 1 });
    // The source calls this occurrence 捺; TN is the reference's named shape variant.
    expect((await cncharStrokeNames('入'))?.[1]?.name).toBe('捺');
  });
  it('uses the second stroke of 及 for ㇋', async () => {
    expect(strokeExamples['㇋']).toEqual({ code: 'HZZP', character: '及', strokeIndex: 1 });
    expect((await cncharStrokeNames('及'))?.[1]?.name).toBe('横折折撇');
  });
  it('uses the fourth stroke of 凸 for ㇎', async () => {
    expect(strokeExamples['㇎']).toEqual({ code: 'HZZZ', character: '凸', strokeIndex: 3 });
    expect((await cncharStrokeNames('凸'))?.[3]?.name).toBe('横折折折');
  });
  it('does not lend 肅’s vertical stroke to unverified ㇘', () => {
    expect(strokeExamples['㇘']).toBeUndefined();
  });
});