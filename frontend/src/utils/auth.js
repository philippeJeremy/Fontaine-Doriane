let _accessToken = null;
let _expiresAt = null;

export function setSession(accessToken, expiresAt, user) {
  _accessToken = accessToken;
  _expiresAt = expiresAt;
  if (user) sessionStorage.setItem("user", JSON.stringify(user));
}

export function updateToken(accessToken, expiresAt) {
  _accessToken = accessToken;
  _expiresAt = expiresAt;
}

export function clearSession() {
  _accessToken = null;
  _expiresAt = null;
  sessionStorage.removeItem("user");
}

export function getAccessToken() {
  return _accessToken;
}

export function isTokenValid() {
  if (!_accessToken || !_expiresAt) return false;
  return Math.floor(Date.now() / 1000) < _expiresAt - 10;
}

export function getTokenPayload() {
  if (!_accessToken) return null;
  try {
    return JSON.parse(atob(_accessToken.split(".")[1]));
  } catch {
    return null;
  }
}

export function getSessionInfo() {
  try {
    return JSON.parse(sessionStorage.getItem("user") ?? "null");
  } catch {
    return null;
  }
}

export async function restoreSession() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setSession(data.access_token, data.expires_at, data.user);
  } catch {
    // pas de session active
  }
}

export async function logout() {
  clearSession();
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignorer les erreurs réseau
  }
}
