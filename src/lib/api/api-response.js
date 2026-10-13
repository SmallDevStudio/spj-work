import "server-only";

import { NextResponse } from "next/server";

import { AuthSessionError } from "@/lib/auth/auth-session-error";
import { ApplicationError } from "@/lib/errors/application-error";

export function createSuccessResponse(data, options = {}) {
  const response = NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status: options.status ?? 200,
    },
  );

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

export function createApiErrorResponse(error, context = "API") {
  if (error instanceof AuthSessionError || error instanceof ApplicationError) {
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      {
        status: error.status,
      },
    );

    response.headers.set("Cache-Control", "no-store, max-age=0");

    return response;
  }

  console.error(`[${context}]`, error);

  const response = NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        details: null,
      },
    },
    {
      status: 500,
    },
  );

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

export async function readJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    throw new ApplicationError({
      code: "INVALID_REQUEST_BODY",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }
}
