import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceChrome } from "../../components/workspace-chrome";
import { getServerSession } from "../../lib/session";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <WorkspaceChrome>{children}</WorkspaceChrome>;
}
