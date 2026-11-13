import "server-only";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { TripAccessError } from "@/services/trips";

export class UserError extends Error {}

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> };

const DEFAULT_MESSAGE = /^(Too (big|small)|Invalid (input|option|string|format|element|key|union|value)|Expected |Required$)/;

/** Turns the validator's default wording ("Too big: expected number to be <=10000000") into a plain sentence. */
function friendly(issue: ZodError["issues"][number]) {
  if (!DEFAULT_MESSAGE.test(issue.message)) return issue.message; // a message written for people already
  const key = String(issue.path.at(-1) ?? "");
  const field = key && !/^\d+$/.test(key) ? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b(vnd|inr|pct)\b/gi, "").trim().toLowerCase() : "this value";
  const name = field.charAt(0).toUpperCase() + field.slice(1);
  const i = issue as unknown as { code: string; origin?: string; minimum?: number | bigint; maximum?: number | bigint; expected?: string };
  const n = (v: number | bigint | undefined) => Number(v).toLocaleString("en-IN");
  switch (i.code) {
    case "too_big":
      return i.origin === "string" ? `${name} can be at most ${n(i.maximum)} characters.` : i.origin === "array" ? `${name} can have at most ${n(i.maximum)} entries.` : `${name} must be ${n(i.maximum)} or less.`;
    case "too_small":
      return i.origin === "string" ? (Number(i.minimum) <= 1 ? `${name} is required.` : `${name} needs at least ${n(i.minimum)} characters.`) : i.origin === "array" ? `Choose at least ${n(i.minimum)} for ${field}.` : `${name} must be at least ${n(i.minimum)}.`;
    case "invalid_type":
      return i.expected === "int" || i.expected === "number" ? `${name} must be a whole number.` : `${name} is missing or invalid.`;
    case "not_multiple_of":
      return `${name} must be a whole number.`;
    default:
      return `${name} isn't valid.`;
  }
}

/** Wraps a server action body: converts expected errors into a typed result for the UI. */
export async function run<T extends object>(fn: () => Promise<T> | T): Promise<ActionResult<T>> {
  try {
    const r = await fn();
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of e.issues) fieldErrors[i.path.join(".")] ??= friendly(i);
      return { ok: false, error: e.issues[0] ? friendly(e.issues[0]) : "Please check the form.", fieldErrors };
    }
    if (e instanceof AuthError || e instanceof TripAccessError || e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
