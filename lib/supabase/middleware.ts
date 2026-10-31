import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid using supabase.auth.getSession() in server code.
  // getUser() validates the token by making a network call to the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/verify-email");

  const isPublicRoute =
    isAuthRoute ||
    path === "/" ||
    path === "/sw.js" ||
    path === "/manifest.json" ||
    path.startsWith("/images/") ||
    path.startsWith("/api/auth/callback") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon.ico");

  // Redirect unauthenticated user trying to access protected paths
  if (!user && !isPublicRoute) {
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated user away from login/register back to dashboard
  if (user && isAuthRoute) {
    url.pathname = "/dashboard";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
