# Architecture

## Component hierarchy
```mermaid
graph TD
  Layout[app/layout.tsx - Server] --> Page[app/screener/page.tsx - Server]
  Page --> App[ScreenerApp - Client]
  App --> EB1[ErrorBoundary: filter panel] --> FP[FilterPanel compound]
  FP --> Sections --> Range & MultiSelect & Select & Boolean
  App --> EB2[ErrorBoundary: data grid] --> Grid[DataGrid: TanStack Table + Virtual]
  Grid --> Cells[PriceCell / ChangeCell / VolumeCell / MarketCapCell / RSICell]
  App --> EB3[ErrorBoundary: chart] --> Susp[Suspense] --> Chart[StockChart: lazy, lightweight-charts]
  App --> Conn[ConnectionStatus]
```

## State and data flow
```mermaid
graph LR
  Gen[mockData.generateMockStocks - seeded] --> U[UNIVERSE 5,000]
  U --> F[useFilteredStocks: executeFilters then sortStocks, memoised]
  Store[(Zustand: filters, sort, selection, watchlist, livePrices)] --> F
  F --> Grid
  Sim[PriceSimulator - GBM] --> T[SimTransport] --> RS[ReconnectingSocket: backoff + rAF batching] --> Store
  Store -- per-symbol selector --> Cells
  Store -- livePrices[symbol] --> Chart
```
Static fundamentals are filtered once per filter change. Live prices never re-run the filter pipeline; each price cell subscribes to its own symbol, so a tick re-renders one cell.

## Filter pipeline (lib/filterEngine.ts)
Parse (config list to AND/OR AST) -> Optimise (order by sampled pass-rate) -> Execute (short-circuit) -> Sort (stable, nulls last).

## Decision log
| Choice | Why |
|---|---|
| Zustand without immer | Prices are held in a plain record and replaced once per batch; immer adds proxy cost on the hottest path. |
| livePrices separate from the stock array | Avoids copying and re-filtering 5,000 rows on every tick. |
| Per-cell store selectors | Only the changed cell re-renders (brief task 5.3). |
| Pure indicator functions on number[] | Testable with the brief's verification data, independent of the UI. |
| Injected timers/scheduler in ReconnectingSocket | Backoff and batching are testable without fake-timer libraries. |
| lazy() + Suspense for the chart | Keeps lightweight-charts out of the initial bundle. |
