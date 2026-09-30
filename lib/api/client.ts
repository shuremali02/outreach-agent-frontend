import { clearSession, getToken } from "@/lib/auth";
import type { ApiError } from "@/types";

/**
 * Single seam between the UI and outreach-backend (uv + FastAPI + MySQL).
 *
 * NEXT_PUBLIC_API_URL is required — the temporary mock handlers that used to
 * live under app/api/ are gone, so there is no same-origin fallback to hit.
 * Failing loudly here beats every request 404ing with no explanation.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

// Dev gets the actionable, specific message (the backend URL, the exact fix); production gets a generic
// one -- 2026-09-28, a teammate's screenshot of the dev-only message (their own .env.local pointed at the
// LIVE backend URL by mistake) showed that URL and an internal run command on screen: "security kahan gayi,
// user friendly error hona chahiye". Next.js replaces NODE_ENV at build time, so this costs nothing at
// runtime and the detailed branch is simply not present in a `next build` bundle at all.
const isDev = process.env.NODE_ENV !== "production";

function baseUrl(): string {
  if (!API_URL) {
    throw new Error(
      isDev
        ? "NEXT_PUBLIC_API_URL is not set. Point it at outreach-backend, e.g. " +
          "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 in .env.local, then restart the dev server."
        : "This app is not configured correctly. Please contact your admin.",
    );
  }
  return API_URL;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * FastAPI's error envelope is `{detail}`, where detail is a string for an
 * HTTPException but an array of {loc, msg} for a 422. Flatten both to one line
 * so error.tsx never renders "[object Object]".
 */
function describeError(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { detail, error } = body as ApiError;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        // "Value error, <sentence>" comes from a validator we wrote for people to read: show the sentence alone.
        if (d.msg.startsWith("Value error, ")) return d.msg.slice("Value error, ".length);
        const field = d.loc.filter((p) => p !== "body").join(".");
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  return typeof error === "string" ? error : undefined;
}

// A 502/503/504 here means Hugging Face's OWN gateway rejected the request -- confirmed live 2026-09-28
// by comparing the browser's failing requests against the backend's own access log, which never showed
// them at all. The app never even saw the request, so retrying (any method, not just GET) cannot double
// up a write. These are also usually gone within a second (a transient gateway hiccup on the Space's free
// tier, or the few seconds a redeploy/restart takes), and this app's ONE server-side data fetch per page
// (a Server Component's initial render) had no retry at all before this -- one bad gateway response there
// crashed the whole page (the live "This view failed to load" / minified React error incident).
const _RETRYABLE_STATUS = new Set([502, 503, 504]);
// Widened 2026-09-28: 2 retries (under ~1.5s) turned out not to be enough -- a live gateway hiccup outlasted
// it. 4 retries, longer backoff, ~7s worst case -- still fast next to a rep just clicking again, but covers
// a longer blip. If it STILL fails after this many, the outage is sustained, not transient -- no amount of
// client-side retrying fixes that; see the "live incident" docs.md entry for the escalation path.
const _RETRY_DELAYS_MS = [300, 700, 1500, 3000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastNetworkError: unknown;
  for (let attempt = 0; attempt <= _RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!_RETRYABLE_STATUS.has(res.status) || attempt === _RETRY_DELAYS_MS.length) return res;
      lastNetworkError = undefined;
    } catch (exc) {
      lastNetworkError = exc;
      if (attempt === _RETRY_DELAYS_MS.length) throw exc;
    }
    await sleep(_RETRY_DELAYS_MS[attempt]);
  }
  // Unreachable (the loop above always returns or throws), but keeps TypeScript happy about the return type.
  throw lastNetworkError ?? new Error("fetchWithRetry: exhausted retries");
}

async function request<T>(
  path: string,
  init: RequestInit & { query?: Query } = {},
): Promise<T> {
  const { query, ...rest } = init;
  const base = baseUrl();
  const url = `${base}${withQuery(path, query)}`;

  // Who is calling. In the browser: the signed-in user's token (so the backend records who did
  // what). On the server (a page's initial data fetch): the server-to-server API_KEY, which is
  // never set in the browser bundle -- process.env.API_KEY is undefined there, by design.
  const auth: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = getToken();
    if (token) auth.Authorization = `Bearer ${token}`;
  } else if (process.env.API_KEY) {
    auth["X-API-Key"] = process.env.API_KEY;
  }

  let res: Response;
  try {
    res = await fetchWithRetry(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...auth,
        ...(rest.headers ?? {}),
      },
      // Always read through; the query cache decides what is fresh.
      cache: "no-store",
    });
  } catch {
    // The raw error here is a bare "TypeError: fetch failed" -- true for a
    // dead backend, a wrong port, or (Windows) "localhost" resolving to the
    // IPv6 loopback when uvicorn only binds IPv4, none of which a sales rep
    // reading error.tsx's error.message can act on. Name what's actually
    // wrong and how to fix it instead -- in dev only, see isDev above; a
    // deployed build never puts the backend's own URL or an internal run
    // command on someone's screen.
    throw new ApiRequestError(
      isDev
        ? `Can't reach the backend at ${base}. Make sure outreach-backend is running ` +
          `(uv run uvicorn app.main:app --reload --port 8000) and that ` +
          "NEXT_PUBLIC_API_URL in .env.local uses 127.0.0.1, not localhost."
        : "Can't reach the server right now. Check your connection and try again in a moment.",
      0,
    );
  }

  // The browser is not (or no longer) signed in: drop any stale session and go to the login page.
  // Covers an expired token AND the case where the backend already requires sign-in but this browser
  // never signed in (otherwise every request would just fail with no way to recover). /login itself
  // only calls public endpoints, so this cannot loop.
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    clearSession();
    // A full page load on purpose: it drops cached queries and in-memory state from the signed-out session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = describeError(await res.json());
    } catch {
      // non-JSON error body — fall through with the status alone
    }
    throw new ApiRequestError(
      detail ?? `Request failed with status ${res.status}`,
      res.status,
      detail,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
