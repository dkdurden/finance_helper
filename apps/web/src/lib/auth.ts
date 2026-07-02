import "server-only";

import { cookies } from "next/headers";
import { backendUrl } from "./backendUrl";

type CurrentUser = {
  email: string;
  id: number;
  name: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  let response: Response;

  try {
    response = await fetch(backendUrl("/api/auth/me/"), {
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
