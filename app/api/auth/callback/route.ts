import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");

  // Determine the canonical base URL taking into account reverse proxy headers and custom domains
  let baseUrl = requestUrl.origin;
  if (forwardedHost && process.env.NODE_ENV !== "development") {
    baseUrl = `https://${forwardedHost}`;
  } else if (process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV !== "development") {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // Ensure 'next' parameter is a relative path to prevent open redirect vulnerabilities
  const sanitizedNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${sanitizedNext}`);
    }
  }

  // Return user to login with error code if code exchange failed
  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_failed`);
}
