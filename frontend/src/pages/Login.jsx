import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { setSession } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retour = searchParams.get("retour") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Connexion</h1>
          <p className="text-stone-500 text-sm mt-1">Bienvenue !</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
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
