const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const IN0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const trim = (n: number) => String(+n.toFixed(1));

/** ₹1,23,456.78 */
export const formatINR = (n: number): string => INR.format(n);
/** 1.2Cr, 45L, 8K (Indian units). */
export function formatVolume(n: number): string {
  if (n >= 1e7) return `${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `${trim(n / 1e5)}L`;
  if (n >= 1e3) return `${trim(n / 1e3)}K`;
  return String(Math.round(n));
}
/** Market cap is stored in crore: ₹1,23,456 Cr */
export const formatMarketCap = (crore: number): string => `₹${IN0.format(crore)} Cr`;
export const formatPercent = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
