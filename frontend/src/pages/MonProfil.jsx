import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { getSessionInfo, logout } from "../utils/auth";

const STATUS_LABELS = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmé", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-500" },
};

export default function MonProfil() {
  const session = getSessionInfo();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/appointments/me")
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter(a => a.date >= today && a.status !== "cancelled");
  const past = appointments.filter(a => a.date < today || a.status === "cancelled");

  function AppointmentCard({ a }) {
    const s = STATUS_LABELS[a.status] ?? { label: a.status, color: "bg-stone-100 text-stone-500" };
    const dateLabel = new Date(a.date + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return (
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-stone-800 capitalize">{dateLabel}</p>
            <p className="text-stone-500 text-sm">{a.start_time} – {a.end_time}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${s.color}`}>
            {s.label}
          </span>
        </div>
        <ul className="mt-3 space-y-1">
          {a.services.map(svc => {
            const qty = svc.quantity ?? 1;
            return (
              <li key={svc.id} className="flex justify-between text-sm gap-2">
                <span className="text-stone-600">
                  {svc.name}
                  {qty > 1 && <span className="text-stone-400"> × {qty}</span>}
                </span>
                <span className="text-sauge-600 shrink-0">{(svc.price * qty).toFixed(2)} €</span>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between pt-3 border-t border-stone-100 mt-3 text-sm font-semibold">
          <span className="text-stone-700">Total</span>
          <span className="text-sauge-600">{a.total_price.toFixed(2)} €</span>
        </div>
        {a.notes && (
          <p className="text-stone-400 text-xs mt-2 italic">Note : {a.notes}</p>
        )}
      </div>
    );
  }

  async function handleDeleteAccount() {
    if (!window.confirm(
      "Supprimer votre compte ?\n\nToutes vos données et votre historique de rendez-vous seront supprimés définitivement."
    )) return;
    setDeleting(true);
    try {
      await api.delete("/auth/me");
      await logout();
      navigate("/");
    } catch (e) {
      alert(e.message);
      setDeleting(false);
    }
  }

  async function handleExport() {
    try {
      const data = await api.get("/auth/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mes-donnees-fontaine-doriane.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-stone-800">Mes rendez-vous</h1>
        {session && (
          <p className="text-stone-500 mt-1">
            Bonjour {session.first_name ?? session.email} 👋
          </p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-4">📅</p>
          <p>Aucun rendez-vous pour l'instant.</p>
          <a href="/reserver" className="inline-block mt-4 bg-sauge-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-sauge-600 transition">
            Prendre un rendez-vous
          </a>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-stone-700 mb-4">À venir</h2>
          <div className="space-y-4">
            {upcoming.map(a => <AppointmentCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {!loading && past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-400 mb-4">Historique</h2>
          <div className="space-y-4 opacity-70">
            {past.map(a => <AppointmentCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {/* ── Zone RGPD ── */}
      <section className="mt-16 border-t border-stone-100 pt-10">
        <h2 className="text-base font-semibold text-stone-700 mb-4">Mes données personnelles</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            className="border border-stone-200 text-stone-600 text-sm px-4 py-2 rounded-full hover:bg-stone-50 transition"
          >
            ↓ Télécharger mes données
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="border border-red-200 text-red-500 text-sm px-4 py-2 rounded-full hover:bg-red-50 disabled:opacity-50 transition"
          >
            {deleting ? "Suppression…" : "Supprimer mon compte"}
          </button>
        </div>
        <p className="text-xs text-stone-400 mt-3">
          La suppression est immédiate et définitive (RGPD Art. 17).{" "}
          <a href="/confidentialite" className="underline hover:text-stone-600">
            Politique de confidentialité
          </a>
        </p>
      </section>
    </div>
  );
}
