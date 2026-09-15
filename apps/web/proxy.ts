import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import {
  isWorkspacePath,
  WORKSPACE_PATHNAME_HEADER,
} from "./lib/workspace-guard";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(WORKSPACE_PATHNAME_HEADER, pathname);

  if (isWorkspacePath(pathname) && !sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/home",
    "/home/:path*",
    "/tests",
    "/tests/:path*",
    "/battery",
    "/battery/:path*",
    "/personality",
    "/personality/:path*",
    "/games",
    "/games/:path*",
    "/results",
    "/results/:path*",
    "/account",
    "/account/:path*",
    "/run",
    "/run/:path*",
  ],
};
