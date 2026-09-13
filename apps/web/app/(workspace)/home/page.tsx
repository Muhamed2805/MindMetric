import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function WorkspaceHomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
      <p className="max-w-xl text-base leading-7 text-muted">
        This is your workspace. Open Tests to take a published scale. Finished
        sessions show keyed totals and development percentiles under Results.
      </p>
    </div>
  );
}
