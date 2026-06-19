import { getAccessToken, updateToken } from "./auth";

let _refreshing = null;

async function tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json();
      updateToken(data.access_token, data.expires_at);
      return true;
    } catch {
      return false;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const isJson = !(options.body instanceof FormData);

  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isJson ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !options._retry) {
    const ok = await tryRefresh();
    if (ok) return apiFetch(path, { ...options, _retry: true });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur réseau" }));
    throw new Error(err.detail ?? "Erreur serveur");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
  upload: (path, formData) => apiFetch(path, { method: "POST", body: formData }),
};
