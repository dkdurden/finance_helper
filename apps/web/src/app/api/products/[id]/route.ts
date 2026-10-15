import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/backendUrl";

type ProductRouteContext = { params: Promise<{ id: string }> };

function getCookieValue(cookieHeader: string, name: string) {
  return cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function PATCH(request: Request, context: ProductRouteContext) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ detail: "Invalid product request body." }, { status: 400 });
  }
  const { id } = await context.params;
  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return NextResponse.json({ detail: "Invalid product ID." }, { status: 400 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const csrfToken = getCookieValue(cookieHeader, "csrftoken");
  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl(`/api/products/${id}/`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: cookieHeader, ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Unable to reach the product service." }, { status: 502 });
  }
  let responseData: unknown = null;
  try { responseData = await backendResponse.json(); } catch { responseData = null; }
  if (!backendResponse.ok) {
    return NextResponse.json(responseData ?? { detail: "Product update failed." }, { status: backendResponse.status });
  }
  return NextResponse.json(responseData, { status: backendResponse.status });
}
