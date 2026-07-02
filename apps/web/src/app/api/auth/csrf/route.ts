import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";
import { appendSetCookieHeaders } from "../cookieHeaders";

export async function GET() {
  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl("/api/auth/csrf/"), {
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
