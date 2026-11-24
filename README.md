# Real-Time Stock Screener
Next.js 14 (App Router), React 18, strict TypeScript, Zustand, TanStack Table + Virtual, lightweight-charts. Mock Indian equity universe of 5,000 stocks (INR, lakh/crore formatting).

## Setup
    git clone <repo> && cd stock-screener
    npm install
    npm run dev          # http://localhost:3000
Environment variables: none required (see `.env.example`).

## Scripts
`dev`, `build`, `start`, `lint`, `test`, `test:coverage`, `bench` (filter/sort timing for 5k/10k/20k rows).

## Features
- Virtualised grid (36 px rows, overscan 10), sortable (asc/desc/none), resizable columns, sticky Symbol column, keyboard navigation (arrows, Home/End, PgUp/PgDn, Enter, Space, `?`)
- 31 filter criteria (range, multi-select, select, boolean), AND/OR engine with selectivity ordering, 4 presets, removable chips, live "Showing X of 5,000"
- Candlestick chart: SMA 20/50/200, EMA 12/26, Bollinger, RSI(14) with 70/30 lines, volume profile (recomputed on zoom/pan), crosshair OHLCV, PNG export, live last-candle updates
- Simulated feed: geometric Brownian motion with sector correlation and U-shaped session volatility, exponential-backoff reconnect (1/2/4/8/16 s), rAF-batched updates, status indicator, offline banner
- Error boundary per feature area; chart lazy-loaded behind Suspense

## Architecture and performance
See `ARCHITECTURE.md` and `PERFORMANCE_REPORT.md`.

## Known limitations (be upfront in your submission)
- Not yet built: Tailwind (plain CSS is used), React Query + IndexedDB offline cache, a real `ws` server (the feed is an in-browser simulator), column pin/unpin context menu, left/right cell navigation, dual-handle range sliders, indicator settings panel, 1D/1W timeframes, Husky/lint-staged, Airbnb ESLint preset, Storybook, component tests (only logic is unit tested), Vercel deployment.
- Sorting by LTP/% change uses the static snapshot; live prices update cells but do not re-sort.
- Browser performance figures in `PERFORMANCE_REPORT.md` must be measured by you.
