# System Architecture & Technical Design Document

**Project:** WealthOvers — Advanced Personal Money Manager Web Application  
**Version:** 1.0.0-PROD-ARCH  
**Status:** Architecture Design Complete — Awaiting Approval  
**Author:** Principal Software Architect  
**Target Platform:** Next.js (Vercel Serverless) + Supabase Cloud (PostgreSQL 15+)  

---

## 1. Executive Summary & Core Architectural Principles

WealthOvers is an enterprise-grade, multi-user personal finance management and wealth optimization platform designed to unite budgeting, expense tracking, multi-account banking, investment tracking (stocks, mutual funds, gold, crypto), debt management (loans, credit cards), automated bank statement parsing, and Android-based transaction synchronization into a cohesive, responsive web application.

The design strictly obeys the following core architectural principles:

1. **Zero-Trust Cross-User Data Isolation**: User identification is never trusted from the client payload. Every query, mutation, and background operation enforces tenant scoping derived strictly from cryptographic JWT sessions verified by Supabase Auth and physically guarded by PostgreSQL Row Level Security (RLS).
2. **Arbitrary-Precision Financial Arithmetic**: Floating-point mathematics (`IEEE 754`) is strictly forbidden for currency and asset quantities. All database monetary fields use `NUMERIC(15, 4)` and all runtime calculations execute via `Decimal.js` to eradicate rounding drift.
3. **Serverless-First Compatibility**: The entire system is engineered for Vercel's stateless serverless execution environment, eliminating persistent background daemons, socket memory leaks, and connection exhaustion by utilizing Supabase's transaction connection pooler (Supavisor) and standard HTTPS API interfaces.
4. **Privacy-Preserving Automation & Security**: Sensitive data (such as bank credentials, full SMS inboxes, or OTPs) are never ingested. Android synchronization relies on on-device parsing with only structured transaction summaries transmitted over TLS with device-level token authentication.
5. **Normalized Double-Entry-Aware Ledger**: Transfers between owned accounts, credit card bill settlements, and refunds are architected to eliminate double-counting of expenses and income across financial analytics.

---

## 2. End-to-End Technical Architecture

### 2.1 System Topology Diagram

The following diagram illustrates the deployment topology, runtime boundaries, network isolation, and communication paths across client applications, edge networks, serverless computation, and the database persistence tier.

```mermaid
flowchart TD
    subgraph Clients["Client Tier (Cross-Platform)"]
        WebDesktop["Desktop Browser (Next.js PWA)"]
        WebMobile["Mobile Browser (Next.js PWA)"]
        AndroidApp["Android Companion App (Native Kotlin)"]
    end

    subgraph EdgeVercel["Vercel Edge & Serverless Platform"]
        VercelCDN["Vercel Edge Network / CDN"]
        NextMiddleware["Next.js Auth Middleware (Edge Runtime)"]
        
        subgraph Compute["Stateless Serverless Execution (Node.js)"]
            AppRouter["Next.js App Router (SSR & RSC)"]
            RouteHandlers["API Route Handlers (/api/v1/*)"]
            ServerActions["Server Actions (Direct Mutations)"]
            StatementEngine["Statement Extraction Engine (Client/Server)"]
            SyncGateway["Android Sync Ingestion Gateway"]
        end
    end

    subgraph SupabaseCloud["Supabase Managed Cloud Services"]
        SupabaseAuth["Supabase Auth (GoTrue - JWT/PKCE)"]
        SupabaseStorage["Encrypted Object Storage (Statements/Receipts)"]
        Supavisor["Supavisor (Transaction Connection Pooler :6543)"]
        
        subgraph PostgresInstance["PostgreSQL 15+ Primary Database"]
            RLS["PostgreSQL Row Level Security (RLS) Engine"]
            SchemaTables["Normalized Financial Schema (24 Core Tables)"]
            Triggers["Triggers (Profile Provisioning, Audit, Timestamps)"]
        end
    end

    WebDesktop -->|HTTPS / WSS| VercelCDN
    WebMobile -->|HTTPS / WSS| VercelCDN
    VercelCDN --> NextMiddleware
    NextMiddleware -->|Validate JWT Session| AppRouter
    NextMiddleware -->|Route Protected Request| RouteHandlers
    NextMiddleware -->|Invoke Server Mutation| ServerActions

    AndroidApp -->|HTTPS POST /api/v1/transactions/sync<br/>Bearer Device-Token| RouteHandlers
    
    AppRouter -->|Supabase SSR Client| SupabaseAuth
    RouteHandlers -->|Verify Token & Ingest| PostgresInstance
    ServerActions -->|Drizzle ORM / PgPool| Supavisor
    
    Supavisor --> RLS
    RLS --> SchemaTables
    SchemaTables --> Triggers
    StatementEngine -->|Secure Upload| SupabaseStorage
```

