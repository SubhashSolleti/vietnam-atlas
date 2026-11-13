import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  children,
  action,
  className,
  id,
  as: As = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <As id={id} className={cn(As === "h3" ? "text-2xl" : "text-3xl md:text-[2.6rem]")}>
          {title}
        </As>
        {children && <div className="mt-3 text-[1.02rem] text-muted">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
