# WealthOvers — Security, Privacy & Compliance Audit

**Auditor:** Agent 11 (Performance and Security Specialist)  
**Reviewed by:** Agent 1 (Principal Architect)  
**Status:** Certified Secure / Zero Critical Vulnerabilities

---

## 1. Authentication & Session Architecture

* **Supabase SSR Cookie Auth:** All user sessions are managed via HTTP-only, secure, same-site cookies managed by `@supabase/ssr`.
* **Zero Client-Side User ID Trust:** Server actions and API routes extract identity exclusively from `supabase.auth.getUser()`. Any client-provided `user_id` payload is rejected or ignored.
* **Token Refresh via Middleware:** Expired access tokens are automatically rotated in `middleware.ts` before requests reach App Router layouts or server components.

---

## 2. Row Level Security (RLS) Multi-Tenant Isolation

1. **Policy Standard:** Every table in the `public` schema has `ROW LEVEL SECURITY` enabled.
2. **Scoping Filter:** Standard policy: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
3. **Automated Verification:** Verified in `tests/rls-isolation.test.ts`:
   * Tenant A cannot select, insert, update, or delete records belonging to Tenant B.
   * Direct queries without authenticated context return empty sets (`[]`) rather than leaking records.

---

## 3. Sensitive Financial Data Masking & Storage Guardrails

* **Credit Cards:** Full Primary Account Numbers (PAN), CVVs, and PINs are **NEVER** accepted or stored. Only `last_four_digits` (VARCHAR 4), card name, network, and issuer bank are recorded.
* **Bank Accounts:** Account numbers are stored with client-side masking (`account_number_masked` e.g. `••••1234`).
* **Privacy Mask Toggle (`components/layout/privacy-mask-toggle.tsx`):** Users can toggle privacy mode to blur all monetary values across screens when viewing in public spaces.

---

## 4. Android Companion API & Zero-Trust Ingestion Security

1. **Device Authentication (`app/api/v1/transactions/sync/route.ts`):**
   * Hardware devices authenticate via `X-Device-Id` and `X-Device-Token`.
   * Device tokens are stored as irreversible **SHA-256 hashes** in PostgreSQL (`public.devices.token_hash`).
2. **Zero-Trust Content Filtering (`lib/security/device-auth.ts`):**
   * Strictly inspects incoming payloads for non-financial content.
   * **Rejects OTPs, login verification codes, passwords, raw personal messages, and unrelated notifications** with HTTP 400.
   * Only sanitized financial transaction metadata (`amount`, `timestamp`, `merchant`, `referenceNumber`) is admitted into the staging ledger.
3. **Idempotency Protection:**
   * Every incoming transaction generates a deterministic SHA-256 hash based on `(user_id, amount, timestamp, referenceNumber, description)`.
   * Prevents duplicate synchronization even during mobile network retries or offline recovery.

---

## 5. HTTP Security Headers & Production Readiness

The Next.js production build (`next.config.mjs`) injects standard security headers:
* `X-Frame-Options: DENY` (prevents clickjacking)
* `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: camera=(), microphone=(), geolocation=()`
* Secure HTTPS transport enforced in production via Vercel Edge Network.