### 2.2 Layered Software Architecture

WealthOvers follows a clean, decoupled 4-tier architectural model:

| Layer | Technologies | Responsibilities |
| :--- | :--- | :--- |
| **Presentation Tier** | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons, Recharts | Server-side rendering (RSC), client-side interactive views, responsive layout adaptation, accessible forms, data visualization. |
| **Application Tier** | Next.js Route Handlers, Server Actions, Zod, Zustand | Request routing, payload schema validation, session verification, orchestrating domain operations, transactional mutation boundaries. |
| **Domain / Logic Tier** | Decimal.js, date-fns, PapaParse, SheetJS, Financial Math Engine | Accurate financial calculations (XIRR, amortization, net worth rollup, budget rollover, categorization heuristics, deduplication hashing). |
| **Persistence Tier** | PostgreSQL 15+, Drizzle ORM, Supabase Auth, Supabase Storage, Supavisor | Relational data persistence, foreign key enforcement, row-level access control, database triggers, index optimization, blob storage. |

---

## 3. Multi-User Authentication & Data Isolation Architecture

### 3.1 Authentication Workflow (PKCE & JWT)

The authentication system is built on **Supabase Auth** utilizing the **Proof Key for Code Exchange (PKCE)** flow for web applications, eliminating bearer token exposure in query parameters.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant MW as Next.js Middleware (@supabase/ssr)
    participant Auth as Supabase Auth (GoTrue)
    participant DB as PostgreSQL Database
    participant App as Next.js Dashboard

    User->>MW: Access /dashboard (GET)
    MW->>Auth: Read & Validate Cookies (sb-access-token, sb-refresh-token)
    alt Token Missing or Expired
        Auth-->>MW: Token invalid / Expired
        MW->>Auth: Refresh Session using Refresh Token
        alt Refresh Successful
            Auth-->>MW: Issue New Session Tokens
            MW-->>User: Set-Cookie (Refreshed Tokens)
        else Refresh Failed
            MW-->>User: Redirect 307 -> /login?redirect=/dashboard
        end
    else Token Valid
        MW->>App: Forward Request with verified user context (auth.uid)
        App->>DB: Query user data (RLS enforces WHERE user_id = auth.uid())
        DB-->>App: Return isolated user records only
        App-->>User: Render personalized dashboard
    end
