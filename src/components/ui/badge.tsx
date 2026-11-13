import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "good" | "warn" | "bad" | "brand" | "accent" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  good: "bg-good-soft text-good border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  bad: "bg-bad-soft text-bad border-transparent",
  brand: "bg-brand text-brand-ink border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
  dark: "bg-charcoal/80 text-white border-transparent backdrop-blur",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[0.7rem] font-semibold tracking-wide whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
