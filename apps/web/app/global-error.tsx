"use client";

import { Button, ErrorState } from "@mindmetric/ui";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorState
          description="The app failed to load. Try again."
          action={
            <Button type="button" onClick={reset}>
              Try again
            </Button>
          }
        />
      </body>
    </html>
  );
}
