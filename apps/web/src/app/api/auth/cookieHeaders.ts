import { NextResponse } from "next/server";

type HeadersWithGetSetCookie = Headers & {
  getSetCookie?: () => string[];
};

export function appendSetCookieHeaders(response: NextResponse, headers: Headers) {
  const setCookies = (headers as HeadersWithGetSetCookie).getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    setCookies.forEach((cookie) => response.headers.append("set-cookie", cookie));
    return;
  }

  const setCookie = headers.get("set-cookie");

  if (setCookie) {
    response.headers.append("set-cookie", setCookie);
  }
}
