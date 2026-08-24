import { NextRequest, NextResponse } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];

/**
 * Optimistic auth gate: checks the `session` cookie exists, without verifying
 * its signature. `jsonwebtoken.verify` (see lib/auth.ts) needs Node's crypto
 * module, which isn't available in the Edge runtime middleware runs in, so
 * real verification stays server-side in requireUser()/AuthGuard. This just
 * stops unauthenticated users reaching protected pages and bounces logged-in
 * users off /login and /register before the page renders.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("session")?.value);
  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!hasSession && !isAuthRoute) {
    const loginUrl = new URL("/login/", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - api routes (they run their own requireUser() check)
     * - Next internals (_next/static, _next/image)
     * - any request for a file with an extension (icons, manifest.json,
     *   sw.js, workbox-*.js, public/brand/*.svg, etc.) — those are static
     *   assets, not pages, and must never be redirected to /login.
     */
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
