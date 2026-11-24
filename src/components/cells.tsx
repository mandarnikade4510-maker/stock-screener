'use client';
import { memo, useEffect, useRef } from 'react';
import { useStockStore } from '@/stores/stockStore';
import { formatINR, formatMarketCap, formatPercent, formatVolume } from '@/lib/format';

/** Each cell subscribes to its own symbol only, so a tick re-renders one cell, not the row or the grid. */
export const PriceCell = memo(function PriceCell({ symbol, base }: { symbol: string; base: number }) {
  const live = useStockStore(s => s.livePrices[symbol]?.price); const price = live ?? base; const prev = useRef(price);
  const dir = price > prev.current ? 'up' : price < prev.current ? 'down' : '';
  useEffect(() => { prev.current = price; }, [price]);
  return <span key={price} className={dir ? `flash-${dir}` : undefined}>{formatINR(price)}</span>;
}, (a, b) => a.symbol === b.symbol && a.base === b.base);

export const ChangeCell = memo(function ChangeCell({ symbol, prevClose, base }: { symbol: string; prevClose: number; base: number }) {
  const live = useStockStore(s => s.livePrices[symbol]?.price); const v = live === undefined ? base : (live / prevClose - 1) * 100;
  return <span className={v >= 0 ? 'up' : 'down'}>{v >= 0 ? '▲' : '▼'} {formatPercent(v)}</span>;
}, (a, b) => a.symbol === b.symbol && a.base === b.base && a.prevClose === b.prevClose);

export const VolumeCell = memo(function VolumeCell({ symbol, base }: { symbol: string; base: number }) {
  const live = useStockStore(s => s.livePrices[symbol]?.volume); return <span>{formatVolume(live ?? base)}</span>;
}, (a, b) => a.symbol === b.symbol && a.base === b.base);

export const MarketCapCell = memo(function MarketCapCell({ value }: { value: number }) { return <span>{formatMarketCap(value)}</span>; }, (a, b) => a.value === b.value);
export const RSICell = memo(function RSICell({ value }: { value: number }) {
  return <span className={`rsi ${value < 30 ? 'rsi-low' : value > 70 ? 'rsi-high' : 'rsi-mid'}`}>{value.toFixed(1)}</span>;
}, (a, b) => a.value === b.value);
