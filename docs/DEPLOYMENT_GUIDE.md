# WealthOvers — Production Deployment Guide (Vercel & Supabase Cloud)

This guide provides the complete, production-grade instructions for deploying the **WealthOvers** application to **Vercel** with **Supabase Cloud (PostgreSQL 15+)**.

---

## 1. Architecture & Deployment Overview

```
                                  +------------------------------------+
                                  |         DNS / Custom Domain        |
                                  |  (e.g., app.wealthovers.com /     |
                                  |         wealthovers.vercel.app)    |
                                  +-----------------+------------------+
                                                    | HTTPS / TLS 1.3
                                                    v
                                  +------------------------------------+
                                  |         Vercel Edge Network        |
                                  |  - Automatic Let's Encrypt SSL     |
                                  |  - Global Anycast CDN              |
                                  |  - Strict Security Headers         |
                                  +-----------------+------------------+
                                                    |
                   +--------------------------------+--------------------------------+
                   |                                                                 |
                   v                                                                 v
+--------------------------------------+                          +--------------------------------------+
|    Next.js App Router (SSR & RSC)    |                          |       Stateless API Routes (v1)      |
|  - Server-Side Rendering (Node.js 20)|                          |  - /api/v1/transactions/sync         |
|  - Production React 18 Streaming     |                          |  - /api/auth/callback                |
|  - Edge-cached static assets         |                          |  - Zero persistent state in memory   |
+------------------+-------------------+                          +------------------+-------------------+
                   |                                                                 |
                   | Supabase SSR Client                                             | Supabase Client / Drizzle
                   v                                                                 v
+--------------------------------------------------------------------------------------------------------+
|                                    Supabase Cloud Services                                             |
|                                                                                                        |
|  +---------------------------+   +-------------------------------+   +-------------------------------+ |
|  |     GoTrue Auth Server    |   |  Supavisor Connection Pooler  |   |   PostgreSQL 15+ Core Engine  | |
|  |  - PKCE Auth Flow         |   |  - Port 6543 (PgBouncer mode) |   |  - 26 Normalized Tables       | |
|  |  - Secure HTTP-only Cookie|   |  - Multiplexed transactions   |   |  - FORCE ROW LEVEL SECURITY   | |
|  |  - Token Refresh          |   |  - Zero Lambda exhaustion     |   |  - Atomic Triggers & XIRR     | |
|  +---------------------------+   +-------------------------------+   +-------------------------------+ |
+--------------------------------------------------------------------------------------------------------+
```

---

## 2. Pre-Deployment Verification Checklist

Before initiating deployment, verify that all local checks have executed and passed:

