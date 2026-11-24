'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle, type CandlestickData, type IChartApi, type ISeriesApi, type LineData } from 'lightweight-charts';
import { BY_SYMBOL } from '@/lib/universe';
import { generateCandles, toWeekly } from '@/lib/candles';
import { bollinger, ema, rsi, sma, toLine, volumeProfile, type Series } from '@/lib/indicators';
import { formatINR, formatVolume } from '@/lib/format';
import { useStockStore } from '@/stores/stockStore';

const TIMEFRAMES = { '1M': 21, '3M': 63, '1Y': 252, '5Y': Infinity } as const;
type TF = keyof typeof TIMEFRAMES;
const TOGGLES = ['SMA20', 'SMA50', 'SMA200', 'EMA12', 'EMA26', 'Bollinger', 'RSI', 'Volume profile'] as const;
interface Hover { o: number; h: number; l: number; c: number; v: number }
interface Bar { y: number; h: number; w: number }

export default function StockChart({ symbol }: { symbol: string }) {
  const stock = BY_SYMBOL.get(symbol); const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null); const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null); const lastRef = useRef<CandlestickData | null>(null);
  const [tf, setTf] = useState<TF>('1Y'); const [on, setOn] = useState<Record<string, boolean>>({ SMA20: true, SMA50: true, RSI: true, 'Volume profile': true });
  const [hover, setHover] = useState<Hover | null>(null); const [bars, setBars] = useState<Bar[]>([]);
  const live = useStockStore(s => s.livePrices[symbol]?.price);
  const daily = useMemo(() => (stock ? generateCandles(stock) : []), [stock]);

  useEffect(() => {
    const host = el.current; if (!host || !stock) return;
    const series = tf === '5Y' ? toWeekly(daily) : daily; const n = Math.min(series.length, TIMEFRAMES[tf]); const visible = series.slice(-n); const t0 = visible[0]!.time;
    const closes = series.map(c => c.close); const vol = new Map(visible.map(c => [c.time, c.volume]));
    const chart = createChart(host, { width: host.clientWidth, height: host.clientHeight || 420, layout: { background: { type: ColorType.Solid, color: '#14171c' }, textColor: '#aab3c0' },
      grid: { vertLines: { color: '#1e232b' }, horzLines: { color: '#1e232b' } }, crosshair: { mode: CrosshairMode.Normal }, rightPriceScale: { borderColor: '#2a313b', scaleMargins: { top: 0.05, bottom: on.RSI ? 0.28 : 0.05 } }, timeScale: { borderColor: '#2a313b' } });
    chartRef.current = chart;
    const candle = chart.addCandlestickSeries({ upColor: '#2fbf8f', downColor: '#e5604d', wickUpColor: '#2fbf8f', wickDownColor: '#e5604d', borderVisible: false });
    candle.setData(visible as unknown as CandlestickData[]); candleRef.current = candle; lastRef.current = visible[visible.length - 1] as unknown as CandlestickData;
    const line = (s: Series, color: string, title: string, scale?: string) => {
      const l = chart.addLineSeries({ color, lineWidth: 1, title, priceScaleId: scale, lastValueVisible: false, priceLineVisible: false });
      l.setData(toLine(series, s).filter(p => p.time >= t0) as unknown as LineData[]); return l;
    };
    if (on.SMA20) line(sma(closes, 20), '#f2c14e', 'SMA20'); if (on.SMA50) line(sma(closes, 50), '#5aa9e6', 'SMA50'); if (on.SMA200) line(sma(closes, 200), '#ff9f6b', 'SMA200');
    if (on.EMA12) line(ema(closes, 12), '#c77dff', 'EMA12'); if (on.EMA26) line(ema(closes, 26), '#7bd88f', 'EMA26');
    if (on.Bollinger) { const b = bollinger(closes); line(b.upper, '#7d8899', 'BB+'); line(b.middle, '#aab3c0', 'BB'); line(b.lower, '#7d8899', 'BB-'); }
    if (on.RSI) {
      const r = line(rsi(closes), '#e8e8e8', 'RSI14', 'rsi'); chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      r.createPriceLine({ price: 70, color: '#e5604d', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: '70' });
      r.createPriceLine({ price: 30, color: '#2fbf8f', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: '30' });
    }
    // Volume profile is recomputed from the visible logical range on every zoom or pan.
    let raf = 0;
    const updateProfile = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      if (!on['Volume profile']) return setBars([]);
      const r = chart.timeScale().getVisibleLogicalRange(); if (!r) return;
      const slice = visible.slice(Math.max(0, Math.floor(r.from)), Math.min(visible.length, Math.ceil(r.to) + 1)); const vp = volumeProfile(slice, 40); if (vp.length < 2) return;
      const max = Math.max(...vp.map(b => b.volume)) || 1; const size = vp[1]!.price - vp[0]!.price;
      setBars(vp.flatMap(b => { const y1 = candle.priceToCoordinate(b.price + size / 2); const y0 = candle.priceToCoordinate(b.price - size / 2); return y1 === null || y0 === null ? [] : [{ y: y1, h: Math.max(1, y0 - y1 - 1), w: (b.volume / max) * 100 }]; }));
    }); };
    chart.timeScale().subscribeVisibleLogicalRangeChange(updateProfile);
    chart.subscribeCrosshairMove(p => { const d = p.seriesData.get(candle) as CandlestickData | undefined; if (!d || p.time === undefined) return setHover(null); setHover({ o: d.open, h: d.high, l: d.low, c: d.close, v: vol.get(p.time as unknown as number) ?? 0 }); });
    chart.timeScale().fitContent(); updateProfile();
    const ro = new ResizeObserver(() => { chart.applyOptions({ width: host.clientWidth, height: host.clientHeight || 420 }); updateProfile(); }); ro.observe(host);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); chart.remove(); chartRef.current = null; candleRef.current = null; };
  }, [stock, daily, tf, on]);

  // Real-time: fold each live tick into the forming candle.
  useEffect(() => {
    const last = lastRef.current; if (live === undefined || !last || !candleRef.current) return;
    const next = { ...last, close: live, high: Math.max(last.high, live), low: Math.min(last.low, live) }; lastRef.current = next; candleRef.current.update(next);
  }, [live]);

  if (!stock) return <p className="empty">Select a stock to see its chart.</p>;
  const price = live ?? stock.lastPrice;
  const shot = () => chartRef.current?.takeScreenshot().toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${symbol}.png`; a.click(); URL.revokeObjectURL(a.href); });
  return (<div className="chart">
    <header><h2>{stock.symbol} <small>{stock.companyName}</small></h2><strong>{formatINR(price)}</strong></header>
    <div className="toolbar" role="toolbar" aria-label="Chart controls">
      {(Object.keys(TIMEFRAMES) as TF[]).map(k => <button key={k} aria-pressed={tf === k} onClick={() => setTf(k)}>{k}</button>)}<span className="sep" />
      {TOGGLES.map(k => <button key={k} aria-pressed={!!on[k]} onClick={() => setOn(p => ({ ...p, [k]: !p[k] }))}>{k}</button>)}<span className="sep" />
      <button onClick={() => chartRef.current?.timeScale().fitContent()}>Reset zoom</button><button onClick={shot}>Save PNG</button>
    </div>
    <p className="ohlc" aria-live="off">{hover ? `O ${hover.o.toFixed(2)}  H ${hover.h.toFixed(2)}  L ${hover.l.toFixed(2)}  C ${hover.c.toFixed(2)}  Vol ${formatVolume(hover.v)}` : 'Hover the chart for OHLCV. Double-click to reset zoom.'}</p>
    <div className="plot" onDoubleClick={() => chartRef.current?.timeScale().fitContent()}><div ref={el} className="plot-inner" />
      <div className="vp" aria-hidden>{bars.map((b, i) => <div key={i} style={{ top: b.y, height: b.h, width: `${b.w * 0.9}px` }} />)}</div></div>
  </div>);
}
