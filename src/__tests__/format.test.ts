import { describe, it, expect } from 'vitest';
import { formatINR, formatVolume, formatMarketCap, formatPercent } from '@/lib/format';
describe('Indian formatting', () => {
  it('prices use ₹ with lakh grouping', () => expect(formatINR(123456.789)).toBe('₹1,23,456.79'));
  it('volume abbreviations', () => { expect(formatVolume(12000000)).toBe('1.2Cr'); expect(formatVolume(4500000)).toBe('45L'); expect(formatVolume(8000)).toBe('8K'); expect(formatVolume(950)).toBe('950'); });
  it('market cap is shown in crore with Indian commas', () => expect(formatMarketCap(123456)).toBe('₹1,23,456 Cr'));
  it('percent sign handling', () => { expect(formatPercent(1.234)).toBe('+1.23%'); expect(formatPercent(-0.5)).toBe('-0.50%'); });
});
