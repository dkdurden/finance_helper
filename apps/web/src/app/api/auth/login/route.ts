import { NextResponse } from "next/server";

function getBackendLoginUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/login/", apiBaseUrl).toString();
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid login request body." },
      { status: 400 },
    );
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(getBackendLoginUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the login service." },
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
      : responseData ?? { detail: "Login failed." },
    { status: backendResponse.status },
  );
  const sessionCookie = backendResponse.headers.get("set-cookie");

  if (sessionCookie) {
    response.headers.set("set-cookie", sessionCookie);
  }

  return response;
}
