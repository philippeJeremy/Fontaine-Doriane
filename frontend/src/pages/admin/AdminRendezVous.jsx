import { useEffect, useState } from "react";
import { api } from "../../utils/api";

const STATUS_CONFIG = {
  pending:   { label: "En attente", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmé",   color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulé",     color: "bg-red-100 text-red-500" },
};

export default function AdminRendezVous() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState("upcoming");   // "upcoming" | "past"
  const [filter, setFilter]             = useState("active");     // "active" | "cancelled" | "all"
  const [actionId, setActionId]         = useState(null);

  useEffect(() => {
    api.get("/appointments")
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sépare passés / à venir
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter(a => a.date >= today);
  const past     = appointments.filter(a => a.date <  today);

  const base = tab === "upcoming" ? upcoming : past;

  const filtered = base.filter(a => {
    if (filter === "active")    return a.status !== "cancelled";
    if (filter === "cancelled") return a.status === "cancelled";
    return true;
  });

  const counts = {
    upcoming_active:    upcoming.filter(a => a.status !== "cancelled").length,
    upcoming_cancelled: upcoming.filter(a => a.status === "cancelled").length,
    past_active:        past.filter(a => a.status !== "cancelled").length,
    past_cancelled:     past.filter(a => a.status === "cancelled").length,
  };

  const pendingCount = appointments.filter(a => a.status === "pending").length;

  async function confirm(id) {
    setActionId(id);
    try {
      const updated = await api.patch(`/appointments/${id}/confirm`);
      setAppointments(prev => prev.map(a => a.id === id ? updated : a));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function cancel(id) {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    setActionId(id);
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function deleteAppt(id) {
    if (!window.confirm("Supprimer définitivement ce rendez-vous annulé ?")) return;
    setActionId(id);
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function deleteAllCancelled() {
    const targets = base.filter(a => a.status === "cancelled");
    if (!targets.length) return;
    if (!window.confirm(`Supprimer définitivement les ${targets.length} rendez-vous annulés ?`)) return;
    for (const a of targets) {
      try { await api.delete(`/appointments/${a.id}`); } catch { /* skip */ }
    }
    const ids = new Set(targets.map(a => a.id));
    setAppointments(prev => prev.filter(a => !ids.has(a.id)));
  }

  // Reset le filtre si on change d'onglet
  function switchTab(t) {
    setTab(t);
    setFilter("active");
  }

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Rendez-vous</h1>
        {pendingCount > 0 && (
          <span className="bg-sauge-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {pendingCount} en attente
          </span>
        )}
      </div>

      {/* Onglets À venir / Passés */}
      <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl w-fit">
        {[
          { key: "upcoming", label: "À venir" },
          { key: "past",     label: "Passés"  },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === key
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          {
            key: "active",
            label: tab === "upcoming"
              ? `En cours (${counts.upcoming_active})`
              : `Archivés (${counts.past_active})`,
          },
          {
            key: "cancelled",
            label: `Annulés (${tab === "upcoming" ? counts.upcoming_cancelled : counts.past_cancelled})`,
          },
          { key: "all", label: "Tous" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === key
                ? "bg-sauge-500 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-sauge-300"
            }`}
          >
            {label}
          </button>
        ))}

        {/* Bouton purger tous les annulés */}
        {filter === "cancelled" && base.some(a => a.status === "cancelled") && (
          <button
            onClick={deleteAllCancelled}
            className="ml-auto text-xs text-red-400 hover:text-red-600 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-full transition"
          >
            Tout supprimer
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-stone-400 text-center py-16">Aucun rendez-vous dans cette catégorie.</p>
      )}

      <div className="space-y-4">
        {filtered.map(a => {
          const s = STATUS_CONFIG[a.status] ?? { label: a.status, color: "bg-stone-100 text-stone-500" };
          const dateLabel = new Date(a.date + "T00:00:00").toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long",
          });
          return (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 ${
                a.status === "cancelled" ? "border-red-50 opacity-75" : "border-stone-100"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Client */}
                  {a.client && (
                    <p className="font-semibold text-stone-800">
                      {a.client.first_name} {a.client.last_name}
                      <span className="font-normal text-stone-400 text-sm ml-2">{a.client.email}</span>
                      {a.client.phone && <span className="text-stone-400 text-sm ml-2">· {a.client.phone}</span>}
                    </p>
                  )}
                  {!a.client && a.manual_client_name && (
                    <p className="font-semibold text-stone-800">
                      {a.manual_client_name}
                      {a.manual_client_phone && (
                        <span className="font-normal text-stone-400 text-sm ml-2">· {a.manual_client_phone}</span>
                      )}
                    </p>
                  )}

                  {/* Date / heure */}
                  <p className="text-stone-600 text-sm mt-0.5 capitalize">
                    {dateLabel} · {a.start_time} – {a.end_time}
                  </p>

                  {/* Prestations */}
                  <ul className="mt-2 space-y-0.5">
                    {a.services.map(svc => {
                      const qty = svc.quantity ?? 1;
                      return (
                        <li key={svc.id} className="text-sm text-stone-600">
                          {svc.name}
                          {qty > 1 && <span className="text-stone-400"> × {qty}</span>}
                          {" — "}
                          <span className="text-sauge-600 font-medium">{(svc.price * qty).toFixed(2)} €</span>
                          <span className="text-stone-400"> · {svc.duration_minutes * qty} min</span>
                        </li>
                      );
                    })}
                  </ul>

                  {a.is_home_service && (
                    <p className="text-xs text-sauge-600 mt-1 flex items-center gap-1">
                      🏠 À domicile
                      {a.client_address && <span className="text-stone-400">— {a.client_address}</span>}
                      {a.home_service_surcharge > 0 && (
                        <span className="text-stone-400">(+{Number(a.home_service_surcharge).toFixed(2)} €)</span>
                      )}
                    </p>
                  )}
                  {a.notes && <p className="text-stone-400 text-xs mt-2 italic">Note : {a.notes}</p>}

                  <p className="text-sm font-bold text-stone-800 mt-2">
                    Total : {Number(a.total_price).toFixed(2)} €
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>
                    {s.label}
                  </span>

                  {a.status === "pending" && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => confirm(a.id)}
                        disabled={actionId === a.id}
                        className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-full transition"
                      >
                        ✓ Confirmer
                      </button>
                      <button
                        onClick={() => cancel(a.id)}
                        disabled={actionId === a.id}
                        className="border border-red-200 text-red-400 hover:bg-red-50 text-xs font-medium px-3 py-1.5 rounded-full transition"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {a.status === "confirmed" && (
                    <button
                      onClick={() => cancel(a.id)}
                      disabled={actionId === a.id}
                      className="border border-red-200 text-red-400 hover:bg-red-50 text-xs px-3 py-1.5 rounded-full transition mt-1"
                    >
                      Annuler
                    </button>
                  )}

                  {a.status === "cancelled" && (
                    <button
                      onClick={() => deleteAppt(a.id)}
                      disabled={actionId === a.id}
                      className="border border-red-200 text-red-400 hover:bg-red-50 disabled:opacity-50 text-xs px-3 py-1.5 rounded-full transition mt-1"
                    >
                      🗑 Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
