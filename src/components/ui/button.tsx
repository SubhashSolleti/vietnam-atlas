import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "light" | "accent";
type Size = "xs" | "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-[background,color,border-color,transform] duration-150 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px select-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-[color-mix(in_srgb,var(--brand)_88%,black)]",
  accent: "bg-accent text-on-accent hover:bg-[color-mix(in_srgb,var(--accent)_88%,black)]",
  secondary: "bg-surface-2 text-ink hover:bg-line",
  outline: "border border-line-strong bg-surface text-ink hover:border-ink",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-bad text-on-accent hover:opacity-90",
  light: "bg-white/95 text-charcoal hover:bg-white backdrop-blur",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs rounded-sm",
  sm: "h-8 px-3 text-sm rounded-sm",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-[0.95rem] rounded-md",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

