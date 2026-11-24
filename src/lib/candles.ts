import type { Candle, Stock } from '@/types/stock';
import { hash, normal, rng } from './random';

const END = Date.UTC(2026, 10, 20); // fixed end date keeps charts deterministic
/** Daily OHLCV for `days` trading days (weekends skipped), scaled so the last close equals lastPrice. */
export function generateCandles(stock: Stock, days = 1260): Candle[] {
  const r = rng(hash(stock.symbol)); const times: number[] = [];
  for (let t = END; times.length < days; t -= 86400000) { const d = new Date(t).getUTCDay(); if (d !== 0 && d !== 6) times.push(t / 1000); }
  times.reverse();
  const out: Candle[] = []; let close = 100; const vol = 0.012 + stock.beta * 0.006;
  for (const time of times) {
    const open = close; close = Math.max(1, open * (1 + normal(r) * vol + 0.0003));
    out.push({ time, open, close, high: Math.max(open, close) * (1 + r() * 0.01), low: Math.min(open, close) * (1 - r() * 0.01), volume: Math.round(stock.avgVolume20D * (0.5 + r())) });
  }
  const k = stock.lastPrice / out[out.length - 1]!.close;
  return out.map(c => ({ ...c, open: c.open * k, high: c.high * k, low: c.low * k, close: c.close * k }));
}
/** Aggregate daily candles into weekly candles (used for the 5Y view). */
export function toWeekly(c: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < c.length; i += 5) {
    const w = c.slice(i, i + 5);
    out.push({ time: w[0]!.time, open: w[0]!.open, close: w[w.length - 1]!.close, high: Math.max(...w.map(x => x.high)), low: Math.min(...w.map(x => x.low)), volume: w.reduce((a, x) => a + x.volume, 0) });
  }
  return out;
}
