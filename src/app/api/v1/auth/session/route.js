import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthSessionError } from "@/lib/auth/auth-session-error";
import {
  getCsrfCookieName,
  getExpiredCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/cookies";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  createApplicationSession,
  verifyApplicationSession,
} from "@/services/auth/session.service";

export const dynamic = "force-dynamic";

const sessionRequestSchema = z.object({
  idToken: z.string().trim().min(100).max(10000),
});

function createErrorResponse(error) {
  if (error instanceof AuthSessionError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      {
        status: error.status,
      },
    );
  }

  console.error("[Authentication Session API]", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    {
      status: 500,
    },
  );
}

function setNoStoreHeaders(response) {
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

function getRequestContext(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  const ipAddress = forwardedFor?.split(",")[0]?.trim()?.slice(0, 120);

  const userAgent = request.headers.get("user-agent")?.slice(0, 500);

  return {
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  };
}

function createSessionPayload({ identity, access }) {
  return {
    authenticated: true,
    user: identity,
    organization: access.organization,
    membership: access.membership,
    role: access.membership.role,
    permissions: access.permissions,
  };
}

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get(getSessionCookieName())?.value;

    const { identity, access } = await verifyApplicationSession(sessionCookie);

    return setNoStoreHeaders(
      NextResponse.json({
        success: true,
        data: createSessionPayload({
          identity,
          access,
        }),
      }),
    );
  } catch (error) {
    return setNoStoreHeaders(createErrorResponse(error));
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    let requestBody;

    try {
      requestBody = await request.json();
    } catch {
      throw new AuthSessionError({
        code: "AUTH_INVALID_REQUEST_BODY",
        message: "Request body must be valid JSON.",
        status: 400,
      });
    }

    const validationResult = sessionRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      throw new AuthSessionError({
        code: "AUTH_INVALID_ID_TOKEN",
        message: "Authentication token is required.",
        status: 400,
      });
    }

    const { sessionCookie, identity, access } = await createApplicationSession({
      idToken: validationResult.data.idToken,
      requestContext: getRequestContext(request),
    });

    const response = NextResponse.json({
      success: true,
      data: createSessionPayload({
        identity,
        access,
      }),
    });

    response.cookies.set(
      getSessionCookieName(),
      sessionCookie,
      getSessionCookieOptions(),
    );

    response.cookies.set(getCsrfCookieName(), "", getExpiredCookieOptions());

    return setNoStoreHeaders(response);
  } catch (error) {
    return setNoStoreHeaders(createErrorResponse(error));
  }
}

export async function DELETE(request) {
  try {
    validateStateChangingRequest(request);

    const response = NextResponse.json({
      success: true,
      data: {
        authenticated: false,
      },
    });

    response.cookies.set(getSessionCookieName(), "", getExpiredCookieOptions());

    response.cookies.set(getCsrfCookieName(), "", getExpiredCookieOptions());

    return setNoStoreHeaders(response);
  } catch (error) {
    return setNoStoreHeaders(createErrorResponse(error));
  }
}
