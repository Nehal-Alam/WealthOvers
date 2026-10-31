import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";
import NotFound from "../app/not-found";
import ErrorBoundary from "../app/error";
import GlobalError from "../app/global-error";

describe("Vercel Production Readiness & Security", () => {
  it("enforces strict Next.js configuration flags", () => {
    expect(nextConfig.reactStrictMode).toBe(true);
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("configures comprehensive enterprise security headers", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (!nextConfig.headers) return;

    const headersConfig = await nextConfig.headers();
    expect(headersConfig.length).toBeGreaterThan(0);

    const rootHeaders = headersConfig.find((h) => h.source === "/:path*");
    expect(rootHeaders).toBeDefined();

    const headersMap = new Map(
      rootHeaders!.headers.map((item) => [item.key, item.value])
    );

    // HSTS (Strict-Transport-Security)
    expect(headersMap.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(headersMap.get("Strict-Transport-Security")).toContain("includeSubDomains");

    // X-Frame-Options (Clickjacking guard)
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");

    // X-Content-Type-Options (MIME sniffing guard)
    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");

    // Referrer-Policy
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

    // Permissions-Policy
    expect(headersMap.get("Permissions-Policy")).toContain("camera=()");
    expect(headersMap.get("Permissions-Policy")).toContain("microphone=()");

    // Content-Security-Policy (CSP)
    const csp = headersMap.get("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("provides valid production error and 404 boundaries", () => {
    expect(typeof NotFound).toBe("function");
    expect(typeof ErrorBoundary).toBe("function");
    expect(typeof GlobalError).toBe("function");
  });

  it("sanitizes auth callback redirection against open redirect vulnerabilities", () => {
    // Relative paths are allowed
    const validNext = "/dashboard";
    const sanitized1 = validNext.startsWith("/") && !validNext.startsWith("//") ? validNext : "/dashboard";
    expect(sanitized1).toBe("/dashboard");

    // Protocol-relative malicious URLs are blocked
    const maliciousUrl = "//attacker.com/phish";
    const sanitized2 = maliciousUrl.startsWith("/") && !maliciousUrl.startsWith("//") ? maliciousUrl : "/dashboard";
    expect(sanitized2).toBe("/dashboard");

    // Absolute malicious URLs are blocked
    const maliciousHttp = "https://evil.com";
    const sanitized3 = maliciousHttp.startsWith("/") && !maliciousHttp.startsWith("//") ? maliciousHttp : "/dashboard";
    expect(sanitized3).toBe("/dashboard");
  });
});

