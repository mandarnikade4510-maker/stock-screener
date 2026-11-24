import { describe, it, expect } from 'vitest';
import { ReconnectingSocket, type Transport, type Timers } from '@/lib/socket';
import { PriceSimulator, sessionVolMultiplier } from '@/lib/priceSimulator';
import { generateMockStocks } from '@/lib/mockData';

class FakeTransport implements Transport { onopen: (() => void) | null = null; onclose: (() => void) | null = null; onmessage: ((d: string) => void) | null = null; closed = false; close() { this.closed = true; } }
function harness() {
  const made: FakeTransport[] = []; const timers: Array<{ fn: () => void; ms: number; cleared: boolean }> = []; const frames: Array<() => void> = [];
  const t: Timers = { set: (fn, ms) => { const e = { fn, ms, cleared: false }; timers.push(e); return e; }, clear: h => { if (h) (h as { cleared: boolean }).cleared = true; } };
  const sock = new ReconnectingSocket(() => { const x = new FakeTransport(); made.push(x); return x; }, { timers: t, schedule: fn => { frames.push(fn); } });
  return { sock, made, timers, frames };
}
const msg = (symbol: string, price: number) => JSON.stringify({ type: 'prices', updates: [{ symbol, price, changePercent: 0, volume: 1, ts: 0 }] });

describe('ReconnectingSocket', () => {
  it('connects and reports status', () => { const h = harness(); const seen: string[] = []; h.sock.onStatus(s => seen.push(s)); h.sock.connect(); h.made[0]!.onopen?.(); expect(seen).toEqual(['connecting', 'connected']); });
  it('backs off 1s,2s,4s,8s,16s,16s', () => {
    const h = harness(); h.sock.connect();
    for (let i = 0; i < 6; i++) { h.made[i]!.onclose?.(); const timer = h.timers[i]!; timer.fn(); }
    expect(h.timers.map(t => t.ms)).toEqual([1000, 2000, 4000, 8000, 16000, 16000]);
  });
  it('shows reconnecting then resets backoff after a successful open', () => {
    const h = harness(); h.sock.connect(); h.made[0]!.onclose?.(); expect(h.sock.status).toBe('reconnecting'); h.timers[0]!.fn(); h.made[1]!.onopen?.(); expect(h.sock.status).toBe('connected'); expect(h.sock.attempt).toBe(0);
  });
  it('manual disconnect does not reconnect and cancels the timer', () => { const h = harness(); h.sock.connect(); h.made[0]!.onclose?.(); h.sock.disconnect(); expect(h.timers[0]!.cleared).toBe(true); expect(h.sock.status).toBe('disconnected'); });
  it('batches messages into one flush; latest price per symbol wins', () => {
    const h = harness(); const batches: number[][] = []; h.sock.onUpdates(b => batches.push(b.map(u => u.price))); h.sock.connect();
    h.made[0]!.onmessage?.(msg('A', 1)); h.made[0]!.onmessage?.(msg('A', 2)); h.made[0]!.onmessage?.(msg('B', 5));
    expect(h.frames).toHaveLength(1); h.frames[0]!(); expect(batches).toEqual([[2, 5]]);
  });
  it('ignores malformed messages', () => { const h = harness(); h.sock.connect(); h.made[0]!.onmessage?.('not json'); h.made[0]!.onmessage?.('{"type":"x"}'); expect(h.frames).toHaveLength(0); });
  it('reconnectNow resets attempts (browser back online)', () => { const h = harness(); h.sock.connect(); h.made[0]!.onclose?.(); h.sock.reconnectNow(); expect(h.sock.attempt).toBe(0); expect(h.made).toHaveLength(2); });
});

describe('PriceSimulator', () => {
  const stocks = generateMockStocks(300);
  it('is deterministic for a given seed', () => { const a = new PriceSimulator(stocks, { seed: 1 }).step(5000); const b = new PriceSimulator(stocks, { seed: 1 }).step(5000); expect(a).toEqual(b); });
  it('keeps prices positive over many steps', () => { const s = new PriceSimulator(stocks, { seed: 2 }); for (let t = 0; t < 200; t++) s.step(t * 500).forEach(u => expect(u.price > 0).toBe(true)); });
  it('emits only stocks that are due', () => { const s = new PriceSimulator(stocks, { seed: 3 }); expect(s.step(0).length < stocks.length).toBe(true); expect(s.step(10000).length > 0).toBe(true); });
  it('volatility is U-shaped across the session', () => { expect(sessionVolMultiplier(0) > sessionVolMultiplier(187)).toBe(true); expect(sessionVolMultiplier(375) > sessionVolMultiplier(187)).toBe(true); expect(sessionVolMultiplier(null)).toBe(1); });
});
