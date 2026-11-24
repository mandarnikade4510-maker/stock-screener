import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BY_SYMBOL } from '@/lib/universe';
import { formatINR, formatMarketCap } from '@/lib/format';

export function generateMetadata({ params }: { params: { symbol: string } }): Metadata {
  const s = BY_SYMBOL.get(params.symbol.toUpperCase()); return { title: s ? `${s.symbol} - ${s.companyName}` : 'Stock not found' };
}
/** Server Component: SEO-friendly detail page. */
export default function StockDetail({ params }: { params: { symbol: string } }) {
  const s = BY_SYMBOL.get(params.symbol.toUpperCase()); if (!s) notFound();
  const rows: Array<[string, string]> = [['Sector', s.sector], ['Industry', s.industry], ['Last price', formatINR(s.lastPrice)], ['Market cap', formatMarketCap(s.marketCap)], ['P/E', s.pe === null ? '–' : s.pe.toFixed(1)], ['ROE', `${s.roe.toFixed(1)}%`], ['Dividend yield', `${s.dividendYield.toFixed(2)}%`], ['RSI (14)', s.rsi14.toFixed(1)]];
  return (<main className="detail"><Link href="/screener">Back to screener</Link><h1>{s.symbol} <small>{s.companyName}</small></h1>
    <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></main>);
}
