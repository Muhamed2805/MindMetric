import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { getServerSession } from "../lib/session";

export async function MarketingHeader() {
  const session = await getServerSession();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between px-4">
        <p className="text-base font-semibold tracking-tight">
          <Link href={session ? "/home" : "/"}>MindMetric</Link>
        </p>
        {session ? (
          <Button asChild variant="secondary" size="sm">
            <Link href="/home">Workspace</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
