import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAccessToken } from "../../utils/auth";

export default function AdminParametres() {
  const [address, setAddress] = useState("");
  const [phone, setPhone]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  const [gcalConnected, setGcalConnected] = useState(null); // null=loading
  const [gcalLoading, setGcalLoading]     = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetch("/api/settings/business")
      .then(r => r.json())
      .then(data => {
        setAddress(data.address ?? "");
        setPhone(data.phone ?? "");
      });

    fetchGcalStatus();

    // Message après retour du flow OAuth Google
    const gcal = searchParams.get("gcal");
    if (gcal === "ok")    setMsg({ ok: true,  text: "Google Agenda connecté avec succès !" });
    if (gcal === "error") setMsg({ ok: false, text: "Erreur lors de la connexion Google Agenda." });
    if (gcal) setSearchParams({}, { replace: true });
  }, []);

  async function fetchGcalStatus() {
    try {
      const res = await fetch("/api/gcalendar/status", {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGcalConnected(data.connected);
      }
    } catch { setGcalConnected(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ address, phone, opening_hours: {} }),
      });
      if (res.ok) setMsg({ ok: true,  text: "Paramètres enregistrés." });
      else        setMsg({ ok: false, text: "Erreur lors de la sauvegarde." });
    } catch {
      setMsg({ ok: false, text: "Erreur réseau." });
    } finally { setSaving(false); }
  }

  async function connectGcal() {
    setGcalLoading(true);
    try {
      const res = await fetch("/api/gcalendar/auth-url", {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setMsg({ ok: false, text: "Impossible d'obtenir le lien Google." });
      setGcalLoading(false);
    }
  }

  async function disconnectGcal() {
    if (!window.confirm("Déconnecter Google Agenda ?")) return;
    setGcalLoading(true);
    try {
      await fetch("/api/gcalendar/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      setGcalConnected(false);
      setMsg({ ok: true, text: "Google Agenda déconnecté." });
    } catch {
      setMsg({ ok: false, text: "Erreur lors de la déconnexion." });
    } finally { setGcalLoading(false); }
  }

  const inputCls = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300";

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Paramètres du salon</h1>
      </div>

      {/* ── Infos salon ── */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Informations salon</p>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">Adresse générale</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Guidel, 56520" className={inputCls} />
          <p className="text-xs text-stone-400 mt-1">
            Adresse de secours affichée dans le footer si aucune adresse n'est définie pour le jour courant dans le{" "}
            <a href="/admin/calendrier" className="text-sauge-500 underline">Calendrier</a>.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">Téléphone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="06 XX XX XX XX" className={inputCls} />
        </div>

        {msg && (
          <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>
        )}

        <button type="submit" disabled={saving}
          className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full transition text-sm">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {/* ── Google Agenda ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Google Agenda</p>

        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="6" width="36" height="36" rx="4" fill="white" stroke="#E5E7EB"/>
            <path d="M33 14H15a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V15a1 1 0 0 0-1-1z" fill="#4285F4"/>
            <path d="M15 26h18v7H15z" fill="white"/>
            <path d="M15 19h18v7H15z" fill="#E8F0FE"/>
            <rect x="14" y="10" width="4" height="6" rx="1" fill="#1A73E8"/>
            <rect x="30" y="10" width="4" height="6" rx="1" fill="#1A73E8"/>
          </svg>
          <div>
            <p className="text-sm font-medium text-stone-700">Synchronisation Google Agenda</p>
            <p className="text-xs text-stone-400">
              Les rendez-vous confirmés apparaissent automatiquement dans ton Google Agenda.
            </p>
          </div>
        </div>

        {/* Statut */}
        <div className="flex items-center gap-2">
          {gcalConnected === null ? (
            <span className="text-sm text-stone-400">Chargement…</span>
          ) : gcalConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span className="text-sm text-green-600 font-medium">Connecté</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
              <span className="text-sm text-stone-400">Non connecté</span>
            </>
          )}
        </div>

        {gcalConnected === false && (
          <button onClick={connectGcal} disabled={gcalLoading}
            className="w-full flex items-center justify-center gap-2 border border-stone-200 hover:border-sauge-300 hover:bg-sauge-50 text-stone-700 text-sm font-medium py-2.5 rounded-full transition disabled:opacity-50">
            {gcalLoading ? "Redirection…" : "Connecter Google Agenda"}
          </button>
        )}

        {gcalConnected === true && (
          <button onClick={disconnectGcal} disabled={gcalLoading}
            className="w-full border border-red-100 text-red-400 hover:bg-red-50 text-sm py-2.5 rounded-full transition disabled:opacity-50">
            {gcalLoading ? "…" : "Déconnecter"}
          </button>
        )}
      </div>
    </div>
  );
}
