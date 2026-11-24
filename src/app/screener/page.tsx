import type { Metadata } from 'next';
import { ScreenerApp } from '@/components/ScreenerApp';
export const metadata: Metadata = { title: 'Screener | Equity Screener' };
export default function ScreenerPage() { return <ScreenerApp />; }
