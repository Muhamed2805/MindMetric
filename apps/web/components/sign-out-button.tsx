"use client";

import { Button } from "@mindmetric/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? "Signing out" : "Sign out"}
    </Button>
  );
}
