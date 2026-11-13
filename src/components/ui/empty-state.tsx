import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
  as: As = "h3",
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-md border border-dashed border-line-strong bg-surface px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 text-muted [&_svg]:size-8">{icon}</div>}
      <As className="font-display text-xl">{title}</As>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
