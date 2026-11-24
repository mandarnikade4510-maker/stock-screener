import type { PriceUpdate, Sector, Stock } from '@/types/stock';
import { normal, rng } from './random';

/** U-shaped intraday volatility: high near the 09:15 open and 15:30 close, low mid-session. */
export function sessionVolMultiplier(minutesSinceOpen: number | null): number {
  if (minutesSinceOpen === null) return 1;
  const m = Math.min(375, Math.max(0, minutesSinceOpen));
  return 1 + 1.2 * (Math.exp(-m / 40) + Math.exp(-(375 - m) / 40));
}
/** Minutes since 09:15 IST inside the NSE session, else null. */
export function sessionMinutes(now = new Date()): number | null {
  const ist = new Date(now.getTime() + 5.5 * 3600000); const d = ist.getUTCDay();
  const m = ist.getUTCHours() * 60 + ist.getUTCMinutes() - (9 * 60 + 15);
  return d === 0 || d === 6 || m < 0 || m > 375 ? null : m;
}

interface Track { s: Stock; price: number; vol: number; next: number; sigma: number }
export interface SimOptions { seed?: number; rho?: number; meanIntervalMs?: number; timeScale?: number }
/** Geometric Brownian motion: S' = S*exp((mu - s^2/2)dt + s*sqrt(dt)*Z), Z blended with a per-sector shock. */
export class PriceSimulator {
  private tracks: Track[]; private r: () => number; private rho: number; private interval: number; private scale: number;
  constructor(stocks: Stock[], opts: SimOptions = {}) {
    this.r = rng(opts.seed ?? 7); this.rho = opts.rho ?? 0.5; this.interval = opts.meanIntervalMs ?? 2000; this.scale = opts.timeScale ?? 500;
    this.tracks = stocks.map(s => ({ s, price: s.lastPrice, vol: s.volume, sigma: 0.2 + s.beta * 0.15, next: this.r() * this.interval }));
  }
  step(nowMs: number, minutes: number | null = null): PriceUpdate[] {
    const shocks = new Map<Sector, number>(); const out: PriceUpdate[] = []; const vm = sessionVolMultiplier(minutes);
    for (const t of this.tracks) {
      if (t.next > nowMs) continue;
      let zs = shocks.get(t.s.sector); if (zs === undefined) { zs = normal(this.r); shocks.set(t.s.sector, zs); }
      const z = (this.rho * zs + Math.sqrt(1 - this.rho ** 2) * normal(this.r)) * vm;
      const dt = (this.interval * this.scale) / (252 * 6.25 * 3600 * 1000);
      t.price = Math.max(0.05, Math.round(t.price * Math.exp((0.08 - 0.5 * t.sigma ** 2) * dt + t.sigma * Math.sqrt(dt) * z) * 100) / 100);
      t.vol += Math.round(t.s.avgVolume20D * 0.0002 * (0.5 + this.r()));
      t.next = nowMs + this.interval * (0.5 + this.r());
      out.push({ symbol: t.s.symbol, price: t.price, changePercent: (t.price / t.s.previousClose - 1) * 100, volume: t.vol, ts: nowMs });
    }
    return out;
  }
}
