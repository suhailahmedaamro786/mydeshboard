import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSession() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin:${expires}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function isValidAdminSession(value?: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!value || !secret) return false;

  const [payload, receivedSignature] = value.split(".");
  const match = payload?.match(/^admin:(\d+)$/);
  if (!match || !receivedSignature) return false;

  const expires = Number(match[1]);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = signature(payload, secret);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function sessionTtl() {
  return SESSION_TTL_SECONDS;
}
