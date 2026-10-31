# WealthOvers — Advanced Personal Money Manager

WealthOvers is a multi-user personal finance management and wealth optimization platform built with Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and PostgreSQL.

It empowers individuals to manage their complete financial life in one place: multi-account banking, granular income/expense tracking, inter-account transfers, category budgets, recurring subscriptions, comprehensive investment tracking (Indian stocks, US stocks, mutual funds, gold, crypto) with XIRR analytics, credit card billing cycle tracking, loan amortization, automated bank statement imports, and Android-based transaction synchronization.

---

## 📚 Technical Documentation & Architecture

Comprehensive technical specifications and architectural designs are available in the [`docs/`](./docs) directory:

- [**System Architecture & Technical Design (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md): Complete system architecture, topology diagrams, data flows, auth architecture, Android synchronization model, and Vercel serverless strategies.
- [**Database Schema & RLS Security (`docs/DATABASE.md`)**](./docs/DATABASE.md): 3NF normalized schema, full Entity Relationship Diagram (ERD), complete PostgreSQL DDL, triggers, and Row Level Security (RLS) policies.
- [**REST API Documentation (`docs/API_DOCUMENTATION.md`)**](./docs/API_DOCUMENTATION.md): Complete RESTful API specifications for `/api/v1/*`, authentication contracts, and companion device synchronization protocols.
- [**Development Roadmap (`docs/DEVELOPMENT_ROADMAP.md`)**](./docs/DEVELOPMENT_ROADMAP.md): Detailed 11-milestone sequential implementation plan with strict acceptance criteria.
- [**Product Requirements Document (`docs/PRD.md`)**](./docs/PRD.md): Product requirements, features, business rules, and constraints.
- [**Development Progress Tracker (`DEVELOPMENT_PROGRESS.md`)**](./DEVELOPMENT_PROGRESS.md): Live progress dashboard tracking module completion, test execution, and deployment readiness.

---

## 🛠️ Technology Stack

| Layer | Primary Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript |
| **Styling & Components**| [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Radix UI primitives, Lucide React |
| **State & Forms** | [Zustand](https://zustand-demo.pmnd.rs/), [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/) |
| **Data Visualization** | [Recharts](https://recharts.org/), [TanStack Table v8](https://tanstack.com/table) |
| **Financial Math** | [Decimal.js](https://mikemcl.github.io/decimal.js/) (Arbitrary-precision arithmetic), date-fns |
| **Backend & Compute** | Next.js Serverless Route Handlers & Server Actions (Vercel) |
| **Database & Auth** | [Supabase](https://supabase.com/) Cloud (PostgreSQL 15+, Supabase Auth with PKCE/JWT, Storage) |
| **Database ORM** | [Drizzle ORM](https://orm.drizzle.team/) with Supavisor Connection Pooling |
| **Testing** | Vitest, React Testing Library, Playwright |
| **Deployment** | Vercel (Edge & Serverless Node.js Runtime) + Supabase Cloud |

---

## 🔐 Core Architecture Guarantees

1. **Zero Cross-User Data Leakage**: Enforced at the database engine level through PostgreSQL Row Level Security (`FORCE ROW LEVEL SECURITY`) on all 24 tables. Every query is physically scoped to `auth.uid() = user_id`.
2. **Arbitrary-Precision Financial Math**: All currency figures and quantities are calculated with `Decimal.js` and stored as `NUMERIC(15, 4)` in PostgreSQL, preventing floating-point rounding drift.
3. **Double-Counting Prevention**: Inter-account transfers and credit card bill settlements are represented using a single-row transfer schema (`account_id` -> `destination_account_id`), preventing false expense/income duplication.
4. **Play Store-Compliant Android Sync**: Utilizes on-device regex parsing via `NotificationListenerService` and device-token authentication. Zero raw personal SMS or OTP messages are ever uploaded to the server.
5. **Serverless Compatibility**: Zero persistent Node.js socket dependencies; queries are pooled via Supavisor on port `6543`, completely preventing connection pool exhaustion on Vercel.

---

## 🚀 Getting Started (Development Setup)

### Prerequisites
- Node.js 20+ LTS
- npm 10+
- A Supabase Cloud account and project

### Quickstart Setup (Once Codebase Scaffolding Begins)
```bash
# Clone repository
git clone https://github.com/nehalalam/WealthOvers.git
cd WealthOvers

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run database migrations against your Supabase project
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

