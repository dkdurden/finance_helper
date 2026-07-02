import "server-only";

export function backendUrl(path: string) {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return new URL(path, apiBaseUrl).toString();
}
