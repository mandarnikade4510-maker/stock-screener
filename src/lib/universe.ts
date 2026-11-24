import { generateMockStocks } from './mockData';
import type { Stock } from '@/types/stock';
export const UNIVERSE: Stock[] = generateMockStocks(5000);
export const BY_SYMBOL: ReadonlyMap<string, Stock> = new Map(UNIVERSE.map(s => [s.symbol, s]));
