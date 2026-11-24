import { describe, it, expect } from 'vitest';
import { sma, ema, bollinger, rsi, volumeProfile } from '@/lib/indicators';
import type { Candle } from '@/types/stock';

const closes = [100, 102, 104, 103, 105, 107, 106, 108, 110, 109];
const near = (a: Array<number | null>, b: number[]) => b.forEach((x, i) => expect(Math.abs((a[i] as number) - x) < 0.01).toBe(true));

describe('indicators (brief appendix B verification data)', () => {
  it('SMA(5) matches the brief', () => near(sma(closes, 5).slice(4), [102.8, 104.2, 105.0, 105.8, 107.2, 108.0]));
  it('SMA is null before index n-1', () => expect(sma(closes, 5).slice(0, 4)).toEqual([null, null, null, null]));
  it('EMA(5) is seeded by SMA at index 4', () => expect(Math.abs((ema(closes, 5)[4] as number) - 102.8) < 0.01).toBe(true));
  it('EMA(5) at index 5 is 104.2', () => expect(Math.abs((ema(closes, 5)[5] as number) - 104.2) < 0.01).toBe(true));
  it('Bollinger collapses on a constant series', () => { const b = bollinger(Array(25).fill(50), 20); expect(b.upper[24]).toBe(50); expect(b.lower[24]).toBe(50); });
  it('Bollinger uses population stdev', () => { const b = bollinger(Array.from({ length: 20 }, (_, i) => i + 1), 20); expect(Math.abs((b.upper[19] as number) - 22.033) < 0.01).toBe(true); expect(b.middle[19]).toBe(10.5); });
  it('RSI is 100 for a monotonic rise (AvgLoss = 0)', () => expect(rsi(Array.from({ length: 30 }, (_, i) => i + 1), 14)[29]).toBe(100));
  it('RSI is 0 for a monotonic fall (AvgGain = 0)', () => expect(rsi(Array.from({ length: 30 }, (_, i) => 30 - i), 14)[29]).toBe(0));
  it('RSI stays within 0..100 on noisy data', () => rsi(Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i) * 5 + i * 0.1)).forEach(v => { if (v !== null) { expect(v >= 0 && v <= 100).toBe(true); } }));
  it('RSI first value appears at index n', () => { const r = rsi(Array.from({ length: 20 }, (_, i) => i), 14); expect(r[13]).toBeNull(); expect(r[14]).not.toBeNull(); });
  it('Volume profile conserves total volume', () => {
    const c: Candle[] = [{ time: 1, open: 10, close: 12, low: 9, high: 13, volume: 1000 }, { time: 2, open: 12, close: 11, low: 10, high: 14, volume: 500 }, { time: 3, open: 11, close: 11, low: 11, high: 11, volume: 200 }];
    expect(Math.abs(volumeProfile(c, 10).reduce((a, b) => a + b.volume, 0) - 1700) < 1e-6).toBe(true);
  });
  it('Volume profile returns [] for no candles', () => expect(volumeProfile([])).toEqual([]));
});
