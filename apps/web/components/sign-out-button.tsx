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
      variant="ghost"
      className="h-10 w-full justify-start px-0 text-[13.5px] font-normal text-muted"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? "Signing out" : "Log out"}
    </Button>
  );
}
