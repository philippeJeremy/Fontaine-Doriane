import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { restoreSession, setSession } from "../utils/auth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.8 13.1 17.9 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
      <path fill="#FBBC05" d="M10.9 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6L2.4 13.3A24 24 0 0 0 0 24c0 3.8.9 7.4 2.4 10.7l8.5-6.1z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.1 0-11.2-3.6-13.1-9l-7.9 6.1C6.9 42.6 14.8 48 24 48z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.956.927-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retour = searchParams.get("retour") ?? "/profil";
  const oauthOk    = searchParams.get("oauth") === "1";
  const oauthError = searchParams.get("oauth_error") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(oauthError ? "La connexion sociale a échoué. Réessayez." : "");
  const [loading, setLoading] = useState(false);

  // Après redirection OAuth : le cookie est déjà posé, on restaure la session
  useEffect(() => {
    if (!oauthOk) return;
    restoreSession().then(() => navigate("/profil", { replace: true }));
  }, [oauthOk, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Identifiants invalides");
        return;
      }
      const data = await res.json();
      setSession(data.access_token, data.expires_at, data.user);
      navigate(retour, { replace: true });
    } catch {
      setError("Erreur réseau, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (oauthOk) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Connexion</h1>
          <p className="text-stone-500 text-sm mt-1">Bienvenue !</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 space-y-4">

          {/* Boutons OAuth */}
          <div className="space-y-2">
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 border border-stone-200 rounded-full py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <GoogleIcon />
              Continuer avec Google
            </a>
            <a
              href="/api/auth/facebook"
              className="w-full flex items-center justify-center gap-3 border border-stone-200 rounded-full py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <FacebookIcon />
              Continuer avec Facebook
            </a>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-400">ou</span>
            <span className="flex-1 h-px bg-stone-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition text-sm"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <p className="text-center">
              <Link
                to="/mot-de-passe-oublie"
                className="text-stone-400 hover:text-sauge-500 text-xs transition"
              >
                Mot de passe oublié ?
              </Link>
            </p>
          </form>
        </div>
        <p className="text-center text-stone-500 text-sm mt-6">
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="text-sauge-500 hover:underline font-medium">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
