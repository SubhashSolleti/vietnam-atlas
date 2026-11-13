import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...p }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...p} />;
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-bad">
      {children}
    </p>
  );
}

export function Hint({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="mt-1 text-xs text-muted">
      {children}
    </p>
  );
}

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cn("field", className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn("field min-h-24", className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cn("field pr-8", className)} {...p} />;
}

/** Labelled field wrapper that wires up ids for accessibility. */
export function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
}) {
  const id = `f-${name}`;
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && <Hint id={`${id}-hint`}>{hint}</Hint>}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}
