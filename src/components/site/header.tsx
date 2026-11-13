"use client";

import { Briefcase, ChevronDown, LayoutDashboard, LogIn, LogOut, Menu, Monitor, Moon, Search, Sun, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction, setTheme } from "@/app/actions/account";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DISCOVER_NAV, PLAN_NAV } from "./nav";
import { SearchDialog } from "./search-dialog";
import { useUserState } from "./user-state";

export function Wordmark({ light }: { light?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", light ? "text-white" : "text-ink")} aria-label="Vietnam Atlas: home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".35" />
        <path d="M17.5 4.5c-2 2.2-1.2 4.8-2.6 7-1.2 1.9-3.4 2.6-3.6 5.2-.2 2.5 2 3.6 3.2 5.6 1 1.6.6 3.8 1.6 5.2 1.3-.8 3.2-1.6 3.6-3.6.5-2.4-2.4-3.4-2.6-5.8-.2-2.6 2.6-3.6 2.8-6.4.2-2.6-1.8-4.6-2.4-7.2Z" fill="var(--color-terracotta)" />
      </svg>
      <span className="leading-none">
        <span className="block font-serif text-[1.18rem] font-semibold tracking-tight">Vietnam Atlas</span>
        <span className={cn("hidden text-[0.6rem] tracking-[0.2em] whitespace-nowrap uppercase sm:block", light ? "text-white/70" : "text-muted")}>Discover · Experience · Plan</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ initialTheme, overlay }: { initialTheme: "system" | "light" | "dark"; overlay?: boolean }) {
  const pathname = usePathname();
  const { state } = useUserState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isOverlay = overlay && pathname === "/" && !scrolled;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onOpen = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("atlas:search", onOpen);
    onScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("atlas:search", onOpen);
    };
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const savedCount = Object.keys(state.saved).length;
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header
        className={cn(
          "top-0 z-50 w-full transition-[background,border-color,color] duration-200",
          overlay && pathname === "/" ? "fixed" : "sticky",
          isOverlay ? "border-b border-transparent bg-transparent text-white" : "border-b border-line bg-bg/92 text-ink backdrop-blur-md",
        )}
      >
        <div className="container-x flex h-16 items-center gap-3">
          <button
            type="button"
            className={cn("-ml-2 grid size-10 place-items-center rounded-full lg:hidden", isOverlay ? "hover:bg-white/10" : "hover:bg-surface-2")}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Wordmark light={isOverlay} />

          <nav aria-label="Discover" className="ml-4 hidden min-w-0 items-center gap-0.5 lg:flex xl:ml-6">
            {DISCOVER_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-sm px-2.5 py-2 text-[0.84rem] font-medium whitespace-nowrap transition-colors xl:px-3",
                  isOverlay ? "text-white/85 hover:text-white" : "text-muted hover:text-ink",
                  active(n.href) && (isOverlay ? "text-white" : "text-ink"),
                  active(n.href) && "after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-accent",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border px-3 text-sm",
                isOverlay ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
              )}
              aria-label="Search (Ctrl+K)"
            >
              <Search className="size-4" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="hidden rounded-xs border border-current/25 px-1 text-[0.65rem] opacity-70 xl:inline">⌘K</kbd>
            </button>
            <nav aria-label="Plan" className="hidden items-center lg:flex">
              {PLAN_NAV.map((n) => {
                const Icon = n.icon;
                const count = n.href === "/wishlist" ? savedCount : 0;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active(n.href) ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[0.84rem] font-medium",
                      isOverlay ? "text-white/90 hover:bg-white/10" : "text-muted hover:bg-surface-2 hover:text-ink",
                      active(n.href) && (isOverlay ? "bg-white/15 text-white" : "bg-surface-2 text-ink"),
                    )}
                    title={n.label}
                  >
                    <Icon className="size-4" />
                    <span className="hidden 2xl:inline">{n.label}</span>
                    <span className="hidden xl:inline 2xl:hidden">{n.short}</span>
                    {count > 0 && (
                      <span className="absolute -top-0.5 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.6rem] font-bold text-on-accent tabular-nums xl:static xl:ml-0.5">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <AccountMenu light={isOverlay} initialTheme={initialTheme} />
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Vietnam Atlas" side="left">
        <nav aria-label="Main menu" className="-mx-2 flex flex-col">
          <p className="eyebrow px-2 pt-1 pb-2">Discover</p>
          {DISCOVER_NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex items-center gap-3 rounded-md px-2 py-2.5 text-[0.95rem]", active(n.href) ? "bg-surface-2 font-semibold" : "hover:bg-surface-2")}>
              <n.icon className="size-[18px] text-muted" />
              {n.label}
            </Link>
          ))}
          <p className="eyebrow px-2 pt-5 pb-2">Plan</p>
          {PLAN_NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex items-center gap-3 rounded-md px-2 py-2.5 text-[0.95rem]", active(n.href) ? "bg-surface-2 font-semibold" : "hover:bg-surface-2")}>
              <n.icon className="size-[18px] text-muted" />
              {n.label}
              {n.href === "/wishlist" && savedCount > 0 && <span className="ml-auto text-xs text-muted tabular-nums">{savedCount}</span>}
            </Link>
          ))}
          <Link href="/connect" className="mt-1 flex items-center gap-3 rounded-md px-2 py-2.5 text-[0.95rem] hover:bg-surface-2">
            <Briefcase className="size-[18px] text-muted" />
            Work &amp; Connect
          </Link>
        </nav>
      </Dialog>
    </>
  );
}

