import { randomBytes, scryptSync } from "node:crypto";

/** Same format as src/lib/auth.ts hashPassword (scrypt$salt$key), synchronous for the seed script. */
export function hashPasswordSync(password: string) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
