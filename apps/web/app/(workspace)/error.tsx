"use client";

import { Button, ErrorState } from "@mindmetric/ui";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      description="The workspace failed to load. Try again."
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
