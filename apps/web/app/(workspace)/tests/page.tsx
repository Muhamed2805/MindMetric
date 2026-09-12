import { Button, EmptyState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tests",
};

export default function TestsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Tests</h1>
      <EmptyState
        title="No assessments yet"
        description="The first instrument will show up here. This empty state is the catalog until that work lands."
        action={
          <Button asChild variant="secondary">
            <Link href="/home">Back to home</Link>
          </Button>
        }
      />
    </div>
  );
}
