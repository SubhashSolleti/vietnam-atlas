"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_FX, type FxRates } from "@/lib/money";

const FxCtx = createContext<FxRates>(DEFAULT_FX);

export function FxProvider({ value, children }: { value: FxRates; children: ReactNode }) {
  return <FxCtx.Provider value={value}>{children}</FxCtx.Provider>;
}

export function useFx() {
  return useContext(FxCtx);
}
