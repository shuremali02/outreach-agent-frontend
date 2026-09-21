/**
 * Browser-side session (auth-plan.md). Two cookies, written by the login page:
 *   elipse_token  the backend's session token (7 days) -- sent as "Authorization: Bearer" by lib/api/client.ts
 *                 and checked for presence/expiry by proxy.ts
 *   elipse_user   {id,email,name,avatar_url} JSON, only so the top bar can show who is signed in
 * Not httpOnly on purpose: the browser talks to the backend on another domain, so JavaScript has to
 * be able to read the token. Everything here is a no-op on the server.
 */
import type { AuthUser } from "@/types";

export const TOKEN_COOKIE = "elipse_token";
export const USER_COOKIE = "elipse_user";
const WEEK_SECONDS = 7 * 24 * 60 * 60;

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

function writeCookie(name: string, value: string, maxAge: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function getToken(): string {
  return readCookie(TOKEN_COOKIE);
}

/** The raw user cookie ("" when absent or on the server). A plain string, so it is a stable snapshot for React. */
export function readUserCookie(): string {
  return readCookie(USER_COOKIE);
}

export function parseSessionUser(raw: string): AuthUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getSessionUser(): AuthUser | null {
  return parseSessionUser(readUserCookie());
}

export function saveSession(token: string, user: AuthUser): void {
  writeCookie(TOKEN_COOKIE, token, WEEK_SECONDS);
  writeCookie(USER_COOKIE, JSON.stringify(user), WEEK_SECONDS);
}

export function clearSession(): void {
  writeCookie(TOKEN_COOKIE, "", 0);
  writeCookie(USER_COOKIE, "", 0);
}
