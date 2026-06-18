import { NextResponse } from "next/server";

function getBackendMeUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/me/", apiBaseUrl).toString();
}

export async function GET(request: Request) {
  let backendResponse: Response;

  try {
    backendResponse = await fetch(getBackendMeUrl(), {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the session service." },
      { status: 502 },
    );
  }

  let responseData: unknown = null;

  try {
    responseData = await backendResponse.json();
  } catch {
    responseData = null;
  }

  return NextResponse.json(
    backendResponse.ok
      ? responseData
      : responseData ?? { detail: "Unable to read the current session." },
    { status: backendResponse.status },
  );
}
