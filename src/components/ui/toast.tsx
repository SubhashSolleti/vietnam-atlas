"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "error";
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

const Ctx = createContext<{ toast: (t: Omit<ToastItem, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-3), { ...t, id }]);
      // Toasts with an action stay longer, and none disappears while it is hovered or holds keyboard focus.
      const expire = () => {
        const el = document.querySelector(`[data-toast-id="${id}"]`);
        if (el?.matches(":hover, :focus-within")) setTimeout(expire, 1500);
        else dismiss(id);
      };
      setTimeout(expire, t.action ? 10_000 : t.tone === "error" ? 7000 : 4200);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6"
      >
        {items.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? TriangleAlert : Info;
          return (
            <div
              key={t.id}
              data-toast-id={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm shadow-[var(--shadow-pop)] animate-[toastIn_.22s_ease-out]"
            >
              <Icon className={cn("mt-0.5 size-[18px] shrink-0", t.tone === "success" ? "text-good" : t.tone === "error" ? "text-bad" : "text-brand-2")} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-muted">{t.description}</p>}
                {t.action && (
                  t.action.href ? (
                    <a href={t.action.href} className="mt-1 inline-block font-semibold text-accent underline-offset-2 hover:underline">
                      {t.action.label}
                    </a>
                  ) : (
                    <button type="button" onClick={t.action.onClick} className="mt-1 font-semibold text-accent hover:underline">
                      {t.action.label}
                    </button>
                  )
                )}
              </div>
              <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="-m-2 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}
