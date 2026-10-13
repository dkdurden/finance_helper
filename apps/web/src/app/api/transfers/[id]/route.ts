import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";

type TransferRouteContext = {
  params: Promise<{ id: string }>;
};

function getCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function isValidId(id: string) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

export async function PATCH(request: Request, context: TransferRouteContext) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid transfer request body." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  if (!isValidId(id)) {
    return NextResponse.json(
      { detail: "Invalid transfer ID." },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = getCookieValue(cookieHeader, "csrftoken");
  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl(`/api/transfers/${id}/`), {
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
      { detail: "Unable to reach the transfer service." },
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
      responseData ?? { detail: "Transfer update failed." },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(responseData, { status: backendResponse.status });
}

export async function DELETE(request: Request, context: TransferRouteContext) {
  const { id } = await context.params;

  if (!isValidId(id)) {
    return NextResponse.json(
      { detail: "Invalid transfer ID." },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = getCookieValue(cookieHeader, "csrftoken");
  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl(`/api/transfers/${id}/`), {
      method: "DELETE",
      headers: {
        cookie: cookieHeader,
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the transfer service." },
      { status: 502 },
    );
  }

  if (backendResponse.status === 204) {
    return new Response(null, { status: 204 });
  }

  let responseData: unknown = null;

  try {
    responseData = await backendResponse.json();
  } catch {
    responseData = null;
  }

  return NextResponse.json(
    responseData ?? { detail: "Transfer deletion failed." },
    { status: backendResponse.status },
  );
}
