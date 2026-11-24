import type { Candle } from '@/types/stock';
export type Series = Array<number | null>;

/** SMA(n,t) = mean of the last n closes; null before index n-1. */
export function sma(closes: number[], n: number): Series {
  const o: Series = []; let sum = 0;
  for (let i = 0; i < closes.length; i++) { sum += closes[i]!; if (i >= n) sum -= closes[i - n]!; o.push(i >= n - 1 ? sum / n : null); }
  return o;
}
/** EMA seeded with SMA(n) at index n-1, then EMA = close*k + prev*(1-k), k = 2/(n+1). */
export function ema(closes: number[], n: number): Series {
  const k = 2 / (n + 1); const o: Series = []; let prev = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i < n - 1) { o.push(null); continue; }
    if (i === n - 1) prev = closes.slice(0, n).reduce((a, b) => a + b, 0) / n; else prev = closes[i]! * k + prev * (1 - k);
    o.push(prev);
  }
  return o;
}
/** Bollinger Bands with population standard deviation (divide by n). */
export function bollinger(closes: number[], n = 20, mult = 2): { upper: Series; middle: Series; lower: Series } {
  const middle = sma(closes, n); const upper: Series = [], lower: Series = [];
  for (let i = 0; i < closes.length; i++) {
    const m = middle[i];
    if (m === null || m === undefined) { upper.push(null); lower.push(null); continue; }
    let sq = 0; for (let j = i - n + 1; j <= i; j++) sq += (closes[j]! - m) ** 2;
    const sd = Math.sqrt(sq / n); upper.push(m + mult * sd); lower.push(m - mult * sd);
  }
  return { upper, middle, lower };
}
/** Wilder RSI. First average is a simple mean of n changes, then smoothed. AvgLoss = 0 gives 100. */
export function rsi(closes: number[], n = 14): Series {
  const o: Series = closes.map(() => null); if (closes.length <= n) return o;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = closes[i]! - closes[i - 1]!; g += Math.max(d, 0); l += Math.max(-d, 0); }
  g /= n; l /= n;
  const calc = () => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  o[n] = calc();
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = calc();
  }
  return o;
}
export interface ProfileBucket { price: number; volume: number }
/** Volume distributed across price buckets in proportion to each candle's Low-High overlap. */
export function volumeProfile(candles: Candle[], buckets = 40): ProfileBucket[] {
  if (candles.length === 0) return [];
  const lo = Math.min(...candles.map(c => c.low)); const hi = Math.max(...candles.map(c => c.high));
  const size = (hi - lo) / buckets || 1; const vols = new Array<number>(buckets).fill(0);
  for (const c of candles) {
    const span = c.high - c.low;
    if (span === 0) { vols[Math.min(buckets - 1, Math.floor((c.low - lo) / size))]! += c.volume; continue; }
    const a = Math.min(buckets - 1, Math.floor((c.low - lo) / size)); const b = Math.min(buckets - 1, Math.floor((c.high - lo) / size));
    for (let k = a; k <= b; k++) { const overlap = Math.min(c.high, lo + (k + 1) * size) - Math.max(c.low, lo + k * size); if (overlap > 0) vols[k]! += c.volume * (overlap / span); }
  }
  return vols.map((volume, k) => ({ price: lo + (k + 0.5) * size, volume }));
}
/** Pair a value series with candle times for charting (drops nulls). */
export const toLine = (c: Candle[], s: Series) => c.flatMap((x, i) => (s[i] === null || s[i] === undefined ? [] : [{ time: x.time, value: s[i] as number }]));
