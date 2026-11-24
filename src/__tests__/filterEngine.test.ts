import { describe, it, expect } from 'vitest';
import { executeFilters, parseFilters, testValue, sortStocks, orderBySelectivity } from '@/lib/filterEngine';
import { generateMockStocks } from '@/lib/mockData';
import { PRESETS } from '@/lib/presets';
import { CRITERIA } from '@/lib/criteria';
import type { FilterConfig } from '@/types/stock';

const stocks = generateMockStocks(5000);
const cfg = (id: string, field: FilterConfig['field'], operator: FilterConfig['operator'], value: FilterConfig['value'], extra: Partial<FilterConfig> = {}): FilterConfig => ({ id, field, operator, value, enabled: true, ...extra });

describe('operators', () => {
  it('eq / neq', () => { expect(testValue('IT', 'eq', 'IT')).toBe(true); expect(testValue('IT', 'neq', 'IT')).toBe(false); });
  it('gt/gte/lt/lte boundaries', () => { expect(testValue(5, 'gt', 5)).toBe(false); expect(testValue(5, 'gte', 5)).toBe(true); expect(testValue(5, 'lt', 5)).toBe(false); expect(testValue(5, 'lte', 5)).toBe(true); });
  it('between is inclusive', () => { expect(testValue(10, 'between', [10, 20])).toBe(true); expect(testValue(20, 'between', [10, 20])).toBe(true); expect(testValue(21, 'between', [10, 20])).toBe(false); });
  it('in / notIn, including array-valued fields', () => { expect(testValue('IT', 'in', ['IT', 'FMCG'])).toBe(true); expect(testValue(['NIFTY 50'], 'in', ['NIFTY 50', 'BSE Sensex'])).toBe(true); expect(testValue('IT', 'notIn', ['IT'])).toBe(false); });
  it('contains / startsWith are case-insensitive', () => { expect(testValue('Bharat Software', 'contains', 'SOFT')).toBe(true); expect(testValue('Bharat', 'startsWith', 'bh')).toBe(true); });
  it('null never satisfies numeric comparisons', () => { for (const op of ['gt', 'gte', 'lt', 'lte'] as const) expect(testValue(null, op, 0)).toBe(false); expect(testValue(null, 'between', [-1e9, 1e9])).toBe(false); });
});

describe('engine', () => {
  it('has 30+ criteria', () => expect(CRITERIA.length >= 30).toBe(true));
  it('mock universe has 5000 stocks incl. null P/E and ~100 large caps', () => { expect(stocks).toHaveLength(5000); expect(stocks.some(s => s.pe === null)).toBe(true); expect(stocks.filter(s => s.marketCapCategory === 'Large Cap').length >= 90).toBe(true); });
  it('disabled filters are ignored', () => expect(executeFilters(stocks, [cfg('a', 'pe', 'lt', 1, { enabled: false })]).stocks).toHaveLength(5000));
  it('combines 3+ criteria with AND', () => {
    const r = executeFilters(stocks, [cfg('a', 'sector', 'in', ['IT']), cfg('b', 'roe', 'gt', 10), cfg('c', 'beta', 'lt', 1)]).stocks;
    expect(r.length > 0).toBe(true); expect(r.every(s => s.sector === 'IT' && s.roe > 10 && s.beta < 1)).toBe(true);
    expect(r).toHaveLength(stocks.filter(s => s.sector === 'IT' && s.roe > 10 && s.beta < 1).length);
  });
  it('OR groups: same group id means any-of', () => {
    const r = executeFilters(stocks, [cfg('a', 'sector', 'eq', 'IT', { group: 'g' }), cfg('b', 'sector', 'eq', 'Pharma', { group: 'g' }), cfg('c', 'roe', 'gt', 15)]).stocks;
    expect(r).toHaveLength(stocks.filter(s => (s.sector === 'IT' || s.sector === 'Pharma') && s.roe > 15).length);
  });
  it('parse builds an AND root with an OR child', () => { const ast = parseFilters([cfg('a', 'pe', 'lt', 9, { group: 'g' }), cfg('b', 'pb', 'lt', 2, { group: 'g' }), cfg('c', 'roe', 'gt', 1)]); expect(ast.type).toBe('and'); if (ast.type !== 'leaf') expect(ast.children.map(c => c.type).sort()).toEqual(['leaf', 'or']); });
  it('watchlist filter uses context', () => { const wl = new Set([stocks[3]!.symbol, stocks[9]!.symbol]); expect(executeFilters(stocks, [cfg('w', 'watchlist', 'eq', true)], { watchlist: wl, recent: new Set() }).stocks).toHaveLength(2); });
  it('selectivity ordering puts the most restrictive predicate first', () => {
    const calls: string[] = []; const loose = () => { calls.push('loose'); return true; }; const tight = () => { calls.push('tight'); return false; };
    const ordered = orderBySelectivity([loose, tight], stocks); ordered[0]!(stocks[0]!); expect(calls[calls.length - 1]).toBe('tight');
  });
  it('short-circuits: result is empty when one filter excludes everything', () => expect(executeFilters(stocks, [cfg('a', 'pe', 'lt', -1e9), cfg('b', 'roe', 'gt', 0)]).stocks).toHaveLength(0));
  it('PERF: 5 simultaneous filters over 5,000 rows in < 200 ms', () => {
    const f = [cfg('a', 'marketCap', 'between', [500, 100000]), cfg('b', 'pe', 'lt', 40), cfg('c', 'roe', 'gt', 5), cfg('d', 'sector', 'in', ['IT', 'Banking', 'Pharma']), cfg('e', 'beta', 'lt', 1.5)];
    const best = Math.min(...[0, 1, 2, 3, 4].map(() => executeFilters(stocks, f).ms)); expect(best < 200).toBe(true);
  });
});

describe('presets match hand-written predicates', () => {
  const by = (name: string) => PRESETS.find(p => p.name === name)!.filters;
  it('Value Stocks', () => expect(executeFilters(stocks, by('Value Stocks')).stocks).toHaveLength(stocks.filter(s => s.pe !== null && s.pe < 15 && s.roe > 15 && s.debtToEquity < 0.5 && s.dividendYield > 2).length));
  it('Large Cap Quality', () => expect(executeFilters(stocks, by('Large Cap Quality')).stocks).toHaveLength(stocks.filter(s => s.marketCap > 20000 && s.roce > 15 && s.promoterHolding > 50).length));
  it('Technical Breakout', () => expect(executeFilters(stocks, by('Technical Breakout')).stocks).toHaveLength(stocks.filter(s => s.priceVsSma200 === 'Above' && s.rsi14 >= 50 && s.rsi14 <= 70 && (s.volumeVsAvg === '2x' || s.volumeVsAvg === '3x') && s.bollingerPosition === 'Within').length));
});

describe('sort', () => {
  it('sorts desc and keeps nulls last', () => { const s = sortStocks(stocks, { column: 'pe', direction: 'desc' }); const firstNull = s.findIndex(x => x.pe === null); expect(s.slice(firstNull).every(x => x.pe === null)).toBe(true); });
  it('is stable for equal keys', () => { const s = sortStocks(stocks, { column: 'sector', direction: 'asc' }); const it = s.filter(x => x.sector === 'IT').map(x => x.symbol); expect(it).toEqual(stocks.filter(x => x.sector === 'IT').map(x => x.symbol)); });
  it('PERF: sort 5,000 rows in < 150 ms', () => { const t = performance.now(); sortStocks(stocks, { column: 'marketCap', direction: 'desc' }); expect(performance.now() - t < 150).toBe(true); });
});
