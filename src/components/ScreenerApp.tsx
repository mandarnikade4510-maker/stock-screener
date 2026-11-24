'use client';
import { lazy, Suspense, useState } from 'react';
import { DataGrid } from './DataGrid';
import { FilterPanel } from './FilterPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { ConnectionStatus } from './ConnectionStatus';
import { useFilteredStocks } from '@/hooks/useFilteredStocks';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useStockStore } from '@/stores/stockStore';

// Code-split: the charting library loads only when the chart region mounts.
const StockChart = lazy(() => import('./StockChart'));

export function ScreenerApp() {
  const { stocks, total, filterMs, sortMs } = useFilteredStocks(); const status = useWebSocket(); const online = useOnlineStatus();
  const symbol = useStockStore(s => s.selectedSymbol); const batchMs = useStockStore(s => s.lastBatchMs); const batchSize = useStockStore(s => s.lastBatchSize);
  const [collapsed, setCollapsed] = useState(false); const [view, setView] = useState<'grid' | 'chart'>('grid'); const [full, setFull] = useState(false);
  return (<div className="app">
    <header className="top"><h1>Equity Screener</h1><ConnectionStatus status={status} />
      <span className="perf" title="Measured in your browser">filter {filterMs.toFixed(1)} ms · sort {sortMs.toFixed(1)} ms · last batch {batchSize} ticks in {batchMs.toFixed(1)} ms</span></header>
    {!online && <div role="alert" className="offline">Working offline - prices may be stale</div>}
    <div className="tabs" role="tablist" aria-label="View">{(['grid', 'chart'] as const).map(v => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{v === 'grid' ? 'Screener' : 'Chart'}</button>)}</div>
    <div className={`layout ${collapsed ? 'is-collapsed' : ''} ${full ? 'is-full' : ''} view-${view}`}>
      <ErrorBoundary name="filter panel"><FilterPanel shown={stocks.length} total={total} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}><FilterPanel.Sections /></FilterPanel></ErrorBoundary>
      <section className="pane grid-pane" aria-label="Results"><ErrorBoundary name="data grid"><DataGrid stocks={stocks} /></ErrorBoundary></section>
      <section id="chart-region" tabIndex={-1} className="pane chart-pane" aria-label="Chart"><button className="full" onClick={() => setFull(f => !f)}>{full ? 'Show grid' : 'Full-screen chart'}</button>
        <ErrorBoundary name="chart"><Suspense fallback={<p className="empty">Loading chart…</p>}>{symbol ? <StockChart key={symbol} symbol={symbol} /> : <p className="empty">Select a stock to see its chart.</p>}</Suspense></ErrorBoundary></section>
    </div></div>);
}
