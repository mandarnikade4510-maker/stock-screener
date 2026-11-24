import type { PriceUpdate } from '@/types/stock';
import { PriceSimulator, sessionMinutes } from './priceSimulator';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export interface Transport { onopen: (() => void) | null; onclose: (() => void) | null; onmessage: ((data: string) => void) | null; close(): void }
export interface Timers { set(fn: () => void, ms: number): unknown; clear(h: unknown): void }
export interface SocketOptions { baseDelayMs?: number; maxDelayMs?: number; schedule?: (fn: () => void) => void; timers?: Timers }

const defaultSchedule = (fn: () => void) => (typeof requestAnimationFrame === 'function' ? void requestAnimationFrame(fn) : void setTimeout(fn, 16));
const defaultTimers: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: h => clearTimeout(h as ReturnType<typeof setTimeout>) };

function isPriceMessage(m: unknown): m is { type: 'prices'; updates: PriceUpdate[] } {
  return typeof m === 'object' && m !== null && (m as { type?: unknown }).type === 'prices' && Array.isArray((m as { updates?: unknown }).updates);
}

/** Lifecycle + exponential backoff (1s,2s,4s,8s,16s cap) + rAF batching (latest update per symbol wins). */
export class ReconnectingSocket {
  status: ConnectionStatus = 'disconnected'; attempt = 0;
  private transport?: Transport; private manual = false; private timer: unknown; private flushing = false;
  private buffer = new Map<string, PriceUpdate>(); private statusSubs = new Set<(s: ConnectionStatus) => void>(); private updateSubs = new Set<(b: PriceUpdate[]) => void>();
  constructor(private factory: () => Transport, private opts: SocketOptions = {}) {}
  private get timers() { return this.opts.timers ?? defaultTimers; }
  onStatus(cb: (s: ConnectionStatus) => void) { this.statusSubs.add(cb); return () => { this.statusSubs.delete(cb); }; }
  onUpdates(cb: (b: PriceUpdate[]) => void) { this.updateSubs.add(cb); return () => { this.updateSubs.delete(cb); }; }
  private setStatus(s: ConnectionStatus) { this.status = s; this.statusSubs.forEach(cb => cb(s)); }
  nextDelay(): number { return Math.min((this.opts.baseDelayMs ?? 1000) * 2 ** this.attempt, this.opts.maxDelayMs ?? 16000); }
  connect() {
    this.manual = false; this.setStatus(this.attempt > 0 ? 'reconnecting' : 'connecting');
    const t = this.factory(); this.transport = t;
    t.onopen = () => { this.attempt = 0; this.setStatus('connected'); };
    t.onmessage = d => this.handle(d);
    t.onclose = () => { if (this.manual) return; this.transport = undefined; this.scheduleReconnect(); };
  }
  private scheduleReconnect() { this.setStatus('reconnecting'); const d = this.nextDelay(); this.attempt++; this.timer = this.timers.set(() => this.connect(), d); }
  disconnect() { this.manual = true; this.timers.clear(this.timer); this.transport?.close(); this.transport = undefined; this.setStatus('disconnected'); }
  /** Used when the browser comes back online: skip the remaining backoff. */
  reconnectNow() { this.timers.clear(this.timer); this.transport?.close(); this.attempt = 0; this.connect(); }
  private handle(data: string) {
    let msg: unknown; try { msg = JSON.parse(data); } catch { return; }
    if (!isPriceMessage(msg)) return;
    for (const u of msg.updates) this.buffer.set(u.symbol, u);
    if (this.flushing) return; this.flushing = true;
    (this.opts.schedule ?? defaultSchedule)(() => { this.flushing = false; const batch = [...this.buffer.values()]; this.buffer.clear(); this.updateSubs.forEach(cb => cb(batch)); });
  }
}

export interface SimTransport extends Transport { drop(): void }
/** In-browser stand-in for a ws:// server: streams GBM ticks; drop() simulates a network failure. */
export function createSimTransport(sim: PriceSimulator, tickMs = 250): SimTransport {
  let timer: ReturnType<typeof setInterval> | undefined; let closed = false;
  const stop = () => { closed = true; if (timer) clearInterval(timer); };
  const t: SimTransport = { onopen: null, onclose: null, onmessage: null, close: stop, drop() { stop(); t.onclose?.(); } };
  setTimeout(() => {
    if (closed) return; t.onopen?.();
    timer = setInterval(() => { const updates = sim.step(Date.now(), sessionMinutes()); if (updates.length) t.onmessage?.(JSON.stringify({ type: 'prices', updates })); }, tickMs);
  }, 50);
  return t;
}
