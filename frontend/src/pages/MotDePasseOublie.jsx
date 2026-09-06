import { useState } from "react";
import { Link } from "react-router-dom";

export default function MotDePasseOublie() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Une erreur est survenue");
        return;
      }
      setSent(true);
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
          <h1 className="text-2xl font-bold text-stone-800">Mot de passe oublié</h1>
          <p className="text-stone-500 text-sm mt-1">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="text-stone-700 font-medium">Email envoyé !</p>
              <p className="text-stone-500 text-sm">
                Si cet email est enregistré, vous recevrez un lien valable 1 heure.
                Vérifiez également vos spams.
              </p>
              <Link
                to="/connexion"
                className="inline-block mt-2 text-sauge-500 hover:underline text-sm font-medium"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition text-sm"
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="text-center text-stone-500 text-sm mt-6">
            <Link to="/connexion" className="text-sauge-500 hover:underline font-medium">
              ← Retour à la connexion
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
