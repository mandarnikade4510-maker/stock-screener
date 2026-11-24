import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Equity Screener', description: 'Real-time stock screener with 5,000+ instruments, 30+ filters and technical charts.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
