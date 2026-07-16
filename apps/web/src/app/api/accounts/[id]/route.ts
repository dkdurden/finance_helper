import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";

type AccountRouteContext = {
  params: Promise<{ id: string }>;
};

function getCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function PATCH(request: Request, context: AccountRouteContext) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid account request body." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return NextResponse.json(
      { detail: "Invalid account ID." },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = getCookieValue(cookieHeader, "csrftoken");
  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl(`/api/accounts/${id}/`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the account service." },
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
      responseData ?? { detail: "Account update failed." },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(responseData, { status: backendResponse.status });
}
