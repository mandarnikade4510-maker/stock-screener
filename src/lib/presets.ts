import type { FilterConfig, FilterField, FilterOperator, FilterValue } from '@/types/stock';

const f = (field: FilterField, operator: FilterOperator, value: FilterValue): FilterConfig => ({ id: field, field, operator, value, enabled: true });
export interface Preset { name: string; filters: FilterConfig[] }
export const PRESETS: Preset[] = [
  { name: 'Value Stocks', filters: [f('pe', 'lt', 15), f('roe', 'gt', 15), f('debtToEquity', 'lt', 0.5), f('dividendYield', 'gt', 2)] },
  { name: 'Growth Momentum', filters: [f('revenueGrowthYoY', 'gt', 20), f('profitGrowthYoY', 'gt', 20), f('rsi14', 'between', [40, 70]), f('priceVsSma50', 'eq', 'Above')] },
  { name: 'Large Cap Quality', filters: [f('marketCap', 'gt', 20000), f('roce', 'gt', 15), f('promoterHolding', 'gt', 50)] },
  { name: 'Technical Breakout', filters: [f('priceVsSma200', 'eq', 'Above'), f('rsi14', 'between', [50, 70]), f('volumeVsAvg', 'in', ['2x', '3x']), f('bollingerPosition', 'eq', 'Within')] },
];
