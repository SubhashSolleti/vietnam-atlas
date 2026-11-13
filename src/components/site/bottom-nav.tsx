"use client";

import { Compass, Heart, Map, Mountain, Route } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserState } from "./user-state";

const ITEMS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/experiences", label: "Experiences", icon: Mountain },
  { href: "/map", label: "Map", icon: Map },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/trip", label: "Trip", icon: Route },
];

/** Touch-first bottom navigation for key discovery functions (mobile only). */
export function BottomNav() {
  const pathname = usePathname();
  const { state } = useUserState();
  if (pathname.startsWith("/admin")) return null;
  const saved = Object.keys(state.saved).length;
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map((i) => {
          const on = pathname === i.href || pathname.startsWith(`${i.href}/`);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium", on ? "text-brand" : "text-muted")}>
                <i.icon className={cn("size-5", on && "stroke-[2.25]")} />
                {i.label}
                {i.href === "/wishlist" && saved > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.58rem] font-bold text-on-accent tabular-nums">{saved}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
