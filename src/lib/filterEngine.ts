import type { FilterConfig, FilterOperator, FilterValue, SortConfig, Stock } from '@/types/stock';

export interface FilterContext { watchlist: ReadonlySet<string>; recent: ReadonlySet<string> }
export type Predicate = (s: Stock) => boolean;
export type FilterNode = { type: 'leaf'; config: FilterConfig } | { type: 'and' | 'or'; children: FilterNode[] };
export const EMPTY_CTX: FilterContext = { watchlist: new Set(), recent: new Set() };

/** 1. Parse: UI config list -> AST. Configs sharing a `group` become one OR node under the root AND. */
export function parseFilters(configs: FilterConfig[]): FilterNode {
  const root: FilterNode[] = []; const groups = new Map<string, FilterNode[]>();
  for (const config of configs) {
    if (!config.enabled) continue;
    const leaf: FilterNode = { type: 'leaf', config };
    if (config.group) groups.set(config.group, [...(groups.get(config.group) ?? []), leaf]); else root.push(leaf);
  }
  for (const leaves of groups.values()) root.push(leaves.length === 1 ? leaves[0]! : { type: 'or', children: leaves });
  return { type: 'and', children: root };
}

/** Operator semantics. Null values never satisfy numeric comparisons. */
export function testValue(v: unknown, op: FilterOperator, value: FilterValue): boolean {
  switch (op) {
    case 'eq': return v === value;
    case 'neq': return v !== value;
    case 'gt': return typeof v === 'number' && typeof value === 'number' && v > value;
    case 'gte': return typeof v === 'number' && typeof value === 'number' && v >= value;
    case 'lt': return typeof v === 'number' && typeof value === 'number' && v < value;
    case 'lte': return typeof v === 'number' && typeof value === 'number' && v <= value;
    case 'between': return typeof v === 'number' && Array.isArray(value) && v >= Number(value[0]) && v <= Number(value[1]);
    case 'in': { if (!Array.isArray(value)) return false; const set = value as unknown[]; return Array.isArray(v) ? v.some(x => set.includes(x)) : set.includes(v); }
    case 'notIn': return !testValue(v, 'in', value);
    case 'contains': return v != null && String(v).toLowerCase().includes(String(value).toLowerCase());
    case 'startsWith': return v != null && String(v).toLowerCase().startsWith(String(value).toLowerCase());
  }
}

function compile(node: FilterNode, ctx: FilterContext): Predicate {
  if (node.type === 'leaf') {
    const { field, operator, value } = node.config;
    if (field === 'watchlist' || field === 'recentlyUpdated') {
      const set = field === 'watchlist' ? ctx.watchlist : ctx.recent; const want = value !== false;
      return s => set.has(s.symbol) === want;
    }
    return s => testValue(s[field], operator, value);
  }
  const preds = node.children.map(c => compile(c, ctx));
  if (node.type === 'or') return s => { for (const p of preds) if (p(s)) return true; return false; };
  return s => { for (const p of preds) if (!p(s)) return false; return true; };
}

/** 2. Optimise: order predicates by pass-rate on a stride sample, most restrictive first. */
export function orderBySelectivity(preds: Predicate[], stocks: Stock[], sampleSize = 256): Predicate[] {
  if (preds.length < 2 || stocks.length === 0) return preds;
  const stride = Math.max(1, Math.floor(stocks.length / sampleSize)); const sample: Stock[] = [];
  for (let i = 0; i < stocks.length; i += stride) sample.push(stocks[i]!);
  return preds.map(p => ({ p, rate: sample.filter(p).length / sample.length })).sort((a, b) => a.rate - b.rate).map(x => x.p);
}

export interface FilterResult { stocks: Stock[]; ms: number }
/** 3. Execute with short-circuit AND evaluation. Timed with performance.now(). */
export function executeFilters(stocks: Stock[], configs: FilterConfig[], ctx: FilterContext = EMPTY_CTX): FilterResult {
  const t0 = performance.now(); const ast = parseFilters(configs);
  if (ast.type === 'leaf' || ast.children.length === 0) return { stocks, ms: performance.now() - t0 };
  const preds = orderBySelectivity(ast.children.map(c => compile(c, ctx)), stocks); const out: Stock[] = [];
  outer: for (let i = 0; i < stocks.length; i++) { const s = stocks[i]!; for (let j = 0; j < preds.length; j++) if (!preds[j]!(s)) continue outer; out.push(s); }
  return { stocks: out, ms: performance.now() - t0 };
}

/** 4. Stable sort; nulls always last. */
export function sortStocks(stocks: Stock[], sort: SortConfig | null): Stock[] {
  if (!sort) return stocks; const dir = sort.direction === 'asc' ? 1 : -1;
  return stocks.map((s, i) => ({ s, i })).sort((a, b) => {
    const x = a.s[sort.column], y = b.s[sort.column];
    if (x == null && y == null) return a.i - b.i; if (x == null) return 1; if (y == null) return -1;
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return c !== 0 ? c * dir : a.i - b.i;
  }).map(e => e.s);
}
