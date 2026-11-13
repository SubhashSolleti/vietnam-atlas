"use client";

import { Activity, CalendarDays, ClipboardList, Gauge, Landmark, MapPin, MessageSquare, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: Gauge, exact: true },
  { href: "/admin/destinations", label: "Destinations", icon: MapPin },
  { href: "/admin/attractions", label: "Attractions", icon: Landmark },
  { href: "/admin/activities", label: "Activities", icon: Activity },
  { href: "/admin/events", label: "Events & communities", icon: CalendarDays },
  { href: "/admin/feedback", label: "Feedback & reviews", icon: MessageSquare },
  { href: "/admin/users", label: "Users", icon: Users, superOnly: true },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({ role, name }: { role: string; name: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-20 lg:self-start">
      <p className="eyebrow">Content management</p>
      <p className="mt-1 text-sm text-muted">{name} · {role.replace("_", " ")}</p>
      <ul className="mt-4 flex gap-1 relative overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {ITEMS.filter((i) => !i.superOnly || role === "super_admin").map((i) => {
          const on = i.exact ? path === i.href : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-2 rounded-sm px-3 py-2 text-sm whitespace-nowrap", on ? "bg-surface-2 font-semibold" : "text-muted hover:text-ink")}>
                <i.icon className="size-4" />{i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
