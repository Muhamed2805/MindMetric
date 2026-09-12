import type { LabelHTMLAttributes } from "react";
import { cn } from "./cn";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  htmlFor: string;
};

export function Label({ className, htmlFor, children, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-ink", className)}
      {...props}
    >
      {children}
    </label>
  );
}
