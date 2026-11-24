import type { FilterField, Sector } from '@/types/stock';
import { INDUSTRIES, SECTORS } from './mockData';

export type Category = 'Fundamentals' | 'Market Data' | 'Classification' | 'Technical' | 'Custom';
export interface Criterion {
  id: string; field: FilterField; label: string; category: Category;
  kind: 'range' | 'multi' | 'select' | 'boolean'; min?: number; max?: number; step?: number; options?: string[]; unit?: string;
}
const range = (field: FilterField, label: string, category: Category, min: number, max: number, step = 1, unit?: string): Criterion =>
  ({ id: String(field), field, label, category, kind: 'range', min, max, step, unit });
const pick = (field: FilterField, label: string, category: Category, kind: 'multi' | 'select', options: string[]): Criterion =>
  ({ id: String(field), field, label, category, kind, options });

export const ALL_INDUSTRIES = [...new Set(SECTORS.flatMap(s => INDUSTRIES[s as Sector]))];
/** 31 criteria: the 30+ required by the brief (A6.1). */
export const CRITERIA: Criterion[] = [
  range('marketCap', 'Market cap (₹ Cr)', 'Fundamentals', 0, 5000000, 100), range('pe', 'P/E ratio', 'Fundamentals', -100, 500, 0.5),
  range('pb', 'P/B ratio', 'Fundamentals', 0, 100, 0.1), range('dividendYield', 'Dividend yield', 'Fundamentals', 0, 25, 0.1, '%'),
  range('eps', 'EPS (₹)', 'Fundamentals', -500, 5000), range('roe', 'ROE', 'Fundamentals', -100, 200, 0.5, '%'),
  range('roce', 'ROCE', 'Fundamentals', -100, 200, 0.5, '%'), range('debtToEquity', 'Debt to equity', 'Fundamentals', 0, 10, 0.1),
  range('currentRatio', 'Current ratio', 'Fundamentals', 0, 20, 0.1), range('promoterHolding', 'Promoter holding', 'Fundamentals', 0, 100, 1, '%'),
  range('revenueGrowthYoY', 'Revenue growth YoY', 'Fundamentals', -100, 500, 1, '%'), range('profitGrowthYoY', 'Profit growth YoY', 'Fundamentals', -100, 1000, 1, '%'),
  range('lastPrice', 'Last traded price (₹)', 'Market Data', 0, 500000), range('week52HighProximity', '52-week high proximity', 'Market Data', 0, 100, 1, '%'),
  range('week52LowProximity', '52-week low proximity', 'Market Data', 0, 100, 1, '%'), range('avgVolume20D', 'Average volume (20D)', 'Market Data', 0, 100000000, 1000),
  range('beta', 'Beta', 'Market Data', -2, 5, 0.05), range('changePercent', 'Day change', 'Market Data', -20, 20, 0.1, '%'),
  pick('sector', 'Sector', 'Classification', 'multi', SECTORS), pick('industry', 'Industry', 'Classification', 'multi', ALL_INDUSTRIES),
  pick('marketCapCategory', 'Market cap category', 'Classification', 'multi', ['Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap']),
  pick('indexMembership', 'Index membership', 'Classification', 'multi', ['NIFTY 50', 'NIFTY Next 50', 'NIFTY Midcap 100', 'NIFTY Smallcap 250', 'BSE Sensex']),
  range('rsi14', 'RSI (14)', 'Technical', 0, 100, 1), pick('macdSignal', 'MACD signal', 'Technical', 'select', ['Bullish', 'Bearish', 'Neutral']),
  pick('priceVsSma50', 'Price vs SMA 50', 'Technical', 'select', ['Above', 'Below']), pick('priceVsSma200', 'Price vs SMA 200', 'Technical', 'select', ['Above', 'Below']),
  pick('bollingerPosition', 'Bollinger band position', 'Technical', 'select', ['Above', 'Within', 'Below']), range('atr', 'ATR', 'Technical', 0, 500, 0.5),
  pick('volumeVsAvg', 'Volume vs 20D average', 'Technical', 'select', ['Below', 'Above', '2x', '3x']),
  { id: 'watchlist', field: 'watchlist', label: 'Watchlist only', category: 'Custom', kind: 'boolean' },
  { id: 'recentlyUpdated', field: 'recentlyUpdated', label: 'Recently updated (live)', category: 'Custom', kind: 'boolean' },
];
export const CATEGORIES: Category[] = ['Fundamentals', 'Market Data', 'Classification', 'Technical', 'Custom'];
