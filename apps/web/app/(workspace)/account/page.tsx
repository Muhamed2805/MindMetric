import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "../../../components/page-intro";
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
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageIntro
        kicker="Profile"
        title="Account"
        description="This is the identity attached to your sessions and reports."
      />
      <dl className="grid gap-5 rounded-lg bg-surface px-5 py-5 ring-1 ring-line">
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
