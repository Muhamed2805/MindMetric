import type { ReactNode } from "react";
import { WorkspaceChrome } from "../../components/workspace-chrome";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceChrome>{children}</WorkspaceChrome>;
}