function AccountMenu({ light, initialTheme }: { light?: boolean; initialTheme: "system" | "light" | "dark" }) {
  const { state } = useUserState();
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState(initialTheme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const changeTheme = (t: "system" | "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    document.cookie = `atlas_theme=${t}; path=/; max-age=${365 * 86400}; samesite=lax`;
    void setTheme(t);
  };

  const u = state.user;
  const isAdmin = u && (u.role === "super_admin" || u.role === "content_editor");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account and settings"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-9 items-center gap-1 rounded-full pr-1.5 pl-0.5", light ? "hover:bg-white/10" : "hover:bg-surface-2")}
      >
        {u ? (
          <Avatar name={u.displayName} color={u.avatarColor} size={30} />
        ) : (
          <span className={cn("grid size-[30px] place-items-center rounded-full border", light ? "border-white/40" : "border-line-strong")}>
            <User className="size-4" />
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-60" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-[var(--shadow-pop)]">
          <div className="border-b border-line px-4 py-3">
            {u ? (
              <>
                <p className="truncate text-sm font-semibold">{u.displayName}</p>
                <p className="text-xs text-muted">{u.isGuest ? "Guest: saved on this device" : "Signed in"}</p>
              </>
            ) : (
              <p className="text-sm text-muted">Browsing as a visitor</p>
            )}
          </div>
          <div className="py-1 text-sm">
            <Link role="menuitem" href="/account" className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-2" onClick={() => setOpen(false)}>
              <User className="size-4 text-muted" /> Account &amp; privacy
            </Link>
            <Link role="menuitem" href="/connect" className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-2" onClick={() => setOpen(false)}>
              <Briefcase className="size-4 text-muted" /> Work &amp; Connect
            </Link>
            {isAdmin && (
              <Link role="menuitem" href="/admin" className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-2" onClick={() => setOpen(false)}>
                <LayoutDashboard className="size-4 text-muted" /> Admin
              </Link>
            )}
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted">Theme</p>
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-0.5">
              {(
                [
                  ["light", Sun, "Light"],
                  ["dark", Moon, "Dark"],
                  ["system", Monitor, "Auto"],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={theme === v}
                  onClick={() => changeTheme(v)}
                  className={cn("flex h-8 items-center justify-center gap-1 rounded-[6px] text-xs", theme === v ? "bg-surface font-semibold shadow-sm" : "text-muted")}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-line py-1 text-sm">
            {!u || u.isGuest ? (
              <Link role="menuitem" href="/login" className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-2" onClick={() => setOpen(false)}>
                <LogIn className="size-4 text-muted" /> Sign in or create account
              </Link>
            ) : (
              <form action={logoutAction}>
                <button role="menuitem" type="submit" className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-2">
                  <LogOut className="size-4 text-muted" /> Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
