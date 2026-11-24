'use client';
import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Stock } from '@/types/stock';
import { useStockStore } from '@/stores/stockStore';
import { ChangeCell, MarketCapCell, PriceCell, RSICell, VolumeCell } from './cells';

const ROW_H = 36; const OVERSCAN = 10;
const ch = createColumnHelper<Stock>();
const columns = [
  ch.accessor('symbol', { header: 'Symbol', size: 110, cell: i => <span className="sym">{i.getValue()}</span> }),
  ch.accessor('companyName', { header: 'Company', size: 210 }),
  ch.accessor('sector', { header: 'Sector', size: 120 }),
  ch.accessor('lastPrice', { header: 'LTP', size: 130, cell: i => <PriceCell symbol={i.row.original.symbol} base={i.getValue()} /> }),
  ch.accessor('changePercent', { header: '% Change', size: 120, cell: i => <ChangeCell symbol={i.row.original.symbol} prevClose={i.row.original.previousClose} base={i.getValue()} /> }),
  ch.accessor('volume', { header: 'Volume', size: 100, cell: i => <VolumeCell symbol={i.row.original.symbol} base={i.getValue()} /> }),
  ch.accessor('marketCap', { header: 'Market cap', size: 160, cell: i => <MarketCapCell value={i.getValue()} /> }),
  ch.accessor('pe', { header: 'P/E', size: 80, cell: i => (i.getValue() === null ? '–' : i.getValue()?.toFixed(1)) }),
  ch.accessor('pb', { header: 'P/B', size: 80, cell: i => i.getValue().toFixed(1) }),
  ch.accessor('dividendYield', { header: 'Div %', size: 90, cell: i => i.getValue().toFixed(2) }),
  ch.accessor('roe', { header: 'ROE %', size: 90, cell: i => i.getValue().toFixed(1) }),
  ch.accessor('rsi14', { header: 'RSI', size: 90, cell: i => <RSICell value={i.getValue()} /> }),
  ch.accessor('beta', { header: 'Beta', size: 80, cell: i => i.getValue().toFixed(2) }),
];

export function DataGrid({ stocks }: { stocks: Stock[] }) {
  const sort = useStockStore(s => s.sortConfig); const setSort = useStockStore(s => s.setSortConfig);
  const selected = useStockStore(s => s.selectedSymbol); const select = useStockStore(s => s.setSelectedSymbol);
  const watchlist = useStockStore(s => s.watchlist); const toggleWatch = useStockStore(s => s.toggleWatchlist);
  const table = useReactTable({ data: stocks, columns, getCoreRowModel: getCoreRowModel(), manualSorting: true, enableColumnResizing: true, columnResizeMode: 'onChange' });
  const rows = table.getRowModel().rows; const parent = useRef<HTMLDivElement>(null); const [active, setActive] = useState(0); const [help, setHelp] = useState(false);
  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => parent.current, estimateSize: () => ROW_H, overscan: OVERSCAN });
  const go = useCallback((i: number) => { const n = Math.max(0, Math.min(rows.length - 1, i)); setActive(n); virt.scrollToIndex(n); }, [rows.length, virt]);
  const open = (sym: string) => { select(sym); document.getElementById('chart-region')?.focus(); };
  const cycle = (id: string) => { const cur = sort?.column === id ? sort.direction : null; const next = cur === null ? 'asc' : cur === 'asc' ? 'desc' : null; setSort(next ? { column: id as keyof Stock, direction: next } : null); };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const page = Math.max(1, Math.floor((parent.current?.clientHeight ?? 400) / ROW_H)); const row = rows[active]?.original;
    const handled = (fn: () => void) => { e.preventDefault(); fn(); };
    switch (e.key) {
      case 'ArrowDown': return handled(() => go(active + 1)); case 'ArrowUp': return handled(() => go(active - 1));
      case 'Home': return handled(() => go(0)); case 'End': return handled(() => go(rows.length - 1));
      case 'PageDown': return handled(() => go(active + page)); case 'PageUp': return handled(() => go(active - page));
      case 'Enter': return row ? handled(() => open(row.symbol)) : undefined;
      case ' ': return row ? handled(() => toggleWatch(row.symbol)) : undefined;
      case '?': return handled(() => setHelp(h => !h)); case 'Escape': return setHelp(false);
    }
  };

  return (<div className="grid-wrap">
    <div ref={parent} className="grid-scroll" role="grid" tabIndex={0} aria-label="Stock screener results. Press question mark for keyboard shortcuts." aria-rowcount={rows.length + 1} aria-colcount={columns.length}
      aria-activedescendant={rows[active] ? `row-${rows[active]!.index}` : undefined} onKeyDown={onKey}>
      <div style={{ width: table.getTotalSize(), minWidth: '100%' }}>
        <div className="row head" role="row" aria-rowindex={1}>
          {table.getFlatHeaders().map((h, ci) => (
            <div key={h.id} role="columnheader" aria-sort={sort?.column === h.id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={ci === 0 ? 'cell pin' : 'cell'} style={{ width: h.getSize() }}>
              <button className="th" onClick={() => cycle(h.id)}>{flexRender(h.column.columnDef.header, h.getContext())}{sort?.column === h.id ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}</button>
              <span className="resizer" aria-hidden onMouseDown={h.getResizeHandler()} onTouchStart={h.getResizeHandler()} />
            </div>))}
        </div>
        {rows.length === 0 && <p className="empty">No stocks match these filters. Widen a range or clear all filters.</p>}
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map(vi => { const row = rows[vi.index]!; const sym = row.original.symbol; return (
            <div key={row.id} id={`row-${row.index}`} role="row" aria-rowindex={vi.index + 2} aria-selected={selected === sym}
              className={`row body ${vi.index % 2 ? 'alt' : ''} ${selected === sym ? 'sel' : ''} ${vi.index === active ? 'active' : ''}`}
              style={{ position: 'absolute', top: 0, height: ROW_H, transform: `translateY(${vi.start}px)` }} onClick={() => { setActive(vi.index); select(sym); }} onDoubleClick={() => open(sym)}>
              {row.getVisibleCells().map((c, ci) => (<div key={c.id} role="gridcell" className={ci === 0 ? 'cell pin' : 'cell'} style={{ width: c.column.getSize() }}>
                {ci === 0 && watchlist.includes(sym) && <span aria-label="In watchlist" className="star">★ </span>}{flexRender(c.column.columnDef.cell, c.getContext())}</div>))}
            </div>); })}
        </div>
      </div>
    </div>
    {help && (<div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="modal"><h2>Keyboard shortcuts</h2>
      <dl><dt>↑ ↓</dt><dd>Move the active row</dd><dt>Home / End</dt><dd>First / last row</dd><dt>Page Up / Down</dt><dd>Move one screen</dd><dt>Enter</dt><dd>Open chart for the row</dd><dt>Space</dt><dd>Add or remove from watchlist</dd><dt>?</dt><dd>Show or hide this list</dd></dl>
      <button onClick={() => setHelp(false)}>Close</button></div>)}
  </div>);
}
