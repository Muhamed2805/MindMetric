const defaultBase = "http://localhost:3000";

export function apiBaseUrl() {
  return process.env.BETTER_AUTH_URL ?? defaultBase;
}

export async function readApiError(response: Response) {
  if (response.status === 429) {
    return "Too many requests. Try again shortly.";
  }
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function apiSend<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`/api/v1${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json() as Promise<T>;
}
