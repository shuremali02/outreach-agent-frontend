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

function baseUrl(): string {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Point it at outreach-backend, e.g. " +
        "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 in .env.local, then restart the dev server.",
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
    res = await fetch(url, {
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
    // wrong and how to fix it instead.
    throw new ApiRequestError(
      `Can't reach the backend at ${base}. Make sure outreach-backend is running ` +
        `(uv run uvicorn app.main:app --reload --port 8000) and that ` +
        "NEXT_PUBLIC_API_URL in .env.local uses 127.0.0.1, not localhost.",
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
