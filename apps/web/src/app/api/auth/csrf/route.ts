import { NextResponse } from "next/server";
import { appendSetCookieHeaders } from "../cookieHeaders";

function getBackendCsrfUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/csrf/", apiBaseUrl).toString();
}

export async function GET() {
  let backendResponse: Response;

  try {
    backendResponse = await fetch(getBackendCsrfUrl(), {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the CSRF service." },
      { status: 502 },
    );
  }

  let responseData: unknown = null;

  try {
    responseData = await backendResponse.json();
  } catch {
    responseData = null;
  }

  const response = NextResponse.json(
    backendResponse.ok
      ? responseData
      : responseData ?? { detail: "Unable to initialize CSRF." },
    { status: backendResponse.status },
  );
  appendSetCookieHeaders(response, backendResponse.headers);

  return response;
}
