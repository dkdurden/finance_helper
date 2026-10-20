import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const mutationMethods = new Set(["POST", "PATCH", "DELETE"]);
const jsonBodyMethods = new Set(["POST", "PATCH"]);
const bodylessMutationPaths = new Set(["/api/auth/logout", "/api/auth/logout/"]);

type AllowedRequestTargets = {
  hosts: Set<string>;
  origins: Set<string>;
};

function getAllowedRequestTargets(): AllowedRequestTargets | null {
  const configuredOrigins = process.env.WEB_ALLOWED_ORIGINS;

  if (!configuredOrigins) {
    return null;
  }

  const origins = new Set<string>();
  const hosts = new Set<string>();

  for (const rawOrigin of configuredOrigins.split(",")) {
    const origin = rawOrigin.trim();

    if (!origin) {
      return null;
    }

    let parsedOrigin: URL;

    try {
      parsedOrigin = new URL(origin);
    } catch {
      return null;
    }

    if (
      (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") ||
      parsedOrigin.username ||
      parsedOrigin.password ||
      parsedOrigin.pathname !== "/" ||
      parsedOrigin.search ||
      parsedOrigin.hash ||
      parsedOrigin.origin !== origin
    ) {
      return null;
    }

    origins.add(parsedOrigin.origin);
    hosts.add(parsedOrigin.host.toLowerCase());
  }

  return origins.size > 0 ? { hosts, origins } : null;
}

function jsonError(detail: string, status: number) {
  return NextResponse.json({ detail }, { status });
}

export function proxy(request: NextRequest) {
  const allowedTargets = getAllowedRequestTargets();

  if (!allowedTargets) {
    return jsonError("The web request allowlist is not configured correctly.", 500);
  }

  const requestHost = request.headers.get("host")?.trim().toLowerCase();

  if (!requestHost || !allowedTargets.hosts.has(requestHost)) {
    return jsonError("Request host is not allowed.", 403);
  }

  if (!mutationMethods.has(request.method)) {
    return NextResponse.next();
  }

  const requestOrigin = request.headers.get("origin");

  if (!requestOrigin || !allowedTargets.origins.has(requestOrigin)) {
    return jsonError("Request origin is not allowed.", 403);
  }

  const expectsJsonBody =
    jsonBodyMethods.has(request.method) &&
    !bodylessMutationPaths.has(request.nextUrl.pathname);

  if (expectsJsonBody) {
    const mediaType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (mediaType !== "application/json") {
      return jsonError("Content-Type must be application/json.", 415);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
