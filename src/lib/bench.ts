import { generateMockStocks } from './mockData'; import { executeFilters, sortStocks } from './filterEngine';
import type { FilterConfig } from '@/types/stock';
const d = generateMockStocks(5000); const c = (id: string, field: FilterConfig['field'], operator: FilterConfig['operator'], value: FilterConfig['value']): FilterConfig => ({ id, field, operator, value, enabled: true });
const filters = [c('a', 'marketCap', 'between', [500, 100000]), c('b', 'pe', 'lt', 40), c('c', 'roe', 'gt', 5), c('d', 'sector', 'in', ['IT', 'Banking', 'Pharma']), c('e', 'beta', 'lt', 1.5)];
const stats = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return `p50=${s[Math.floor(s.length * 0.5)]!.toFixed(2)}ms p95=${s[Math.floor(s.length * 0.95)]!.toFixed(2)}ms max=${s[s.length - 1]!.toFixed(2)}ms`; };
for (const n of [5000, 10000, 20000]) {
  const data = n === 5000 ? d : generateMockStocks(n);
  const f: number[] = [], s: number[] = [];
  for (let i = 0; i < 200; i++) { f.push(executeFilters(data, filters).ms); const t = performance.now(); sortStocks(data, { column: 'marketCap', direction: 'desc' }); s.push(performance.now() - t); }
  console.log(`${String(n).padStart(6)} rows | filter(5 criteria) ${stats(f)} | sort ${stats(s)}`);
}
