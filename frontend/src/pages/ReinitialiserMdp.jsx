import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function ReinitialiserMdp() {
  const [searchParams]      = useSearchParams();
  const token               = searchParams.get("token") ?? "";
  const navigate            = useNavigate();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-stone-600">Lien invalide ou expiré.</p>
          <Link to="/mot-de-passe-oublie" className="text-sauge-500 hover:underline text-sm">
            Faire une nouvelle demande
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail ?? "Une erreur est survenue");
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/connexion", { replace: true }), 2500);
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
          <h1 className="text-2xl font-bold text-stone-800">Nouveau mot de passe</h1>
          <p className="text-stone-500 text-sm mt-1">Choisissez un mot de passe sécurisé.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          {success ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="text-stone-700 font-medium">Mot de passe mis à jour !</p>
              <p className="text-stone-500 text-sm">Redirection vers la connexion…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition text-sm"
              >
                {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
