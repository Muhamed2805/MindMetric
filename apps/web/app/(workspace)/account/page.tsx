import { EmptyState } from "@mindmetric/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Account</h1>
      <EmptyState
        title="Sign-in is not available yet"
        description="Identity, sessions, and roles come in the next phase. This page keeps the account slot in the navigation."
      />
    </div>
  );
}
