import { describe, expect, it } from 'vitest';
import { accuracyGrade } from './accuracy-grade';

describe('accuracyGrade', () => {
  it('90% and above is green', () => { expect(accuracyGrade(90)).toBe('high'); expect(accuracyGrade(100)).toBe('high'); });
  it('80–89% is orange', () => { expect(accuracyGrade(80)).toBe('good'); expect(accuracyGrade(89)).toBe('good'); });
  it('60–79% is brown', () => { expect(accuracyGrade(60)).toBe('fair'); expect(accuracyGrade(79)).toBe('fair'); });
  it('below 60% (including 51–59%) is red', () => { expect(accuracyGrade(59)).toBe('low'); expect(accuracyGrade(55)).toBe('low'); expect(accuracyGrade(50)).toBe('low'); });
});
