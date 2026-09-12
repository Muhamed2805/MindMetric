import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "../../../components/sign-out-button";
import { getServerSession } from "../../../lib/session";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <dl className="grid gap-4 text-base">
        <div>
          <dt className="text-sm text-muted">Name</dt>
          <dd className="mt-1 text-ink">{session.user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Email</dt>
          <dd className="mt-1 text-ink">{session.user.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Role</dt>
          <dd className="mt-1 text-ink">{session.user.role ?? "user"}</dd>
        </div>
      </dl>
      <SignOutButton />
    </div>
  );
}
