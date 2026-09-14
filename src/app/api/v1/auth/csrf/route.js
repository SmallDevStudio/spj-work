import { NextResponse } from "next/server";

import { APP_CONFIG } from "@/config/app.config";
import { getCsrfCookieName, getCsrfCookieOptions } from "@/lib/auth/cookies";
import { createCsrfToken } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const csrfToken = createCsrfToken();

  const response = NextResponse.json({
    success: true,
    data: {
      csrfToken,
      headerName: APP_CONFIG.csrf.headerName,
    },
  });

  response.cookies.set(getCsrfCookieName(), csrfToken, getCsrfCookieOptions());

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
