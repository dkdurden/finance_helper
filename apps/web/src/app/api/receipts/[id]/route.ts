import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";

type ReceiptRouteContext = {
  params: Promise<{ id: string }>;
};

function getCookieValue(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function DELETE(request: Request, context: ReceiptRouteContext) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return NextResponse.json(
      { detail: "Invalid receipt ID." },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = getCookieValue(cookieHeader, "csrftoken");
  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl(`/api/receipts/${id}/`), {
      method: "DELETE",
      headers: {
        cookie: cookieHeader,
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the receipt service." },
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
    responseData ?? { detail: "Receipt deletion failed." },
    { status: backendResponse.status },
  );
}
