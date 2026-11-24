# Performance report

## Measured (Node 22, `npm run bench`, 200 runs each, 5 simultaneous filters)
| Rows | Filter p50 / p95 | Sort p50 / p95 | Target |
|---|---|---|---|
| 5,000 | 0.54 ms / 1.17 ms | 1.22 ms / 3.28 ms | filter < 200 ms, sort < 150 ms |
| 10,000 | 1.17 ms / 1.77 ms | 3.59 ms / 5.28 ms | - |
| 20,000 | 2.46 ms / 6.87 ms | 9.39 ms / 21.05 ms | - |

These are engine-only numbers. In the browser the live "filter / sort" readout in the header shows the same measurement, and total time to paint also includes React rendering.

## To measure in your browser and fill in (not yet measured)
| Metric | Target | Result |
|---|---|---|
| LCP | < 2.5 s | |
| TTI | < 3.5 s | |
| CLS | < 0.1 | |
| Scroll FPS (30 s fast scroll) | > 55 | |
| Memory, 5,000 rows | < 150 MB | |
| WebSocket receipt-to-render | < 50 ms | header "last batch" shows store time |
| Lighthouse Performance | > 90 | |

How: `npm run build && npm start`, then Chrome DevTools: Lighthouse, Performance (record a 30 s scroll), Task Manager (memory), React Profiler (confirm one cell re-renders per tick). Add screenshots here before and after any optimisation, plus a bundle treemap from `@next/bundle-analyzer`.
