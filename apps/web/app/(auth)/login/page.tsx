import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "../../../components/auth-form";
import { BrandMark } from "../../../components/brand-mark";
import { getServerSession } from "../../../lib/session";
import { safeWorkspaceReturnPath } from "../../../lib/workspace-guard";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
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
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Use the email and password for your MindMetric account.
        </p>
      </div>
      <AuthForm mode="login" nextPath={nextPath} />
    </main>
  );
}
