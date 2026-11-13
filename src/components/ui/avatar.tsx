import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = 32,
  className,
  muted,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-surface",
        muted && "opacity-45 grayscale",
        className,
      )}
      style={{ background: color, width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
