# WealthOvers — Technical Debt & Codebase Health Audit

**Document Version**: 1.0.0  
**Author**: Principal Software Architect & Next.js Performance Engineer  
**Date**: November 2026  
**Application**: WealthOvers Personal Finance  
**Target Environment**: Next.js 15 App Router, React 19, Supabase PostgreSQL, TypeScript 5.5

---

## 1. Executive Summary

This audit catalogs technical debt, architectural discrepancies, runtime deprecations, type safety vulnerabilities, and error handling gaps in the WealthOvers codebase. 

While the application demonstrates high architectural maturity—particularly in its 28-digit Decimal.js mathematical core and Supabase Row Level Security (RLS) enforcement—several areas require proactive remediation to guarantee long-term stability and eliminate friction during future framework upgrades.

---

## 2. Tooling, Engine & Dependency Deprecations

### 2.1 Next.js 15 Linting Deprecation
- **Notice Observed during `npm run lint`**:
  ```text
  `next lint` is deprecated and will be removed in Next.js 16.
  For existing projects, migrate to the ESLint CLI:
  npx @next/codemod@canary next-lint-to-eslint-cli .
  ```
- **Severity**: MEDIUM
- **Impact**: In Next.js 16, running `next lint` will fail or throw errors.
- **Remediation**: Transition `package.json` lint script from `"lint": "next lint"` to `"lint": "eslint . --ext .ts,.tsx"` with an updated flat ESLint config (`eslint.config.mjs`) compatible with ESLint 9+.

### 2.2 Supabase JS Node 20 Deprecation Notice
- **Notice Observed during `npm run build`**:
  ```text
  ⚠️ Node.js 20 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 22 or later.
  ```
- **Severity**: LOW (Informational / Future-proofing)
- **Impact**: `@supabase/supabase-js` v3 will require Node 22+.
- **Remediation**: Ensure Vercel project deployment runtime and local development environments specify Node.js 22 LTS in `.nvmrc` and `package.json` `"engines"` field.

### 2.3 Vite CJS Node API Deprecation in Vitest
- **Notice Observed during `npm run test`**:
  ```text
  The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
  ```
- **Severity**: LOW
- **Remediation**: Update `vitest.config.ts` to ensure pure ESM execution without fallback to Vite's legacy CommonJS loader.

---

## 3. Type Safety & Schema Synchronization Debt

### 3.1 Dual-Schema Definition Overhead
- **Issue**: The project maintains both:
  1. `lib/db/schema.ts` (Drizzle ORM schema)
  2. `types/database.ts` (Supabase PostgREST database types)
- **Debt**: Adding a column or modifying a table constraint requires updating both files or risks desynchronization.
- **Resolution**: Establish `types/database.ts` (derived directly from PostgreSQL catalog via `supabase gen types typescript`) as the single source of truth for runtime database types, with automated script validation.

### 3.2 Overuse of `any` Casts in Transaction Relational Queries
- **Locations**:
  - `app/(dashboard)/dashboard/page.tsx:89`: `const recentTransactions = (transactionsResult.data as any[] | null) || [];`
  - `components/dashboard/dashboard-client.tsx:41`: `recentTransactions: any[];`
- **Debt**: When joining `accounts` and `categories` in Supabase queries:
  ```typescript
  supabase.from("transactions").select("..., account:accounts(...), category:categories(...)")
  ```
  PostgREST returns nested objects. Because the base `Tables<"transactions">` type does not include joined relations, developers frequently fell back to `any[]`.
- **Resolution**: Create strongly typed projection types:
  ```typescript
  export type TransactionWithRelations = Tables<"transactions"> & {
    account?: Pick<Tables<"accounts">, "id" | "name" | "color"> | null;
    category?: Pick<Tables<"categories">, "id" | "name" | "color" | "icon"> | null;
  };
  ```

---

## 4. Error Handling, Fault Isolation & Resilience

### 4.1 Granular Widget Error Boundaries on the Dashboard
- **Current State**: The dashboard relies on `app/error.tsx` at the route root.
- **Risk**: If a non-critical secondary widget (e.g. `recurringResult` or `activeBudgetsResult`) fails due to a network glitch or temporary query timeout, the entire dashboard crashes into the error fallback screen.
- **Resolution**: Wrap independent secondary modules (`Upcoming Bills`, `Active Budget`, `Investment Portfolio Preview`) in localized React `<ErrorBoundary>` or Suspense boundaries with individual retry triggers.

### 4.2 Idempotency in Transaction Creation
- **Current State**: `createTransactionAction` in `app/(dashboard)/transactions/actions.ts` receives form data and inserts a row directly.
- **Risk**: If a user double-clicks the "Save Transaction" button on high-latency mobile networks, two identical transactions are created, double-deducting from their account balance.
- **Resolution**:
  1. Frontend: Disable submit button immediately upon form submission with a visible loading state.
  2. Backend: Support client-generated idempotency keys (`idempotency_key` UUID) or check for identical amount, account, timestamp within a 3-second window.

---

## 5. State Management & Persistent Preferences

### 5.1 UI Store Organization
- **Current State**: `stores/ui-store.ts` manages:
  - `isPrivacyMode: boolean`
  - `isSidebarOpen: boolean`
  Persisted in `localStorage` under `wealthovers-ui-state`.
- **Debt**: Does not currently persist user dashboard widget order or visibility preferences (e.g., whether to show or hide the Net Worth Trend, Investment preview, or Goals card).
- **Resolution**: Extend `UIState` in `stores/ui-store.ts` with `dashboardWidgetPreferences: { widgetId: string; visible: boolean; order: number }[]` to allow users to customize their dashboard layout smoothly without server round-trips.

---

## 6. Server Actions vs API Routes Architecture

### 6.1 Mutation Architecture Consistency
- **Audit**: All user mutations (creating accounts, editing transactions, updating budgets, recording loan payments) are implemented via Next.js Server Actions with Zod validation.
- **Assessment**: This follows Next.js App Router best practices, providing automatic CSRF protection, progressive enhancement, and co-located validation.
- **Recommendation**: Maintain this standard. For external integrations (Android Sync), dedicated REST endpoints in `app/api/v1/` remain appropriate.

---

## 7. Priority Technical Debt Remediation Plan

| Item | Description | Severity | Target Phase |
| :--- | :--- | :--- | :--- |
| **TD-1** | Create strongly typed relational transaction types (`TransactionWithRelations`) | High | Phase 5 |
| **TD-2** | Add double-submit prevention & pending state across all dialogs | High | Phase 4 & 5 |
| **TD-3** | Implement localized widget error boundaries on the dashboard | High | Phase 3 & 6 |
| **TD-4** | Extend `useUIStore` with persistent dashboard widget layout preferences | Medium | Phase 3 |
| **TD-5** | Update ESLint configuration ahead of Next.js 16 migration | Medium | Phase 11 |
| **TD-6** | Enforce Node.js 22 LTS in `package.json` engines and Vercel settings | Low | Phase 11 |

