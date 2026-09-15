import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "../../../components/auth-form";
import { BrandMark } from "../../../components/brand-mark";
import { getServerSession } from "../../../lib/session";
import { safeWorkspaceReturnPath } from "../../../lib/workspace-guard";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const nextPath = safeWorkspaceReturnPath(from);
  const session = await getServerSession();
  if (session) {
    redirect(nextPath);
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <div>
        <p>
          <BrandMark href="/" />
        </p>
        <h1 className="mt-8 font-serif text-3xl font-medium tracking-tight">
          Create account
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Your results stay on this account. Password must be at least 10
          characters.
        </p>
      </div>
      <AuthForm mode="register" nextPath={nextPath} />
    </main>
  );
}
