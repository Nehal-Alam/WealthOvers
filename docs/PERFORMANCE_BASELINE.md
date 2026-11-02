# WealthOvers — Pre-Redesign Performance Baseline

**Date**: November 2026  
**Measurement State**: Clean Production Build (`next build`, Node 22 LTS)  
**Test Suite**: Vitest v2.1.9 (16 test suites, 110 tests passed)  
**Compiler**: Next.js 15.5.28 App Router with `optimizePackageImports`  

---

## 1. Executive Baseline Summary

Before undertaking the Leftovers-inspired redesign, we benchmarked the existing production application. This establishes the quantitative threshold that the redesign must preserve or exceed.

| Metric | Measured Baseline | Target Threshold for Redesign |
| :--- | :---: | :---: |
| **First Load JS Shared (all routes)** | **103 kB** | $\le$ 105 kB |
| **Dashboard First Load JS** | **174 kB** | $\le$ 178 kB |
| **Transactions First Load JS** | **202 kB** | $\le$ 205 kB |
| **Loans First Load JS** | **157 kB** | $\le$ 160 kB |
| **Budgets First Load JS** | **158 kB** | $\le$ 160 kB |
| **Net Worth First Load JS** | **152 kB** | $\le$ 155 kB |
| **Automated Tests Pass Rate** | **110 / 110 (100%)** | 100% (No regressions) |
| **TypeScript Compilation Errors** | **0 errors** | 0 errors |
| **ESLint Warnings & Errors** | **0 warnings, 0 errors** | 0 warnings, 0 errors |
| **Build Compilation Duration** | **~4.4 seconds** | $\le$ 6.0 seconds |
| **Local Server TTFB** | **~10 ms** | $\le$ 15 ms |
| **Estimated Production LCP** | **< 1.8 seconds** | $\le$ 2.0 seconds |
| **Estimated Production CLS** | **0.015** | $\le$ 0.05 |

---

## 2. Complete Route Bundle Breakdown (Next.js 15 Production Build)

Measured from `npm run build`:

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      201 B         104 kB
├ ○ /_not-found                            201 B         104 kB
├ ƒ /accounts                            8.74 kB         195 kB
├ ƒ /api/auth/callback                     201 B         104 kB
├ ƒ /api/v1/devices/register               201 B         104 kB
├ ƒ /api/v1/sync/status                    201 B         104 kB
├ ƒ /api/v1/transactions/sync              201 B         104 kB
├ ƒ /assets                               8.6 kB         165 kB
├ ƒ /budgets                             8.51 kB         158 kB
├ ƒ /categories                          9.24 kB         197 kB
├ ƒ /credit-cards                        8.24 kB         157 kB
├ ƒ /dashboard                           14.4 kB         174 kB
├ ƒ /devices                             11.3 kB         203 kB
├ ○ /forgot-password                     3.57 kB         215 kB
├ ƒ /goals                               8.21 kB         157 kB
├ ƒ /import                                11 kB         170 kB
├ ƒ /investments                         9.79 kB         167 kB
├ ƒ /loans                               7.63 kB         157 kB
├ ○ /login                               4.75 kB         216 kB
├ ƒ /net-worth                           8.67 kB         152 kB
├ ƒ /profile                             1.15 kB         113 kB
├ ƒ /recurring                           11.9 kB         161 kB
├ ○ /register                            5.21 kB         216 kB
├ ƒ /reports                             8.02 kB         182 kB
├ ○ /reset-password                      3.93 kB         215 kB
├ ƒ /settings                              201 B         104 kB
├ ƒ /subscriptions                         201 B         104 kB
└ ƒ /transactions                        8.35 kB         202 kB
+ First Load JS shared by all             103 kB
  ├ chunks/1255-60d8dc7c8c9309a1.js      46.3 kB
  ├ chunks/4bd1b696-100b9d70ed4e49c1.js  54.2 kB
  └ other shared chunks (total)          2.94 kB
```

---

## 3. Database & Network Baseline

- **Supabase PostgreSQL Host**: `dxvfgzqtvnpjwdibuhrh` (active & healthy).
- **Composite Indexes Active**: 9 custom composite and FK indexes applied via migration `20261102000000_composite_indexes.sql`.
- **Server Auth Caching**: `getAuthenticatedUser()` in `lib/supabase/server.ts` uses `React.cache()` to ensure 1 network call per request pass.
- **Query Waterfall Elimination**: `Promise.all` executes independent queries concurrently across all route handlers.
- **Dynamic Imports**: Modals across 11 views are chunked out on initial load via `next/dynamic`.

---

## 4. Guardrail Commitments During Redesign

1. The redesign must **not** re-introduce heavy client-side imports or full-page blocking loaders.
2. The redesign must **not** compromise the sub-150ms client navigation experience.
3. Every step of the 8-phase redesign must run through `npm run typecheck && npm run lint && npm test && npm run build` before acceptance.
