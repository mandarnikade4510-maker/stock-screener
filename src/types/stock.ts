export type Sector = 'IT' | 'Banking' | 'Pharma' | 'Auto' | 'FMCG' | 'Metal' | 'Energy' | 'Realty' | 'Telecom' | 'Infrastructure' | 'Media' | 'Others';
export type MarketCapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Micro Cap';

export interface Stock {
  symbol: string; companyName: string; sector: Sector; industry: string;
  marketCapCategory: MarketCapCategory; indexMembership: string[];
  lastPrice: number; previousClose: number; dayOpen: number; dayHigh: number; dayLow: number;
  changePercent: number; changeAbsolute: number; volume: number; avgVolume20D: number;
  week52High: number; week52Low: number; week52HighProximity: number; week52LowProximity: number;
  marketCap: number; // INR crore
  pe: number | null; pb: number; dividendYield: number; eps: number; roe: number; roce: number;
  debtToEquity: number; currentRatio: number; promoterHolding: number; revenueGrowthYoY: number; profitGrowthYoY: number;
  rsi14: number; sma50: number; sma200: number; priceVsSma50: 'Above' | 'Below'; priceVsSma200: 'Above' | 'Below';
  beta: number; atr: number;
  macdSignal: 'Bullish' | 'Bearish' | 'Neutral';
  bollingerPosition: 'Above' | 'Within' | 'Below';
  volumeVsAvg: 'Below' | 'Above' | '2x' | '3x';
}

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }
export interface PriceUpdate { symbol: string; price: number; changePercent: number; volume: number; ts: number }
export interface PriceData { price: number; changePercent: number; volume: number; updatedAt: number }

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'notIn' | 'contains' | 'startsWith';
export type FilterValue = number | string | boolean | number[] | string[];
export type FilterField = keyof Stock | 'watchlist' | 'recentlyUpdated';
export interface FilterConfig {
  id: string; field: FilterField; operator: FilterOperator; value: FilterValue; enabled: boolean;
  /** Configs sharing a group id are combined with OR; everything else is AND. */
  group?: string;
}
export interface SortConfig { column: keyof Stock; direction: 'asc' | 'desc' }