| Verification Item | Command / Standard | Status | Verified Details |
| :--- | :--- | :--- | :--- |
| **ESLint Rules** | `npm run lint` | PASS | 0 warnings, 0 errors |
| **TypeScript Strict** | `npm run typecheck` | PASS | Strict types on Next 15 App Router |
| **Test Suite** | `npm run test` | PASS | 55 unit and integration tests passing |
| **Production Build** | `npm run build` | PASS | Clean compilation of 30+ static and dynamic routes |
| **Security Headers** | `next.config.ts` | ACTIVE | HSTS (max-age=63072000), CSP, X-Frame-Options: DENY, nosniff |
| **Error Boundaries** | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` | ACTIVE | User-friendly UI, zero stack-trace leakage |
| **Connection Pooling** | `lib/db/index.ts` | ACTIVE | Supavisor port 6543, `prepare: false`, `max: 1` |
| **Row Level Security** | `supabase/migrations/*` | ACTIVE | All 26 tables have `FORCE ROW LEVEL SECURITY` |
| **Docker Excluded** | Project Root | VERIFIED | Native Vercel Serverless runtime without Docker |

---

## 3. Manual Configuration Steps Required by User

Before triggering the Vercel build, complete these required manual configuration steps:

### Action 1: Push Code to GitHub Repository

The local Git repository is clean and ready. Push the latest commits from branch `main` to your remote repository:

```bash
git push origin main
```

*(Ensure the remote repository URL points to your GitHub account/organization).*

---

### Action 2: Retrieve Supabase Cloud Production Credentials

Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and select your project (`dxvfgzqtvnpjwdibuhrh` or your designated production instance):

1. Go to **Project Settings** -> **API**:
   - Copy **Project URL** (`https://[project-ref].supabase.co`).
   - Copy **Project API Keys** -> `anon` `public` key.
   - Copy **Project API Keys** -> `service_role` `secret` key (keep confidential).
2. Go to **Project Settings** -> **Database** -> **Connection string**:
   - Select the **Transaction Pooler** mode (not Session mode).
   - Verify the port is **`6543`**.
   - Copy the URI string:
     `postgres://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`

---

### Action 3: Whitelist Production Auth URLs in Supabase

In the Supabase Dashboard, navigate to **Authentication** -> **URL Configuration**:

1. Set **Site URL** to your canonical production URL:
   ```text
   https://your-app-name.vercel.app
   ```
   *(Or your custom domain, e.g. `https://wealthovers.com`)*
2. In **Redirect URLs**, add the following whitelisted wildcard patterns:
   ```text
   http://localhost:3000/**
   https://*-your-team.vercel.app/**
   https://your-app-name.vercel.app/**
   https://your-app-name.vercel.app/api/auth/callback
   https://your-custom-domain.com/**
   https://your-custom-domain.com/api/auth/callback
   ```
3. Click **Save Changes**.

---

### Action 4: Import Project & Configure Environment Variables in Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository (`WealthOvers`).
4. In the **Configure Project** screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
5. Expand the **Environment Variables** section and add the required production variables:

| Variable Name | Environment(s) | Example / Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Dev | `https://[project-ref].supabase.co` | Public Supabase API Gateway endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Dev | `eyJhbGciOi...` | Public client anon key for browser authentication |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | `eyJhbGciOi...` | Confidential service role key for administrative tasks |
| `DATABASE_URL` | Production, Preview | `postgres://postgres.[ref]:[pw]@...pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true` | Supavisor PgBouncer transaction pooler (port 6543) |
| `NEXT_PUBLIC_APP_URL` | Production | `https://your-app-name.vercel.app` (or custom domain) | Canonical public application URL for auth redirects |

> [!CAUTION]
> Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` with a `NEXT_PUBLIC_` prefix. They must remain accessible only within the serverless runtime.

6. Click **Deploy**.

---

### Action 5: (Optional) Connect Custom Domain & DNS

To configure a custom domain (e.g., `wealthovers.com` or `app.wealthovers.com`):

1. In the Vercel Dashboard, go to **Settings** -> **Domains**.
2. Enter your domain name and click **Add**.
3. In your DNS provider (Cloudflare, Namecheap, GoDaddy, AWS Route 53), create the DNS records provided by Vercel:
   - **Apex Domain (`wealthovers.com`)**:
     - Type: `A`
     - Name: `@`
     - Value: `76.76.21.21`
   - **Subdomain (`app.wealthovers.com` or `www.wealthovers.com`)**:
     - Type: `CNAME`
     - Name: `app` (or `www`)
     - Value: `cname.vercel-dns.com.`
4. Vercel will automatically verify DNS propagation and issue a Let's Encrypt TLS/SSL certificate.
5. In Supabase **Authentication** -> **URL Configuration**, ensure your custom domain is set as the primary **Site URL**.

---

## 4. Post-Deployment Verification & Smoke Tests

Once Vercel reports a successful deployment, run the following verification tests on the live production URL:

### 1. Security Headers Verification
Inspect the response headers of the live deployment using `curl`:
```bash
curl -I https://your-app-name.vercel.app/
```
Confirm the presence of:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self' ...`

### 2. User Authentication & Profile Provisioning
1. Register a new test account at `/register`.
2. Confirm email delivery (or log in directly if auto-confirm is enabled).
3. Log in at `/login` and confirm automated redirect to `/dashboard`.
4. Open Supabase Dashboard -> Table `profiles` and verify the user profile record was created.

### 3. Cross-User Data Isolation (RLS Verification)
1. In Browser A (User 1), create an Account named "User 1 Savings" and a Transaction for ₹5,000.
2. In Browser B (Incognito / User 2), log in as a separate account.
3. Confirm that User 2 sees an empty dashboard and ₹0 net worth, with zero visibility of User 1's accounts or transactions.

### 4. Precision Financial Operations
1. Execute an Inter-Account Transfer (e.g., ₹1,000.50 from Savings to Current).
2. Confirm both account balances update atomically via the PostgreSQL database trigger (`sync_account_balance`).
3. Check `/reports` and confirm the cash flow and spending charts render accurately.

### 5. Android Companion Sync API
Test the mobile companion endpoint with a test device token:
```bash
curl -X POST https://your-app-name.vercel.app/api/v1/transactions/sync \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: invalid-token-test" \
  -d '{"transactions":[]}'
```
Confirm response is `401 Unauthorized` (`"Invalid or inactive device token"`), proving the API is protected and serverless-compatible.

---

## 5. Maintenance & Ongoing Operations

- **Database Backups**: Supabase performs daily automated backups. Point-in-time recovery (PITR) can be enabled under Project Settings -> Database Backups.
- **Monitoring & Logs**: Real-time runtime errors and edge request durations are visible under the **Logs** tab in the Vercel Dashboard and Supabase **Database Logs**.
- **Schema Migrations**: Apply future schema updates via `supabase db push` or by executing migrations sequentially through the Supabase SQL editor.

