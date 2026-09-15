/** Set by `proxy.ts` so the workspace layout can restore `from` after login. */
export const WORKSPACE_PATHNAME_HEADER = "x-mindmetric-pathname";

/** Signed-in workspace prefixes. Keep in sync with `proxy.ts` matcher. */
export const WORKSPACE_ROUTE_PREFIXES = [
  "/home",
  "/tests",
  "/battery",
  "/personality",
  "/games",
  "/results",
  "/account",
  "/run",
] as const;

export function isWorkspacePath(pathname: string) {
  return WORKSPACE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Only send people back into the workspace after login. */
export function safeWorkspaceReturnPath(from: string | undefined) {
  if (!from || from.includes("\\") || from.includes("\0")) {
    return "/home";
  }

  let url: URL;
  try {
    url = new URL(from, "https://mindmetric.local");
  } catch {
    return "/home";
  }

  if (url.origin !== "https://mindmetric.local") {
    return "/home";
  }

  if (!isWorkspacePath(url.pathname)) {
    return "/home";
  }

  return `${url.pathname}${url.search}`;
}
