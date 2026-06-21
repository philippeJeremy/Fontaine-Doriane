import { useEffect, useState } from "react";
import { api } from "../../utils/api";

const DAYS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const STATUS = {
  pending:   { label: "En attente", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmé",   cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulé",     cls: "bg-red-100 text-red-500" },
};

function clientName(a) {
  if (a.client?.first_name) return `${a.client.first_name} ${a.client.last_name ?? ""}`.trim();
  if (a.manual_client_name)  return a.manual_client_name;
  return "Client";
}

// ── Overlay détail d'un RDV ───────────────────────────────────────────────────
function ApptDetail({ appt, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const s = STATUS[appt.status] ?? { label: appt.status, cls: "bg-stone-100 text-stone-500" };
  const dateLabel = new Date(appt.date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function confirm() {
    setLoading(true);
    try {
      const updated = await api.patch(`/appointments/${appt.id}/confirm`);
      onUpdate(updated);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function cancel() {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    setLoading(true);
    try {
      const updated = await api.patch(`/appointments/${appt.id}/cancel`);
      onUpdate(updated);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
        </div>

        <p className="font-semibold text-stone-800 text-lg">{clientName(appt)}</p>
        {appt.client?.email && <p className="text-stone-400 text-sm">{appt.client.email}</p>}
        {(appt.client?.phone || appt.manual_client_phone) && (
          <p className="text-stone-400 text-sm">{appt.client?.phone ?? appt.manual_client_phone}</p>
        )}

        <p className="text-stone-600 text-sm mt-3 capitalize">{dateLabel}</p>
        <p className="text-stone-600 text-sm">{appt.start_time} – {appt.end_time}</p>

        <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3">
          {appt.services.map(svc => {
            const qty = svc.quantity ?? 1;
            return (
              <li key={svc.id} className="flex justify-between text-sm">
                <span className="text-stone-600">{svc.name}{qty > 1 ? ` × ${qty}` : ""}</span>
                <span className="text-sauge-600 font-medium">{(svc.price * qty).toFixed(2)} €</span>
              </li>
            );
          })}
          <li className="flex justify-between text-sm font-bold text-stone-800 pt-1 border-t border-stone-100">
            <span>Total</span><span>{appt.total_price.toFixed(2)} €</span>
          </li>
        </ul>
        {appt.notes && <p className="text-stone-400 text-xs mt-2 italic">Note : {appt.notes}</p>}

        <div className="flex gap-2 mt-5">
          {appt.status === "pending" && (
            <button onClick={confirm} disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-full disabled:opacity-50 transition">
              ✓ Confirmer
            </button>
          )}
          {appt.status !== "cancelled" && (
            <button onClick={cancel} disabled={loading}
              className="flex-1 border border-red-200 text-red-400 hover:bg-red-50 text-sm py-2 rounded-full disabled:opacity-50 transition">
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Panel de création de RDV ──────────────────────────────────────────────────
function CreatePanel({ initialDate, allServices, onClose, onCreated }) {
  const [mode, setMode]             = useState("manual");
  const [searchEmail, setSearchEmail] = useState("");
  const [foundClient, setFoundClient] = useState(null);
  const [searching, setSearching]   = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [apptDate, setApptDate]     = useState(initialDate ?? "");
  const [startTime, setStartTime]   = useState("09:00");
  const [cart, setCart]             = useState([]);
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const totalPrice    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalDuration = cart.reduce((s, i) => s + i.duration_minutes * i.quantity, 0);

  function calcEndTime() {
    if (!startTime || totalDuration === 0) return null;
    const [h, m] = startTime.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, m + totalDuration);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  async function searchClient() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setFoundClient(null);
    setError("");
    try {
      const res = await api.get(`/auth/users/search?q=${encodeURIComponent(searchEmail.trim())}`);
      if (res) setFoundClient(res);
      else setError("Aucun client trouvé avec cet email.");
    } catch (e) { setError(e.message); }
    finally { setSearching(false); }
  }

  function toggleService(svc) {
    setCart(cart.some(i => i.id === svc.id)
      ? cart.filter(i => i.id !== svc.id)
      : [...cart, { ...svc, quantity: 1 }]);
  }

  function changeQty(id, delta) {
    setCart(cart.map(i => i.id !== id ? i : { ...i, quantity: Math.max(1, i.quantity + delta) }));
  }

  async function submit(e) {
    e.preventDefault();
    if (cart.length === 0)                          { setError("Sélectionnez au moins une prestation."); return; }
    if (mode === "account" && !foundClient)          { setError("Recherchez un client d'abord."); return; }
    if (mode === "manual" && !manualName.trim())     { setError("Entrez le nom du client."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        date: apptDate,
        start_time: startTime,
        services: cart.map(i => ({ id: i.id, quantity: i.quantity })),
        notes: notes.trim() || null,
        ...(mode === "account"
          ? { client_id: foundClient.id }
          : { manual_client_name: manualName.trim(), manual_client_phone: manualPhone.trim() || null }),
      };
      const created = await api.post("/appointments/admin", payload);
      onCreated(created);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-200";
  const endTime  = calcEndTime();

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-stone-800">Nouveau rendez-vous</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 flex-1">

          {/* ── Client ── */}
          <div>
            <p className="text-xs font-medium text-stone-600 mb-2">Client</p>
            <div className="flex gap-2 mb-3">
              {[["manual", "Saisie manuelle"], ["account", "Avec compte"]].map(([val, label]) => (
                <button key={val} type="button" onClick={() => { setMode(val); setFoundClient(null); setError(""); }}
                  className={`flex-1 text-sm py-1.5 rounded-full border transition font-medium ${
                    mode === val ? "bg-sauge-500 text-white border-sauge-500" : "border-stone-200 text-stone-600 hover:border-sauge-200"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {mode === "manual" ? (
              <div className="space-y-2">
                <input required value={manualName} onChange={e => setManualName(e.target.value)}
                  placeholder="Prénom Nom *" className={inputCls} />
                <input value={manualPhone} onChange={e => setManualPhone(e.target.value)}
                  placeholder="Téléphone (optionnel)" className={inputCls} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), searchClient())}
                    placeholder="Email du client" className={`${inputCls} flex-1`} />
                  <button type="button" onClick={searchClient} disabled={searching}
                    className="shrink-0 border border-sauge-200 text-sauge-500 text-sm px-3 py-2 rounded-xl hover:bg-sauge-50 disabled:opacity-50 transition">
                    {searching ? "…" : "Chercher"}
                  </button>
                </div>
                {foundClient && (
                  <div className="bg-green-50 rounded-xl px-3 py-2.5">
                    <p className="font-medium text-green-800 text-sm">{foundClient.first_name} {foundClient.last_name}</p>
                    <p className="text-green-600 text-xs">{foundClient.email}</p>
                    {foundClient.phone && <p className="text-green-600 text-xs">{foundClient.phone}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Date + heure ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Date *</label>
              <input required type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Heure début *</label>
              <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          {endTime && (
            <p className="text-xs text-stone-400 -mt-3">
              Fin estimée : <strong>{endTime}</strong> ({totalDuration} min)
            </p>
          )}

          {/* ── Prestations ── */}
          <div>
            <p className="text-xs font-medium text-stone-600 mb-2">Prestations *</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {allServices.map(svc => {
                const item = cart.find(i => i.id === svc.id);
                const selected = !!item;
                return (
                  <div key={svc.id} onClick={() => toggleService(svc)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selected ? "border-sauge-300 bg-sauge-50" : "border-stone-100 hover:border-sauge-200"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition ${
                      selected ? "bg-sauge-500 border-sauge-500" : "border-stone-300"
                    }`}>
                      {selected && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                    <span className="flex-1 text-sm text-stone-700">{svc.name}</span>
                    {selected && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => changeQty(svc.id, -1)}
                          className="w-5 h-5 rounded-full bg-sauge-100 hover:bg-sauge-200 text-sauge-600 text-xs flex items-center justify-center">−</button>
                        <span className="w-5 text-center text-sm font-medium text-stone-700">{item.quantity}</span>
                        <button type="button" onClick={() => changeQty(svc.id, +1)}
                          className="w-5 h-5 rounded-full bg-sauge-100 hover:bg-sauge-200 text-sauge-600 text-xs flex items-center justify-center">+</button>
                      </div>
                    )}
                    <span className="text-sauge-600 font-medium text-sm shrink-0">
                      {selected ? (svc.price * item.quantity).toFixed(2) : svc.price.toFixed(2)} €
                    </span>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && (
              <p className="text-xs text-stone-500 mt-2 text-right">
                Total : <strong className="text-stone-800">{totalPrice.toFixed(2)} €</strong>
              </p>
            )}
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Optionnel" className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-medium py-3 rounded-full transition">
            {saving ? "Enregistrement…" : "Enregistrer le rendez-vous"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdminPlanning() {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth()); // 0-indexed JS
  const [appointments, setAppointments] = useState([]);
  const [allServices, setAllServices]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [createDate, setCreateDate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get("/services/all").then(setAllServices).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/appointments/planning?year=${year}&month=${month + 1}`)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const firstDayMon = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = today.toISOString().slice(0, 10);
  const monthName   = new Date(year, month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Grouper par date (sans les annulés)
  const byDate = {};
  appointments.forEach(a => {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  });

  function isoDay(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function handleUpdate(updated) {
    setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelected(prev => prev?.id === updated.id ? updated : prev);
  }

  function handleCreated(newAppt) {
    const apptMonth = new Date(newAppt.date + "T00:00:00").getMonth();
    const apptYear  = new Date(newAppt.date + "T00:00:00").getFullYear();
    if (apptMonth === month && apptYear === year) {
      setAppointments(prev => [...prev, newAppt]);
    }
    setShowCreate(false);
  }

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">Planning</h1>
        <button
          onClick={() => { setCreateDate(todayStr); setShowCreate(true); }}
          className="bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-medium px-5 py-2 rounded-full transition"
        >
          + Nouveau RDV
        </button>
      </div>

      {/* ── Navigation mois ── */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-sauge-50 text-stone-500 text-lg transition flex items-center justify-center">‹</button>
        <span className="font-semibold text-stone-800 capitalize min-w-44 text-center">{monthName}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-sauge-50 text-stone-500 text-lg transition flex items-center justify-center">›</button>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          className="ml-2 text-xs border border-stone-200 text-stone-500 px-3 py-1 rounded-full hover:bg-stone-50 transition"
        >
          Aujourd'hui
        </button>
        {loading && <div className="w-4 h-4 border-2 border-sauge-200 border-t-sauge-500 rounded-full animate-spin ml-1" />}
      </div>

      {/* ── Grille calendrier ── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-100">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-stone-400 py-2.5">{d}</div>
          ))}
        </div>

        {/* Cases */}
        <div className="grid grid-cols-7 divide-x divide-y divide-stone-50">
          {/* Cases vides (décalage du 1er jour) */}
          {Array.from({ length: firstDayMon }).map((_, i) => (
            <div key={`e${i}`} className="min-h-28 bg-stone-50/30" />
          ))}

          {/* Cases des jours */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr  = isoDay(day);
            const dayAppts = (byDate[dateStr] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const isToday  = dateStr === todayStr;
            const isPast   = dateStr < todayStr;

            return (
              <div
                key={day}
                className={`min-h-32 p-1.5 transition group ${
                  isToday ? "bg-sauge-50/60" : isPast ? "bg-stone-50/20" : "hover:bg-sauge-50/20 cursor-pointer"
                }`}
                onClick={() => !isPast && (setCreateDate(dateStr), setShowCreate(true))}
              >
                {/* Numéro du jour */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? "bg-sauge-500 text-white" : isPast ? "text-stone-300" : "text-stone-500"
                  }`}>
                    {day}
                  </span>
                  {!isPast && (
                    <span className="text-stone-200 group-hover:text-sauge-300 text-sm transition select-none">+</span>
                  )}
                </div>

                {/* Cartes rendez-vous */}
                <div className="space-y-1">
                  {dayAppts.slice(0, 2).map(a => (
                    <div
                      key={a.id}
                      onClick={e => { e.stopPropagation(); setSelected(a); }}
                      className={`text-xs px-1.5 py-1 rounded-md cursor-pointer hover:opacity-80 transition space-y-0.5 ${STATUS[a.status]?.cls ?? "bg-stone-100 text-stone-500"}`}
                    >
                      <p className="font-semibold leading-tight">
                        {a.start_time} – {a.end_time}
                        {a.is_home_service && <span className="ml-1">🏠</span>}
                      </p>
                      <p className="truncate leading-tight font-medium">{clientName(a)}</p>
                      <p className="truncate leading-tight opacity-70">
                        {a.services[0]?.name}{a.services.length > 1 ? ` +${a.services.length - 1}` : ""}
                      </p>
                      <p className="leading-tight opacity-70 font-medium">
                        {Number(a.total_price).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                  {dayAppts.length > 2 && (
                    <p className="text-xs text-stone-400 pl-1 cursor-pointer"
                       onClick={e => { e.stopPropagation(); setSelected(dayAppts[2]); }}>
                      +{dayAppts.length - 2} autre{dayAppts.length - 2 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Légende ── */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-stone-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block border border-amber-200" />En attente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block border border-green-200" />Confirmé</span>
        <span className="text-stone-300 hidden sm:inline">— Cliquer sur un jour pour créer un RDV</span>
      </div>

      {/* ── Overlay détail ── */}
      {selected && (
        <ApptDetail
          appt={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* ── Panel création ── */}
      {showCreate && (
        <CreatePanel
          initialDate={createDate}
          allServices={allServices.filter(s => s.is_active)}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
