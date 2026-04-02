import crypto from "node:crypto";

export const ADMIN_LOGIN = process.env.ADMIN_LOGIN?.trim() || "admin";
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH?.trim() || "";

export const ADMIN_SESSION_COOKIE = "robbit_admin_session";
export const ADMIN_SESSION_VALUE = "ok";

export function isValidAdminCredentials(login: string, password: string): boolean {
  if (!ADMIN_LOGIN || !ADMIN_PASSWORD_HASH) return false;
  if (login !== ADMIN_LOGIN) return false;

  const providedHash = crypto.createHash("sha256").update(password, "utf8").digest("hex");
  const a = Buffer.from(ADMIN_PASSWORD_HASH, "utf8");
  const b = Buffer.from(providedHash, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
