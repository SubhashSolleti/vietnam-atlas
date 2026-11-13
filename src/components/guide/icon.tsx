import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function GuideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ((Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.BookOpen) as LucideIcon;
  return <Icon className={className} aria-hidden />;
}
