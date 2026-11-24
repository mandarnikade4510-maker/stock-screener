import type { Sector, Stock, MarketCapCategory } from '@/types/stock';
import { rng, normal, clamp } from './random';

export const SECTORS: Sector[] = ['IT', 'Banking', 'Pharma', 'Auto', 'FMCG', 'Metal', 'Energy', 'Realty', 'Telecom', 'Infrastructure', 'Media', 'Others'];
export const INDUSTRIES: Record<Sector, string[]> = {
  IT: ['Software Services', 'IT Consulting', 'Product Software'], Banking: ['Private Bank', 'PSU Bank', 'NBFC'],
  Pharma: ['Formulations', 'API', 'Hospitals'], Auto: ['Passenger Vehicles', 'Two Wheelers', 'Auto Components'],
  FMCG: ['Foods', 'Personal Care', 'Beverages'], Metal: ['Steel', 'Aluminium', 'Mining'],
  Energy: ['Oil & Gas', 'Power', 'Renewables'], Realty: ['Residential', 'Commercial'],
  Telecom: ['Carriers', 'Towers'], Infrastructure: ['Construction', 'Ports', 'Cement'],
  Media: ['Broadcasting', 'Publishing'], Others: ['Diversified', 'Textiles', 'Chemicals'],
};
const PROFILE: Record<Sector, { pe: number; beta: number }> = {
  IT: { pe: 25, beta: 0.8 }, Banking: { pe: 18, beta: 1.1 }, Pharma: { pe: 30, beta: 0.7 }, Auto: { pe: 22, beta: 1.0 },
  FMCG: { pe: 45, beta: 0.5 }, Metal: { pe: 12, beta: 1.4 }, Energy: { pe: 14, beta: 0.9 }, Realty: { pe: 28, beta: 1.5 },
  Telecom: { pe: 20, beta: 0.9 }, Infrastructure: { pe: 20, beta: 1.2 }, Media: { pe: 24, beta: 1.1 }, Others: { pe: 20, beta: 1.0 },
};
const WORDS = ['Bharat', 'Indus', 'Ganga', 'Sagar', 'Himalaya', 'Kaveri', 'Deccan', 'Arya', 'Nova', 'Surya', 'Vikram', 'Tara'];
const SUFFIX = ['Ltd', 'Industries', 'Enterprises', 'Limited', 'Corp', 'Global'];

export const categorise = (cr: number): MarketCapCategory =>
  cr >= 50000 ? 'Large Cap' : cr >= 10000 ? 'Mid Cap' : cr >= 500 ? 'Small Cap' : 'Micro Cap';

function indices(rank: number): string[] {
  const o: string[] = [];
  if (rank < 50) o.push('NIFTY 50'); if (rank < 30) o.push('BSE Sensex');
  if (rank >= 50 && rank < 100) o.push('NIFTY Next 50'); if (rank >= 100 && rank < 200) o.push('NIFTY Midcap 100');
  if (rank >= 250 && rank < 500) o.push('NIFTY Smallcap 250');
  return o;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

/** 5,000 correlated records. Rank 0..99 large cap, 100..249 mid cap, rest small/micro (SEBI-style split). */
export function generateMockStocks(count = 5000, seed = 42): Stock[] {
  const r = rng(seed); const out: Stock[] = [];
  for (let i = 0; i < count; i++) {
    const sector = SECTORS[Math.floor(r() * SECTORS.length)]!; const prof = PROFILE[sector];
    const industry = INDUSTRIES[sector][Math.floor(r() * INDUSTRIES[sector].length)]!;
    const marketCap = i < 100 ? Math.round(50000 + r() ** 2 * 1950000) : i < 250 ? Math.round(10000 + r() * 39999) : Math.round(80 + r() ** 2.2 * 9900);
    const large = marketCap >= 50000;
    const price = r2(clamp(Math.exp(3 + r() * 5.2 + (large ? 0.8 : 0)), 8, 90000));
    const changePercent = r2(clamp(normal(r) * 1.6, -12, 12)); const prev = r2(price / (1 + changePercent / 100));
    const open = r2(prev * (1 + normal(r) * 0.003));
    const high52 = r2(price * (1.03 + r() * 0.55)); const low52 = r2(price * (0.45 + r() * 0.5));
    const sma50 = r2(price * (1 + normal(r) * 0.05)); const sma200 = r2(price * (1 + normal(r) * 0.1));
    const avgVol = Math.round(1e5 + r() ** 2 * 3e7 * (large ? 1 : 0.4));
    const vr = r(); const volMult = vr < 0.5 ? 0.4 + r() * 0.55 : vr < 0.8 ? 1.05 + r() * 0.9 : vr < 0.95 ? 2 + r() : 3 + r() * 2;
    const roe = r2(clamp(10 + normal(r) * 9, -30, 60)); const bank = sector === 'Banking';
    const mr = r();
    out.push({
      symbol: `${sector.slice(0, 2).toUpperCase()}${i.toString(36).toUpperCase().padStart(3, '0')}`,
      companyName: `${WORDS[i % WORDS.length]} ${industry.split(' ')[0]} ${SUFFIX[(i >> 3) % SUFFIX.length]}`,
      sector, industry, marketCapCategory: categorise(marketCap), indexMembership: indices(i),
      lastPrice: price, previousClose: prev, dayOpen: open, dayHigh: r2(Math.max(price, open) * (1 + r() * 0.01)), dayLow: r2(Math.min(price, open) * (1 - r() * 0.01)),
      changePercent, changeAbsolute: r2(price - prev), volume: Math.round(avgVol * volMult), avgVolume20D: avgVol,
      week52High: high52, week52Low: low52, week52HighProximity: r2((price / high52) * 100), week52LowProximity: r2(clamp((low52 / price) * 100, 0, 100)),
      marketCap, pe: r() < 0.06 ? null : r2(clamp(prof.pe * (0.4 + r() * 1.4), 2, 300)),
      pb: r2(clamp(0.5 + r() * 9, 0.2, 40)), dividendYield: r2(clamp(r() ** 2 * 5.5, 0, 12)), eps: r2(normal(r) * 40 + 30),
      roe, roce: r2(clamp(roe * (0.9 + r() * 0.5), -30, 80)), debtToEquity: r2(bank ? 5 + r() * 7 : r() ** 1.5 * 2.5),
      currentRatio: r2(0.6 + r() * 3), promoterHolding: r2(clamp((large ? 52 : 45) + normal(r) * 14, 20, 90)),
      revenueGrowthYoY: r2(10 + normal(r) * 14), profitGrowthYoY: r2(10 + normal(r) * 28),
      rsi14: r2(clamp(50 + normal(r) * 15, 5, 95)), sma50, sma200,
      priceVsSma50: price >= sma50 ? 'Above' : 'Below', priceVsSma200: price >= sma200 ? 'Above' : 'Below',
      beta: r2(clamp(prof.beta + (large ? -0.15 : 0.2) + normal(r) * 0.25, 0.1, 2.6)), atr: r2(price * (0.01 + r() * 0.03)),
      macdSignal: mr < 0.3 ? 'Bullish' : mr < 0.6 ? 'Bearish' : 'Neutral',
      bollingerPosition: (() => { const b = r(); return b < 0.1 ? 'Above' : b < 0.2 ? 'Below' : 'Within'; })(),
      volumeVsAvg: volMult < 1 ? 'Below' : volMult < 2 ? 'Above' : volMult < 3 ? '2x' : '3x',
    });
  }
  return out;
}
