import { NextResponse } from "next/server";

function getBackendSignupUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/signup/", apiBaseUrl).toString();
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid signup request body." },
      { status: 400 },
    );
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(getBackendSignupUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the signup service." },
      { status: 502 },
    );
  }

  let responseData: unknown = null;

  try {
    responseData = await backendResponse.json();
  } catch {
    responseData = null;
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      responseData ?? { detail: "Signup failed." },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(responseData, { status: backendResponse.status });
}
