// Client helpers for calling the department server with the signed-in user's identity.
//
// The server never trusts an e-mail or student id sent by the browser. Instead every attendance and
// face request carries a short-lived JWT issued by better-auth (GET /api/auth/token, same origin),
// and the server works out who the user is from that token.

export const getServerUrl = () => {
  if (typeof window !== "undefined") {
    // In browser, use same-origin /backend proxy to avoid cross-origin / CORS issues
    return "/backend";
  }
  return process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:5000";
};

let cachedToken = null; // { token, expiresAt }
let inflightToken = null;

const decodeExpiry = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload));
    return exp ? exp * 1000 : 0;
  } catch {
    return 0;
  }
};

export const clearAuthToken = () => {
  cachedToken = null;
};

/** A JWT for the current session; reused until 30 s before it expires. */
export async function getAuthToken({ force = false } = {}) {
  if (!force && cachedToken && cachedToken.expiresAt - Date.now() > 30_000) {
    return cachedToken.token;
  }
  if (inflightToken) return inflightToken;

  inflightToken = (async () => {
    const res = await fetch("/api/auth/token", { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Your session has expired. Please sign in again.");
    const { token } = await res.json();
    if (!token) throw new Error("Your session has expired. Please sign in again.");
    cachedToken = { token, expiresAt: decodeExpiry(token) || Date.now() + 5 * 60_000 };
    return token;
  })().finally(() => {
    inflightToken = null;
  });

  return inflightToken;
}

/**
 * Call the department server. Never throws for HTTP or network problems; resolves to
 * `{ ok, status, data }` where `data` is the parsed JSON body (`data.error` / `data.code` on failure).
 */
export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let token;
    try {
      token = await getAuthToken({ force: attempt > 0 });
    } catch (err) {
      return { ok: false, status: 401, data: { success: false, error: err.message, code: "AUTH" } };
    }

    const url = `/backend${path}`;
    let res = null;

    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
        credentials: "omit",
        signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      console.warn("[apiFetch] Connection error calling", url, err.message);
      return {
        ok: false,
        status: 0,
        data: {
          success: false,
          error: err?.message || "Cannot reach the server. Make sure the backend service is running.",
          code: "NETWORK",
        },
      };
    }

    // The token may have expired between caching and use: fetch a fresh one and retry once.
    if (res.status === 401 && attempt === 0) {
      clearAuthToken();
      continue;
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (data && typeof data === "object") {
      if (!data.error && data.message) {
        data.error = data.message;
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      data: data ?? { success: res.ok, error: `Server returned HTTP status ${res.status}` },
    };
  }
  return { ok: false, status: 401, data: { success: false, error: "Please sign in again.", code: "AUTH" } };
}
