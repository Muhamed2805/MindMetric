import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "../../../components/auth-form";
import { getServerSession } from "../../../lib/session";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/home");
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm font-semibold tracking-tight">
          <Link href="/">MindMetric</Link>
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Create account
        </h1>
      </div>
      <AuthForm mode="register" nextPath="/home" />
    </main>
  );
}
