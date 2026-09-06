import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setSession } from "../utils/auth";

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


export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", password: "", confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setLoading(true);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
        }),
      });
      if (!regRes.ok) {
        const data = await regRes.json().catch(() => ({}));
        setError(data.detail ?? "Erreur lors de l'inscription");
        return;
      }
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (loginRes.ok) {
        const data = await loginRes.json();
        setSession(data.access_token, data.expires_at, data.user);
      }
      navigate("/reserver", { replace: true });
    } catch {
      setError("Erreur réseau, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  const field = (label, name, type = "text", required = true, placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={form[name]}
        onChange={set(name)}
        autoComplete={name}
        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
      />
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Créer un compte</h1>
          <p className="text-stone-500 text-sm mt-1">Pour réserver en ligne en quelques clics</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 space-y-4">

          {/* Boutons OAuth */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 border border-stone-200 rounded-full py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
          >
            <GoogleIcon />
            S'inscrire avec Google
          </a>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-400">ou</span>
            <span className="flex-1 h-px bg-stone-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field("Prénom", "first_name")}
              {field("Nom", "last_name")}
            </div>
            {field("Email", "email", "email")}
            {field("Téléphone", "phone", "tel", false, "06 XX XX XX XX")}
            {field("Mot de passe", "password", "password")}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={set("confirm")}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition text-sm"
            >
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        </div>
        <p className="text-center text-stone-500 text-sm mt-6">
          Déjà un compte ?{" "}
          <Link to="/connexion" className="text-sauge-500 hover:underline font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
