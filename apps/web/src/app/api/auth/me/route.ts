import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";

export async function GET(request: Request) {
  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl("/api/auth/me/"), {
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
