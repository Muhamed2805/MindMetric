import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps) {
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-start gap-3 py-8"
      role="alert"
    >
      <h2 className="text-lg font-semibold text-danger">{title}</h2>
      <p className="text-base leading-6 text-muted">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
