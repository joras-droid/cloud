import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/auth/constants";
import { normalizeNepalPhone } from "./lib/phone";
import {
  TRACK_COOKIE,
  signTrackToken,
  trackCookieOptions,
} from "./lib/track/token";

const intlProxy = createMiddleware(routing);

/**
 * The admin panel is a staff tool: English only, never locale-prefixed, and
 * never indexed. The cookie check here is a cheap redirect for logged-out
 * users — it is NOT the authorization boundary. Every admin action re-verifies
 * the session and role server-side.
 *
 * /track/9800000000 and /ne/track/9800000000 open that customer's orders.
 */
function phoneFromTrackPath(pathname: string): string | null {
  const match = pathname.match(/^(?:\/(?:en|ne))?\/track\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  return normalizeNepalPhone(decodeURIComponent(match[1]));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");

    if (pathname === "/admin/login") return response;

    if (!request.cookies.get(SESSION_COOKIE)) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return response;
  }

  const response = intlProxy(request);
  const phone = phoneFromTrackPath(pathname);
  if (phone) {
    response.cookies.set(TRACK_COOKIE, await signTrackToken(phone), trackCookieOptions());
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, and static files.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
