import { NextResponse } from "next/server";
import { appendSetCookieHeaders } from "../cookieHeaders";

function getBackendLogoutUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/logout/", apiBaseUrl).toString();
}

function getCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function POST(request: Request) {
  let backendResponse: Response;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = getCookieValue(cookieHeader, "csrftoken");

  try {
    backendResponse = await fetch(getBackendLogoutUrl(), {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the logout service." },
      { status: 502 },
    );
  }

  const response =
    backendResponse.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(
          { detail: "Logout failed." },
          { status: backendResponse.status },
        );
  appendSetCookieHeaders(response, backendResponse.headers);

  return response;
}
