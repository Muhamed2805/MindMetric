import { headers } from "next/headers";
import { apiBaseUrl, readApiError } from "./api";

export async function apiGet<T>(path: string): Promise<T> {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id");
  const response = await fetch(`${apiBaseUrl()}/api/v1${path}`, {
    headers: {
      cookie: headerList.get("cookie") ?? "",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json() as Promise<T>;
}
