import { useEffect, useMemo, useState } from "react";
import { api } from "../../utils/api";

const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const STATUS = {
  draft:     { label: "Brouillon", cls: "bg-stone-100 text-stone-500 border-stone-200" },
  validated: { label: "Validée",   cls: "bg-blue-50 text-blue-600 border-blue-200" },
  sent:      { label: "Envoyée",   cls: "bg-amber-50 text-amber-600 border-amber-200" },
  paid:      { label: "Payée",     cls: "bg-green-50 text-green-600 border-green-200" },
};

export default function AdminFactures() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [invoices, setInvoices]         = useState([]);
  const [loading, setLoading]           = useState(true);

  // Modal création
  const [creating, setCreating]         = useState(false);
  const [appointable, setAppointable]   = useState([]);
  const [selectedAppt, setSelectedAppt] = useState("");
  const [vatRate, setVatRate]           = useState("20");
  const [notes, setNotes]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [modalError, setModalError]     = useState("");

  // Actions
  const [actionId, setActionId]         = useState(null);

  // ── Chargement des factures ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    api.get(`/invoices?year=${year}&month=${month}`)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  // ── Stats du mois ───────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    count:    invoices.length,
    totalHT:  invoices.reduce((s, i) => s + i.amount_ht, 0),
    totalTTC: invoices.reduce((s, i) => s + i.amount_ttc, 0),
    paid:     invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount_ttc, 0),
  }), [invoices]);

  // ── Navigation mois ─────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // ── Ouvrir la modal de création ─────────────────────────────────────────────
  async function openCreate() {
    setModalError("");
    setVatRate("20");
    setNotes("");
    const appts = await api.get("/invoices/appointable").catch(() => []);
    setAppointable(appts);
    setSelectedAppt(String(appts[0]?.id ?? ""));
    setCreating(true);
  }

  async function createInvoice() {
    if (!selectedAppt) return;
    setSaving(true);
    setModalError("");
    try {
      const inv = await api.post(`/invoices/from-appointment/${selectedAppt}`, {
        vat_rate: parseFloat(vatRate) || 0,
        notes: notes.trim() || null,
      });
      const invDate = new Date(inv.invoice_date);
      if (invDate.getFullYear() === year && invDate.getMonth() + 1 === month) {
        setInvoices(prev => [inv, ...prev]);
      }
      setCreating(false);
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Actions sur une facture ─────────────────────────────────────────────────
  async function doValidate(inv) {
    setActionId(inv.id);
    try {
      const updated = await api.patch(`/invoices/${inv.id}/validate`, {});
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function doSend(inv) {
    setActionId(inv.id);
    try {
      const updated = await api.post(`/invoices/${inv.id}/send`, {});
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function doPaid(inv) {
    setActionId(inv.id);
    try {
      const updated = await api.patch(`/invoices/${inv.id}/paid`, {});
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function doDelete(inv) {
    if (!window.confirm(`Supprimer la facture ${inv.invoice_number} ?`)) return;
    setActionId(inv.id);
    try {
      await api.delete(`/invoices/${inv.id}`);
      setInvoices(prev => prev.filter(i => i.id !== inv.id));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function doDownload(inv) {
    try {
      const blob = await api.blob(`/invoices/${inv.id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e.message); }
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────
  const btnBase = "text-xs px-3 py-1.5 rounded-full border transition disabled:opacity-40";

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Factures</h1>
        <button
          onClick={openCreate}
          className="bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-medium px-4 py-2 rounded-full transition"
        >
          + Nouvelle facture
        </button>
      </div>

      {/* Navigateur de mois */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 hover:bg-stone-50 text-stone-500 transition"
        >‹</button>
        <span className="font-semibold text-stone-700 w-40 text-center">
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 hover:bg-stone-50 text-stone-500 transition"
        >›</button>
      </div>

      {/* Statistiques du mois */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Factures",    value: stats.count,            fmt: v => String(v),       green: false },
          { label: "Total HT",    value: stats.totalHT,          fmt: v => v.toFixed(2)+" €", green: false },
          { label: "Total TTC",   value: stats.totalTTC,         fmt: v => v.toFixed(2)+" €", green: false },
          { label: "Encaissé",    value: stats.paid,             fmt: v => v.toFixed(2)+" €", green: true  },
        ].map(s => (
          <div key={s.label}
            className={`bg-white rounded-xl border p-4 ${s.green ? "border-green-100" : "border-stone-100"}`}
          >
            <p className="text-xs text-stone-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.green ? "text-green-600" : "text-stone-800"}`}>
              {s.fmt(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Liste des factures */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 text-stone-400">
          Aucune facture pour {MONTHS[month - 1]} {year}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const st = STATUS[inv.status] ?? STATUS.draft;
            const busy = actionId === inv.id;

            return (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-stone-100 shadow-sm p-4 space-y-2"
              >
                {/* Ligne principale */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                    {st.label}
                  </span>
                  <span className="font-mono font-semibold text-stone-700 text-sm">
                    {inv.invoice_number}
                  </span>
                  <span className="text-stone-400 text-sm">
                    {new Date(inv.invoice_date + "T00:00:00").toLocaleDateString("fr-FR")}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-stone-800 truncate">
                    {inv.client_name}
                  </span>
                  <span className="text-sauge-600 font-bold text-sm shrink-0">
                    {inv.amount_ttc.toFixed(2)} €
                  </span>
                </div>

                {/* Sous-titre RDV + actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-400 flex-1 min-w-0">
                    RDV {inv.appt_date
                      ? new Date(inv.appt_date + "T00:00:00").toLocaleDateString("fr-FR")
                      : "—"} {inv.appt_start_time ?? ""}
                    {" · "}
                    {inv.services.map(s => s.quantity > 1 ? `${s.name} ×${s.quantity}` : s.name).join(", ")}
                    {" · HT "}{inv.amount_ht.toFixed(2)} €
                    {inv.vat_rate > 0 && ` · TVA ${inv.vat_rate}%`}
                  </span>

                  {/* Télécharger PDF — toujours visible */}
                  <button onClick={() => doDownload(inv)} disabled={busy}
                    className={`${btnBase} border-stone-200 text-stone-500 hover:bg-stone-50`}>
                    ↓ PDF
                  </button>

                  {inv.status === "draft" && (<>
                    <button onClick={() => doValidate(inv)} disabled={busy}
                      className={`${btnBase} border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100`}>
                      {busy ? "…" : "Valider"}
                    </button>
                    <button onClick={() => doDelete(inv)} disabled={busy}
                      className={`${btnBase} border-red-100 text-red-400 hover:bg-red-50`}>
                      Supprimer
                    </button>
                  </>)}

                  {inv.status === "validated" && (<>
                    {inv.client_email && (
                      <button onClick={() => doSend(inv)} disabled={busy}
                        className={`${btnBase} border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100`}>
                        {busy ? "Envoi…" : "Envoyer par email"}
                      </button>
                    )}
                    <button onClick={() => doDelete(inv)} disabled={busy}
                      className={`${btnBase} border-red-100 text-red-400 hover:bg-red-50`}>
                      Supprimer
                    </button>
                  </>)}

                  {inv.status === "sent" && (<>
                    <button onClick={() => doPaid(inv)} disabled={busy}
                      className={`${btnBase} border-green-200 bg-green-50 text-green-600 hover:bg-green-100`}>
                      {busy ? "…" : "Marquer payée"}
                    </button>
                    {inv.client_email && (
                      <button onClick={() => doSend(inv)} disabled={busy}
                        className={`${btnBase} border-stone-200 text-stone-500 hover:bg-stone-50`}>
                        Renvoyer
                      </button>
                    )}
                  </>)}

                  {inv.status === "paid" && (
                    <span className="text-xs text-green-500 font-medium px-1">✓ Réglée</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="font-semibold text-stone-800 text-lg mb-5">Nouvelle facture</h2>

            <label className="block text-xs font-medium text-stone-600 mb-1">
              Rendez-vous à facturer
            </label>
            {appointable.length === 0 ? (
              <p className="text-sm text-stone-400 mb-4 py-3 text-center bg-stone-50 rounded-xl">
                Aucun rendez-vous disponible (tous déjà facturés).
              </p>
            ) : (
              <select
                value={selectedAppt}
                onChange={e => setSelectedAppt(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sauge-300"
              >
                {appointable.map(a => (
                  <option key={a.id} value={String(a.id)}>
                    {new Date(a.date + "T00:00:00").toLocaleDateString("fr-FR")} {a.start_time}
                    {" — "}{a.client_name}
                    {" — "}{a.total_price.toFixed(2)} €
                    {a.services.length > 0 && ` (${a.services.slice(0, 2).join(", ")}${a.services.length > 2 ? "…" : ""})`}
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Taux TVA (%)
                </label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={vatRate}
                  onChange={e => setVatRate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
                />
                <p className="text-xs text-stone-400 mt-1">0 si TVA non applicable</p>
              </div>
              {selectedAppt && appointable.find(a => String(a.id) === selectedAppt) && (() => {
                const a = appointable.find(x => String(x.id) === selectedAppt);
                const ttc = a.total_price;
                const rate = parseFloat(vatRate) || 0;
                const ht = rate > 0 ? (ttc / (1 + rate / 100)) : ttc;
                return (
                  <div className="bg-stone-50 rounded-xl p-3 text-xs space-y-0.5">
                    <p className="text-stone-500">HT : <span className="font-semibold text-stone-700">{ht.toFixed(2)} €</span></p>
                    <p className="text-stone-500">TVA : <span className="font-semibold text-stone-700">{(ttc - ht).toFixed(2)} €</span></p>
                    <p className="text-stone-800 font-semibold">TTC : {ttc.toFixed(2)} €</p>
                  </div>
                );
              })()}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Notes (visibles sur la facture)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex : Règlement par virement, merci…"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sauge-300"
              />
            </div>

            {modalError && <p className="text-red-500 text-sm mb-3">{modalError}</p>}

            <div className="flex gap-3">
              <button
                onClick={createInvoice}
                disabled={saving || !selectedAppt}
                className="bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-full transition"
              >
                {saving ? "Création…" : "Créer la facture"}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="border border-stone-200 text-stone-500 text-sm px-6 py-2 rounded-full hover:bg-stone-50 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
