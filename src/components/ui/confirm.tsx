"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

type Options = { title: string; description?: string; confirmLabel?: string; tone?: "danger" | "default" };
const Ctx = createContext<((o: Options) => Promise<boolean>) | null>(null);

/** Promise-based confirmation dialog (replaces window.confirm). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const confirm = useCallback((o: Options) => {
    setOpts(o);
    return new Promise<boolean>((res) => (resolver.current = res));
  }, []);
  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
            <Button variant={opts?.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
              {opts?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{opts?.description}</p>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return c;
}
