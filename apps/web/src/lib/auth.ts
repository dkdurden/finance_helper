import "server-only";

import { cookies } from "next/headers";

type CurrentUser = {
  email: string;
  id: number;
  name: string;
};

function getBackendMeUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL("/api/auth/me/", apiBaseUrl).toString();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  let response: Response;

  try {
    response = await fetch(getBackendMeUrl(), {
      method: "GET",
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new Error("Unable to reach the session service.", { cause: error });
  }

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Session lookup failed with status ${response.status}.`);
  }

  return response.json();
}
