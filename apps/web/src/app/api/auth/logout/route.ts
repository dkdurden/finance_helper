import { NextResponse } from "next/server";

function getBackendLogoutUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/logout/", apiBaseUrl).toString();
}

export async function POST(request: Request) {
  let backendResponse: Response;

  try {
    backendResponse = await fetch(getBackendLogoutUrl(), {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        // TODO: Forward X-CSRFToken once the frontend CSRF token flow is wired.
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
  const sessionCookie = backendResponse.headers.get("set-cookie");

  if (sessionCookie) {
    response.headers.set("set-cookie", sessionCookie);
  }

  return response;
}
