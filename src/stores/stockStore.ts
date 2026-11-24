import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { FilterConfig, PriceData, PriceUpdate, SortConfig } from '@/types/stock';
import { UNIVERSE } from '@/lib/universe';

interface StockStore {
  activeFilters: FilterConfig[];
  upsertFilter: (f: FilterConfig) => void; addFilter: (f: FilterConfig) => void; removeFilter: (id: string) => void;
  setFilters: (f: FilterConfig[]) => void; clearAllFilters: () => void;
  sortConfig: SortConfig | null; setSortConfig: (c: SortConfig | null) => void;
  selectedSymbol: string | null; setSelectedSymbol: (s: string | null) => void;
  livePrices: Record<string, PriceData>; lastBatchMs: number; lastBatchSize: number;
  batchUpdatePrices: (u: PriceUpdate[]) => void;
  watchlist: string[]; toggleWatchlist: (s: string) => void;
}
export const useStockStore = create<StockStore>()(devtools(persist((set, get) => ({
  activeFilters: [],
  upsertFilter: f => set(s => ({ activeFilters: [...s.activeFilters.filter(x => x.id !== f.id), f] })),
  addFilter: f => get().upsertFilter(f),
  removeFilter: id => set(s => ({ activeFilters: s.activeFilters.filter(f => f.id !== id) })),
  setFilters: activeFilters => set({ activeFilters }),
  clearAllFilters: () => set({ activeFilters: [] }),
  sortConfig: { column: 'marketCap', direction: 'desc' }, setSortConfig: sortConfig => set({ sortConfig }),
  selectedSymbol: UNIVERSE[0]?.symbol ?? null, setSelectedSymbol: selectedSymbol => set({ selectedSymbol }),
  livePrices: {}, lastBatchMs: 0, lastBatchSize: 0,
  // One set() per batch: a single store commit per animation frame.
  batchUpdatePrices: updates => {
    const t0 = performance.now(); const next = { ...get().livePrices }; const now = Date.now();
    for (const u of updates) next[u.symbol] = { price: u.price, changePercent: u.changePercent, volume: u.volume, updatedAt: now };
    set({ livePrices: next, lastBatchMs: performance.now() - t0, lastBatchSize: updates.length });
  },
  watchlist: [], toggleWatchlist: sym => set(s => ({ watchlist: s.watchlist.includes(sym) ? s.watchlist.filter(x => x !== sym) : [...s.watchlist, sym] })),
}), { name: 'stock-store', partialize: s => ({ watchlist: s.watchlist }) }), { enabled: process.env.NODE_ENV !== 'production' }));
