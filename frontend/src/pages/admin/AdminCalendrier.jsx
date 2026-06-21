import { useEffect, useState } from "react";
import { api } from "../../utils/api";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const inputCls = "border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-200";

export default function AdminCalendrier() {
  const [hours, setHours]           = useState([]);
  const [closedDays, setClosedDays] = useState([]);
  const [savingDay, setSavingDay]   = useState(null);
  const [saveOk, setSaveOk]         = useState(null);
  const [newClosed, setNewClosed]   = useState({ date: "", reason: "" });
  const [addingClosed, setAddingClosed] = useState(false);

  // Prestation à domicile
  const [homeEnabled, setHomeEnabled]     = useState(false);
  const [homeSurcharge, setHomeSurcharge] = useState("0");
  const [savingHome, setSavingHome]       = useState(false);
  const [homeOk, setHomeOk]              = useState(false);

  useEffect(() => {
    api.get("/calendar/working-hours").then(setHours).catch(() => {});
    api.get("/calendar/closed-days").then(setClosedDays).catch(() => {});
    api.get("/settings/home-service").then(s => {
      setHomeEnabled(s.enabled);
      setHomeSurcharge(String(s.surcharge));
    }).catch(() => {});
  }, []);

  // Sauvegarde horaires (toggle + heures → immédiat ; adresse → onBlur)
  async function saveDay(index, patch = {}) {
    const h = { ...hours[index], ...patch };
    setHours(prev => prev.map((r, i) => i === index ? h : r));
    setSavingDay(h.day_of_week);
    try {
      await api.put(`/calendar/working-hours/${h.day_of_week}`, {
        is_open:    h.is_open,
        open_time:  h.open_time  ?? "09:00",
        close_time: h.close_time ?? "19:00",
        address:    h.address    ?? null,
      });
      setSaveOk(h.day_of_week);
      setTimeout(() => setSaveOk(v => v === h.day_of_week ? null : v), 1500);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingDay(null);
    }
  }

  // Mise à jour locale de l'adresse (sans appel API)
  function setAddress(index, value) {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, address: value } : h));
  }

  async function saveHomeService() {
    setSavingHome(true);
    setHomeOk(false);
    try {
      await api.put("/settings/home-service", {
        enabled:   homeEnabled,
        surcharge: parseFloat(homeSurcharge) || 0,
      });
      setHomeOk(true);
      setTimeout(() => setHomeOk(false), 2000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingHome(false);
    }
  }

  async function addClosedDay(e) {
    e.preventDefault();
    setAddingClosed(true);
    try {
      const created = await api.post("/calendar/closed-days", {
        date: newClosed.date,
        reason: newClosed.reason || null,
      });
      setClosedDays(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setNewClosed({ date: "", reason: "" });
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingClosed(false);
    }
  }

  async function deleteClosedDay(id) {
    if (!window.confirm("Supprimer ce jour fermé ?")) return;
    try {
      await api.delete(`/calendar/closed-days/${id}`);
      setClosedDays(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-stone-800">Calendrier</h1>

      {/* ── Horaires hebdomadaires ── */}
      <section className="bg-white rounded-2xl border border-sauge-100 shadow-sm p-6">
        <h2 className="font-semibold text-stone-800 mb-5">Horaires d'ouverture</h2>
        <div className="space-y-5">
          {hours.map((h, i) => (
            <div key={h.day_of_week} className="space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="w-24 text-sm font-medium text-stone-700 shrink-0">
                  {DAYS[h.day_of_week]}
                </span>

                {/* Toggle ouvert/fermé */}
                <button
                  onClick={() => saveDay(i, { is_open: !h.is_open })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${
                    h.is_open ? "bg-sauge-500" : "bg-stone-200"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    h.is_open ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
                <span className="text-sm text-stone-500 w-14 shrink-0">
                  {h.is_open ? "Ouvert" : "Fermé"}
                </span>

                {h.is_open && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={h.open_time ?? "09:00"}
                        onChange={e => saveDay(i, { open_time: e.target.value })}
                        className={inputCls}
                      />
                      <span className="text-stone-400 text-sm">→</span>
                      <input
                        type="time"
                        value={h.close_time ?? "19:00"}
                        onChange={e => saveDay(i, { close_time: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <span className="text-xs">
                      {savingDay === h.day_of_week && (
                        <span className="text-stone-400 animate-pulse">Sauvegarde…</span>
                      )}
                      {saveOk === h.day_of_week && savingDay !== h.day_of_week && (
                        <span className="text-green-500">✓ Sauvegardé</span>
                      )}
                    </span>
                  </>
                )}
              </div>

              {/* Adresse du jour */}
              {h.is_open && (
                <div className="ml-28 flex items-center gap-2">
                  <span className="text-xs text-stone-400 shrink-0">📍 Adresse</span>
                  <input
                    type="text"
                    value={h.address ?? ""}
                    onChange={e => setAddress(i, e.target.value)}
                    onBlur={() => saveDay(i)}
                    placeholder="Ex : 12 rue de la Paix, 56150 Guenin"
                    className="flex-1 border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-200"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Jours fermés exceptionnels ── */}
      <section className="bg-white rounded-2xl border border-sauge-100 shadow-sm p-6">
        <h2 className="font-semibold text-stone-800 mb-5">Jours exceptionnellement fermés</h2>

        <form onSubmit={addClosedDay} className="flex gap-3 mb-6 flex-wrap items-end">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Date *</label>
            <input
              type="date"
              required
              min={todayIso}
              value={newClosed.date}
              onChange={e => setNewClosed(v => ({ ...v, date: e.target.value }))}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-200"
            />
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs text-stone-500 mb-1">Raison (optionnel)</label>
            <input
              value={newClosed.reason}
              onChange={e => setNewClosed(v => ({ ...v, reason: e.target.value }))}
              placeholder="Ex : Congés, Jour férié…"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-200"
            />
          </div>
          <button
            type="submit"
            disabled={addingClosed}
            className="bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-full transition"
          >
            {addingClosed ? "Ajout…" : "+ Ajouter"}
          </button>
        </form>

        {closedDays.length === 0 && (
          <p className="text-stone-400 text-sm">Aucun jour fermé exceptionnel.</p>
        )}
        <ul className="space-y-2">
          {closedDays.map(d => (
            <li key={d.id} className="flex items-center justify-between bg-sauge-50 rounded-xl px-4 py-3">
              <div>
                <span className="font-medium text-stone-800 text-sm capitalize">
                  {new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                {d.reason && <span className="text-stone-500 text-xs ml-2">— {d.reason}</span>}
              </div>
              <button
                onClick={() => deleteClosedDay(d.id)}
                className="text-red-400 hover:text-red-600 text-xs px-3 py-1.5 rounded-full hover:bg-red-50 transition shrink-0"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Prestations à domicile ── */}
      <section className="bg-white rounded-2xl border border-sauge-100 shadow-sm p-6">
        <h2 className="font-semibold text-stone-800 mb-1">Prestations à domicile</h2>
        <p className="text-stone-400 text-xs mb-5">
          Si activé, les clients pourront choisir une prestation à domicile lors de leur réservation
          et devront saisir leur adresse précise.
        </p>

        <div className="space-y-4">
          {/* Toggle activation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setHomeEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${
                homeEnabled ? "bg-sauge-500" : "bg-stone-200"
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                homeEnabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
            <span className="text-sm text-stone-700">
              {homeEnabled ? "Activé" : "Désactivé"}
            </span>
          </div>

          {/* Supplément */}
          {homeEnabled && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-stone-600 shrink-0">Supplément déplacement</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={homeSurcharge}
                  onChange={e => setHomeSurcharge(e.target.value)}
                  className="w-24 border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-200"
                />
                <span className="text-sm text-stone-500">€</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveHomeService}
              disabled={savingHome}
              className="bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-full transition"
            >
              {savingHome ? "Enregistrement…" : "Enregistrer"}
            </button>
            {homeOk && <span className="text-green-500 text-sm">✓ Sauvegardé</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
