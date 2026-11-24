'use client';
import { useMemo } from 'react';
import { useStockStore } from '@/stores/stockStore';
import { UNIVERSE } from '@/lib/universe';
import { executeFilters, sortStocks } from '@/lib/filterEngine';
import type { PriceData, Stock } from '@/types/stock';

const NONE: Record<string, PriceData> = {};
export interface FilteredResult { stocks: Stock[]; total: number; filterMs: number; sortMs: number }
/** Filter -> sort pipeline, memoised. Live prices only invalidate it when the "recently updated" filter is on. */
export function useFilteredStocks(): FilteredResult {
  const filters = useStockStore(s => s.activeFilters); const sort = useStockStore(s => s.sortConfig); const watchlist = useStockStore(s => s.watchlist);
  const needsRecent = filters.some(f => f.enabled && f.field === 'recentlyUpdated');
  const live = useStockStore(s => (needsRecent ? s.livePrices : NONE));
  return useMemo(() => {
    const recent = new Set(Object.entries(live).filter(([, p]) => Date.now() - p.updatedAt < 30000).map(([k]) => k));
    const r = executeFilters(UNIVERSE, filters, { watchlist: new Set(watchlist), recent });
    const t = performance.now(); const stocks = sortStocks(r.stocks, sort);
    return { stocks, total: UNIVERSE.length, filterMs: r.ms, sortMs: performance.now() - t };
  }, [filters, sort, watchlist, live]);
}
