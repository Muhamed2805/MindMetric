import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceChrome } from "../../components/workspace-chrome";
import { getServerSession } from "../../lib/session";
import {
  safeWorkspaceReturnPath,
  WORKSPACE_PATHNAME_HEADER,
} from "../../lib/workspace-guard";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    const pathname = (await headers()).get(WORKSPACE_PATHNAME_HEADER);
    const from = safeWorkspaceReturnPath(pathname ?? undefined);
    redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  return <WorkspaceChrome>{children}</WorkspaceChrome>;
}
