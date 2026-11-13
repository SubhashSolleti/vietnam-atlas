"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal built on the native <dialog> element (focus trapping, Esc, inert background).
 * `side` turns it into a drawer.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  side,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  side?: "right" | "left" | "bottom";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d || !open) return;
    // Remember what had focus, and give it back whether the dialog is closed or simply unmounted.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!d.open) d.showModal();
    return () => {
      if (d.open) d.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-5xl" }[size];
  const sideClass =
    side === "right"
      ? "m-0 ml-auto h-dvh max-h-dvh w-full max-w-md rounded-none"
      : side === "left"
        ? "m-0 mr-auto h-dvh max-h-dvh w-[86vw] max-w-sm rounded-none"
        : side === "bottom"
          ? "m-0 mt-auto w-full max-w-none rounded-t-lg rounded-b-none max-h-[88dvh]"
          : cn("w-[calc(100%-2rem)] rounded-lg max-h-[88dvh]", widths);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn("bg-surface text-ink p-0 shadow-[var(--shadow-pop)] backdrop:bg-transparent", sideClass, className)}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col" style={side === "right" || side === "left" ? { height: "100dvh" } : undefined}>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="font-display text-xl">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
