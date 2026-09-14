import { NextResponse } from "next/server";

const DEVELOPMENT_SESSION_COOKIE = "spj_session";

const PRODUCTION_SESSION_COOKIE = "__Host-spj_session";

function getSessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_SESSION_COOKIE
    : DEVELOPMENT_SESSION_COOKIE;
}

export function proxy(request) {
  const sessionCookie = request.cookies.get(getSessionCookieName())?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
