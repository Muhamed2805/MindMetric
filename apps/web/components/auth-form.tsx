"use client";

import { Button, Input, Label } from "@mindmetric/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { authClient } from "../lib/auth-client";

type AuthFormProps = {
  mode: "login" | "register";
  nextPath: string;
};

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const emailId = `${fieldId}-email`;
  const passwordId = `${fieldId}-password`;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "");

    const result =
      mode === "register"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Could not complete the request.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={onSubmit}>
      {mode === "register" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            name="name"
            autoComplete="name"
            required
            minLength={2}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Password</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          required
          minLength={10}
        />
        {mode === "register" ? (
          <p className="text-sm text-muted">At least 10 characters.</p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending
          ? "Please wait"
          : mode === "register"
            ? "Create account"
            : "Sign in"}
      </Button>
      <p className="text-sm text-muted">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link
              className="font-medium text-ink underline"
              href={`/login?from=${encodeURIComponent(nextPath)}`}
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link
              className="font-medium text-ink underline"
              href={`/register?from=${encodeURIComponent(nextPath)}`}
            >
              Create one
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
