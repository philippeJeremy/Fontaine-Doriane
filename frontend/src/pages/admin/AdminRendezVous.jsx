import { useEffect, useState } from "react";
import { api } from "../../utils/api";

const STATUS_CONFIG = {
  pending:   { label: "En attente", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmé",   color: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulé",     color: "bg-red-100 text-red-500" },
};

export default function AdminRendezVous() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    api.get("/appointments")
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function confirm(id) {
    setActionId(id);
    try {
      const updated = await api.patch(`/appointments/${id}/confirm`);
      setAppointments(prev => prev.map(a => a.id === id ? updated : a));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function cancel(id) {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    setActionId(id);
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  const filtered = filter === "all"
    ? appointments
    : appointments.filter(a => a.status === filter);

  const counts = {
    pending: appointments.filter(a => a.status === "pending").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Rendez-vous</h1>
        {counts.pending > 0 && (
          <span className="bg-sauge-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {counts.pending} en attente
          </span>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "pending", label: `En attente (${counts.pending})` },
          { key: "confirmed", label: `Confirmés (${counts.confirmed})` },
          { key: "cancelled", label: `Annulés (${counts.cancelled})` },
          { key: "all", label: "Tous" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === key ? "bg-sauge-500 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-sauge-300"
            }`}
          >
            {label}
          </button>
        ))}
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
            <div key={a.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
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
                  {a.notes && <p className="text-stone-400 text-xs mt-2 italic">Note : {a.notes}</p>}
                  {/* Total */}
                  <p className="text-sm font-bold text-stone-800 mt-2">
                    Total : {a.total_price.toFixed(2)} €
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
