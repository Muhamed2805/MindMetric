import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function WorkspaceHomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
      <p className="max-w-xl text-base leading-7 text-muted">
        This is the signed-in workspace shell. Catalog, scoring, and accounts
        are not wired yet. Navigation already changes at 768px: a sidebar on
        desktop and a bottom bar on the phone.
      </p>
    </div>
  );
}
