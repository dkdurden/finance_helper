import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";
import { appendSetCookieHeaders } from "../cookieHeaders";

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
    backendResponse = await fetch(backendUrl("/api/auth/login/"), {
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
  appendSetCookieHeaders(response, backendResponse.headers);

  return response;
}