```

### 3.2 Automated Profile Provisioning Pipeline

When a user signs up via email/password or Google OAuth, a PostgreSQL trigger immediately provisions their tenant baseline (profile, default settings, default categories) within an atomic database transaction.

```sql
-- Trigger executed automatically on insert to auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Create User Profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Create User Settings with India / INR defaults
  INSERT INTO public.user_settings (user_id, currency, locale, financial_year_start_month, timezone)
  VALUES (NEW.id, 'INR', 'en-IN', 4, 'Asia/Kolkata');

  -- 3. Seed Default Income & Expense Categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES
    (NEW.id, 'Salary', 'income', 'Briefcase', '#10B981', true),
    (NEW.id, 'Freelancing', 'income', 'Laptop', '#06B6D4', true),
    (NEW.id, 'Investments', 'income', 'TrendingUp', '#8B5CF6', true),
    (NEW.id, 'Food & Dining', 'expense', 'Utensils', '#F59E0B', true),
    (NEW.id, 'Groceries', 'expense', 'ShoppingCart', '#10B981', true),
    (NEW.id, 'Shopping', 'expense', 'ShoppingBag', '#EC4899', true),
    (NEW.id, 'Transportation', 'expense', 'Car', '#3B82F6', true),
    (NEW.id, 'Housing & Rent', 'expense', 'Home', '#6366F1', true),
    (NEW.id, 'Utilities', 'expense', 'Zap', '#EAB308', true),
    (NEW.id, 'Healthcare', 'expense', 'Activity', '#EF4444', true),
    (NEW.id, 'Entertainment', 'expense', 'Film', '#8B5CF6', true),
    (NEW.id, 'Miscellaneous', 'expense', 'MoreHorizontal', '#6B7280', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Financial Calculation Engine & Accuracy Guarantees

### 4.1 Strict Precision Rules

1. **Floating Point Ban**: JavaScript's native `Number` type (IEEE 754 float) introduces catastrophic rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial calculations, this breaks balance reconciliation.
2. **Runtime Math**: All arithmetic on currency, interest, NAVs, and quantities must utilize `Decimal.js` instances configured with `Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })` (Banker's rounding).
3. **Storage Schema**: Database schema stores currency figures as `NUMERIC(15, 4)`:
   - Supports values up to 99,999,999,999.9999 (99 Billion with 4 decimal digits).
   - 4 decimal places natively accommodates fractional mutual fund units (up to 3-4 decimal places in India/US) and crypto sub-units.
4. **Display Formatting**: At the UI presentation layer, values are formatted via `Intl.NumberFormat` matching the user's selected locale and currency (e.g., Indian numbering system: ₹1,50,000.00).

### 4.2 Financial Domain Formulas

#### Net Worth Rollup
$$\text{Net Worth} = \sum \text{Liquid Accounts} + \sum \text{Investment Valuations} + \sum \text{Fixed Assets} - \sum \text{Credit Card Outstandings} - \sum \text{Loan Principals}$$

#### Double-Counting Prevention Protocol
- **Account Transfers**: When money moves from Bank A to Bank B, it is recorded as a single transaction row with `type = 'transfer'`, `account_id = Bank_A`, and `destination_account_id = Bank_B`.
  - Cash flow calculation treats this as `Net Cashflow = 0`.
  - It is excluded from both Total Income and Total Expense metrics.
- **Credit Card Payments**: Paying a credit card bill from a bank account is executed as an inter-account transfer from Bank -> Credit Card Account.
  - The actual purchases on the credit card were already recorded as expenses when incurred.
  - Settling the credit card bill reduces bank balance and decreases credit card liability, avoiding the duplicate expense error.
- **Refunds**: Recorded as `type = 'refund'` linked via `original_transaction_id`. In analytical reports, refunds net against the parent expense category rather than inflating gross revenue/income.

#### Investment Returns (XIRR & Absolute)
- **Absolute Return**:
  $$\text{Absolute Return (\%)} = \frac{\text{Current Value} - \text{Total Invested}}{\text{Total Invested}} \times 100$$
- **XIRR (Extended Internal Rate of Return)**:
  Solved iteratively using the Newton-Raphson method for irregularly spaced cash flows $(C_i, d_i)$:
  $$\sum_{i=1}^{n} \frac{C_i}{(1 + r)^{\frac{d_i - d_0}{365}}} = 0$$
  *Fallback Guarantee*: If Newton-Raphson fails to converge within 100 iterations (due to extreme cash flow swings or near-zero horizons), the engine gracefully falls back to Time-Weighted Return (TWR) or Absolute Return with a clear UI advisory badge.

---

## 5. Android Transaction Synchronization Architecture

### 5.1 Android OS Security & Policy Constraints

Google Play Store Policy strictly restricts access to `READ_SMS` and `RECEIVE_SMS` permissions to default SMS handler apps only. Third-party personal finance apps requesting SMS permissions are rejected from the Play Store.

To solve this rigorously without violating operating system security or user trust:

```mermaid
flowchart LR
    subgraph MobileDevice["Android Device Environment"]
        subgraph NotificationPipeline["Primary (Play Store Approved)"]
            NLService["NotificationListenerService<br/>(Reads Bank / UPI Notifications)"]
        end
        subgraph SMSPipeline["Secondary (Sideload / Power User)"]
            SMSReceiver["BroadcastReceiver<br/>(RECEIVE_SMS for offline APKs)"]
        end
        
        Parser["On-Device Local Regex Parser<br/>(Zero Raw Text Exfiltration)"]
        LocalCache["Encrypted SQLite / Room DB<br/>(Offline Queue)"]
    end

    subgraph SyncProtocol["Secure API Gateway"]
        SyncAPI["POST /api/v1/transactions/sync<br/>Headers: X-Device-Token, X-Device-Id"]
        Idempotency["Idempotency Filter<br/>SHA-256(Account + Amount + Time + Ref)"]
        Staging["Staging & Auto-Approval Rules Engine"]
        Ledger["Core Transaction Ledger"]
    end

    NLService -->|Notification Payload| Parser
    SMSReceiver -->|Financial SMS Payload| Parser
    Parser -->|Filtered & Structured JSON| LocalCache
    LocalCache -->|Encrypted HTTPS Sync| SyncAPI
    SyncAPI --> Idempotency
    Idempotency --> Staging
    Staging -->|Confidence >= 0.85| Ledger
    Staging -->|Confidence < 0.85| StagingQueue["User Review Queue"]
```

### 5.2 Security & Privacy Guarantees

1. **Zero Raw Message Upload**: The Android app never transmits full SMS messages, personal texts, contacts, or OTPs. Parsing is executed locally on-device. Only extracted metadata is uploaded:
   - `amount`: Cleaned decimal amount
   - `transaction_type`: `debit` or `credit`
   - `merchant`: Cleaned merchant identifier (e.g., "Swiggy", "Amazon")
   - `account_suffix`: Last 4 digits of the card or bank account (e.g., "4321")
   - `timestamp`: UTC ISO timestamp
   - `reference_number`: UPI Ref ID or UTR number
   - `parser_confidence`: Float between 0.0 and 1.0
2. **Device Authentication**: Each device registers via an authenticated web session generating a device-specific high-entropy API key (`wov_dev_...`) stored securely in Android Keystore.
3. **Idempotency & Deduplication**: Every sync event generates a deterministic hash:
   $$\text{Hash} = \text{SHA256}(\text{user\_id} + \text{amount} + \text{account\_suffix} + \text{timestamp} + \text{ref\_no})$$
   Duplicate payloads sent during network retries are recognized and safely acknowledged without duplicate row creation.
4. **Device Revocation**: Users can view all paired Android devices in the web settings panel and instantly revoke any device key with a single click.

---

## 6. Frontend Component & Navigation Architecture

### 6.1 Directory & Module Layout

The codebase follows Next.js App Router conventions with a domain-driven module separation:

```
WealthOvers/
├── app/                                 # Next.js App Router (Routes & Layouts)
│   ├── (auth)/                          # Unauthenticated Auth Routes
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/                     # Authenticated Application Shell
│   │   ├── layout.tsx                   # Master Shell (Sidebar, Header, BottomNav)
│   │   ├── dashboard/page.tsx           # High-Level Financial Overview
│   │   ├── transactions/page.tsx        # Ledger & Filtering
│   │   ├── accounts/page.tsx            # Multi-Account Banking
│   │   ├── budgets/page.tsx             # Budgets & Rollovers
│   │   ├── recurring/page.tsx           # Recurring Bills & Subscriptions
│   │   ├── investments/page.tsx         # Portfolio, Stocks, MF, Gold, XIRR
│   │   ├── credit-cards/page.tsx        # Credit Card Due Dates & Utilization
│   │   ├── loans/page.tsx               # Amortization, EMIs & Liabilities
│   │   ├── net-worth/page.tsx           # Asset & Liability Growth Tracking
│   │   ├── goals/page.tsx               # Financial Target Milestones
│   │   ├── reports/page.tsx             # Analytical Breakdown & PDF/CSV Export
│   │   ├── import/page.tsx              # CSV/XLSX/PDF Statement Import
│   │   ├── devices/page.tsx             # Android Companion Device Sync
│   │   ├── settings/page.tsx            # Preferences, Categories, Security
│   │   └── onboarding/page.tsx          # First-Time User Setup Wizard
│   ├── api/                             # Serverless Route Handlers
│   │   └── v1/
│   │       ├── auth/
│   │       ├── transactions/
│   │       ├── accounts/
│   │       ├── investments/
│   │       ├── import/
│   │       └── sync/
│   ├── layout.tsx                       # Root Layout (Theme, Fonts, QueryClient)
│   └── globals.css                      # Tailwind Directives & CSS Variables
├── components/                          # Reusable UI Primitives
│   ├── ui/                              # shadcn/ui Base Atoms (Button, Dialog, etc.)
│   ├── layout/                          # App Shell Components (Sidebar, Header, Nav)
│   └── financial/                       # Specialized Financial Components
│       ├── money-display.tsx            # Obfuscated / Masked Currency Formatter
│       ├── metric-card.tsx              # KPI Card with Delta & Sparkline
│       ├── transaction-badge.tsx        # Visual Transaction Type & Status
│       └── category-icon.tsx            # Dynamic Category Icon Resolver
├── modules/                             # Domain-Driven Functional Modules
│   ├── dashboard/components/
│   ├── transactions/components/
│   ├── accounts/components/
│   ├── investments/components/
│   ├── import/components/
│   └── sync/components/
├── hooks/                               # Custom React Hooks
│   ├── use-privacy-mask.ts              # One-click Masking of Financial Balances
│   ├── use-media-query.ts               # Responsive Screen Breakpoint Detection
│   └── use-transactions.ts              # React Query Transaction Abstraction
├── lib/                                 # Shared Core Libraries & Infrastructure
│   ├── supabase/                        # Supabase Browser, Server & Middleware Clients
│   ├── db/                              # Drizzle ORM Schema, Client & Migrations
│   ├── calculations/                    # Financial Arithmetic (Decimal.js, XIRR)
│   ├── parsers/                         # Statement & SMS Regex Parsers
│   └── validations/                     # Zod Input Schemas
├── stores/                              # Zustand State Stores
│   ├── ui-store.ts                      # Sidebar state, Theme, Privacy Mask
│   └── filter-store.ts                  # Date Ranges, Account Filters, Search Query
└── types/                               # TypeScript Definitions
    ├── database.ts                      # Supabase Generated Database Types
    ├── financial.ts                     # Core Financial Types & Enums
    └── api.ts                           # API Contracts & Payloads
```

### 6.2 Responsive UI/UX Breakpoint Architecture

WealthOvers enforces a strict **Mobile-First Responsive Design** across five standard responsive breakpoints without horizontal overflow:

```mermaid
graph TD
    subgraph Breakpoints["Responsive Breakpoints"]
        XS["Mobile (320px - 767px)"]
        MD["Tablet (768px - 1023px)"]
        LG["Desktop (1024px - 1439px)"]
        XL["Ultra-Wide (1440px+)"]
    end

    subgraph NavigationModes["Adaptive Navigation"]
        BottomNav["Floating Bottom Nav Bar + Slide-Out Drawer"]
        CollapsedSidebar["Icon-Only Collapsed Sidebar + Header"]
        FullSidebar["Expanded Left Sidebar + Top Bar + Global Search"]
    end

    subgraph DataDisplay["Adaptive Data Visualization"]
        CardFeed["Vertical Card Feed with Swipe Gestures"]
        HybridTable["Compact Table with Horizontal Touch Scroll Container"]
        TanStackTable["Full TanStack Data Grid with Column Toggle & Sort"]
    end

    XS --> BottomNav
    XS --> CardFeed
    MD --> CollapsedSidebar
    MD --> HybridTable
    LG --> FullSidebar
    LG --> TanStackTable
    XL --> FullSidebar
    XL --> TanStackTable
```

- **Mobile Viewport Optimization**: Every layout container is bounded by `w-full max-w-full overflow-x-hidden min-w-0`. Modals on mobile automatically convert into native-feeling bottom sheets using Radix Dialog / Vaul.
- **Privacy Mode**: Users can toggle a global privacy mode (`Cmd + Shift + P` or top bar eye icon) which replaces all monetary figures with `••••••` using CSS filter blurs and character masking.

---

## 7. Vercel Serverless Deployment Architecture

### 7.1 Serverless Boundaries & Database Pooling

Next.js Route Handlers and Server Actions deploy as stateless AWS Lambda instances orchestrated by Vercel. Standard PostgreSQL connections create a new backend process per connection; under serverless traffic spikes, this rapidly saturates PostgreSQL connection limits (`max_connections`).

To safeguard stability:
1. **Connection Pooling via Supavisor**: Direct connection strings are routed through Supabase Supavisor on port `6543` in `Transaction Mode`:
   ```env
   DATABASE_URL="postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
   ```
2. **Supabase REST Client for Quick Queries**: Read-heavy operations utilize the `@supabase/supabase-js` client over HTTPS. This incurs **zero database socket overhead**, eliminating cold-start connection latency.
3. **Execution Limits**: All route handlers are tuned for Vercel Hobby/Pro execution limits (15s/60s max execution). Long-running statement batch parses are processed incrementally on the client or broken into chunked API calls.

---

## 8. Dependency Evaluation & Technical Limitations Management

| Package / Technology | Version Target | Architectural Role | Potential Limitation | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js** | `^15.0.0` | Fullstack Framework (App Router) | Serverless cold starts & middleware size limits | Use Node.js runtime for complex calculations; keep Edge middleware focused exclusively on token validation. |
| **Supabase SSR** | `^0.5.0` | Auth & Session Management | Cookie synchronization across Server Components and Client Components | Implement canonical middleware session refresher as specified in `@supabase/ssr`. |
| **Drizzle ORM** | `^0.35.0` | Type-Safe Database ORM | Serverless connection exhaustion | Configure connection pooling with `pgbouncer=true` and `prepare: false` on pooled instances. |
| **Decimal.js** | `^10.4.3` | High-Precision Financial Math | Performance overhead compared to native numbers | Use native numbers strictly for non-financial UI indexes and chart coordinate layouts; use `Decimal.js` for all ledger totals, budgets, and balance calculations. |
| **Recharts** | `^2.13.0` | Data Visualization | SSR Hydration mismatches with responsive dimensions | Wrap charts in client-only dynamic components with skeleton fallback states. |
| **TanStack Table** | `^8.20.0` | Headless Data Grid | Mobile table layout complexity | Use TanStack Table core state on mobile to render responsive card lists instead of raw HTML tables. |
| **SheetJS (xlsx)** | `^0.18.5` | Excel File Parsing | Bundle size overhead (~300KB) | Lazy-load dynamically using `import('xlsx')` only when the user uploads an `.xlsx` file. |
| **PDF.js** | `^4.7.0` | PDF Statement Parsing | Canvas and DOM dependencies in Node.js | Execute PDF text extraction in the browser client using Web Workers before transmitting structured rows to the API. |

---

## 9. Security, Threat Modeling & Compliance

1. **Cross-Tenant Access Defense**: Every database table is locked with RLS. No query relies solely on `WHERE user_id = :id` in application code; the database engine actively asserts `auth.uid() = user_id`.
2. **SQL Injection**: Prevented by utilizing parameterized SQL via Drizzle ORM and Supabase query builders.
3. **Rate Limiting**: Critical endpoints (`/api/v1/auth/*`, `/api/v1/transactions/sync`, `/api/v1/import/*`) are protected by IP and device-token rate limiting to prevent brute force and denial-of-service.
4. **Environment Isolation**: Service-role keys (`SUPABASE_SERVICE_ROLE_KEY`) are restricted exclusively to secure server-side webhook routines and never bundled into client packages.
5. **Audit Logging**: A dedicated `audit_logs` table records sensitive actions (device registration, account deletion, bulk transaction modifications) for security accountability.

