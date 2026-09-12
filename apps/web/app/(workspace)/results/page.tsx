import { Button, EmptyState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Results",
};

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Results</h1>
      <EmptyState
        title="No results yet"
        description="Completed assessments will list here with charts sized to the content column, not the window."
        action={
          <Button asChild variant="secondary">
            <Link href="/tests">Go to tests</Link>
          </Button>
        }
      />
    </div>
  );
}
