import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";

const STEPS = ["Prestations", "Créneau", "Confirmation"];

// ── Utilitaires calendrier ────────────────────────────────────────────────────
function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function Calendar({ selected, onSelect, closedDates, closedWeekdays }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay(); // 0=dim
  const firstDayMon = (firstDay + 6) % 7;             // 0=lun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const monthName = new Date(year, month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  function isDisabled(dateStr) {
    if (dateStr < todayStr) return true;
    if (closedDates?.includes(dateStr)) return true;
    const dow = new Date(dateStr + "T00:00:00").getDay(); // 0=dim
    const dowMon = (dow + 6) % 7; // 0=lun
    if (closedWeekdays?.includes(dowMon)) return true;
    return false;
  }

  function isClosed(dateStr) {
    if (closedDates?.includes(dateStr)) return true;
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const dowMon = (dow + 6) % 7;
    if (closedWeekdays?.includes(dowMon)) return true;
    return false;
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 w-full max-w-xs">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1 rounded-full hover:bg-sauge-50 text-stone-500">‹</button>
        <span className="font-semibold text-stone-800 capitalize">{monthName}</span>
        <button onClick={next} className="p-1 rounded-full hover:bg-sauge-50 text-stone-500">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400 mb-2">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayMon }).map((_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dateStr = isoDate(year, month, day);
          const disabled = isDisabled(dateStr);
          const closed = !disabled && isClosed(dateStr);
          const isPast = dateStr < todayStr;
          const isSel = dateStr === selected;
          return (
            <button
              key={day}
              onClick={() => !disabled && onSelect(dateStr)}
              disabled={disabled}
              title={closed ? "Fermé" : undefined}
              className={`
                text-sm rounded-full w-8 h-8 mx-auto flex items-center justify-center transition
                ${disabled ? "text-stone-200 cursor-not-allowed" : "hover:bg-sauge-50 cursor-pointer"}
                ${isSel ? "bg-sauge-500 text-white hover:bg-sauge-500" : "text-stone-700"}
                ${!isPast && closed && !isSel ? "text-stone-300 line-through" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-stone-300 mt-3 text-center">Rayé = fermé</p>
    </div>
  );
}

// ── Étape 1 : sélection des prestations ──────────────────────────────────────
function StepServices({ cart, onCart }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/services").then(setServices).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(services.map(s => s.category))];
  const total    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const duration = cart.reduce((s, i) => s + i.duration_minutes * i.quantity, 0);

  const inCart = (id) => cart.some(i => i.id === id);
  const getQty = (id) => cart.find(i => i.id === id)?.quantity ?? 1;

  const toggle = (svc) => {
    onCart(inCart(svc.id)
      ? cart.filter(i => i.id !== svc.id)
      : [...cart, { ...svc, quantity: 1 }]);
  };

  const changeQty = (id, delta) => {
    onCart(
      cart
        .map(i => i.id !== id ? i : { ...i, quantity: i.quantity + delta })
        .filter(i => i.quantity >= 1)
    );
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex gap-8 flex-col lg:flex-row">
      <div className="flex-1 space-y-8">
        {categories.map(cat => (
          <div key={cat}>
            <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-sauge-100" />{cat}<span className="h-px flex-1 bg-sauge-100" />
            </h3>
            <div className="space-y-2">
              {services.filter(s => s.category === cat).map(svc => {
                const selected = inCart(svc.id);
                const qty = getQty(svc.id);
                return (
                  <div
                    key={svc.id}
                    onClick={() => toggle(svc)}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition ${
                      selected ? "border-sauge-300 bg-sauge-50" : "border-stone-100 bg-white hover:border-sauge-200"
                    }`}
                  >
                    {/* Indicateur sélection */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      selected ? "border-sauge-500 bg-sauge-500" : "border-stone-300"
                    }`}>
                      {selected && <span className="text-white text-xs">✓</span>}
                    </div>

                    {/* Nom + description */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800">{svc.name}</p>
                      {svc.description && (
                        <p className="text-stone-400 text-xs mt-0.5 line-clamp-1">{svc.description}</p>
                      )}
                    </div>

                    {/* Prix + contrôles quantité */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sauge-600">
                        {(svc.price * (selected ? qty : 1)).toFixed(2)} €
                      </p>
                      {selected ? (
                        <div
                          className="flex items-center gap-1 justify-end mt-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => changeQty(svc.id, -1)}
                            className="w-6 h-6 rounded-full bg-sauge-100 hover:bg-sauge-200 text-sauge-600 text-sm font-bold flex items-center justify-center transition"
                          >−</button>
                          <span className="text-sm font-semibold text-stone-700 w-5 text-center">{qty}</span>
                          <button
                            onClick={() => changeQty(svc.id, +1)}
                            className="w-6 h-6 rounded-full bg-sauge-100 hover:bg-sauge-200 text-sauge-600 text-sm font-bold flex items-center justify-center transition"
                          >+</button>
                        </div>
                      ) : (
                        <p className="text-stone-400 text-xs">{svc.duration_minutes} min / unité</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Panier */}
      <div className="lg:w-64 shrink-0">
        <div className="sticky top-20 bg-white rounded-2xl border border-sauge-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-800 mb-3">Mon panier</h3>
          {cart.length === 0 ? (
            <p className="text-stone-400 text-sm">Sélectionnez une prestation</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {cart.map(i => (
                <li key={i.id} className="flex justify-between text-sm gap-2">
                  <span className="text-stone-700 flex-1">
                    {i.name}
                    {i.quantity > 1 && (
                      <span className="text-stone-400"> × {i.quantity}</span>
                    )}
                  </span>
                  <span className="text-sauge-600 font-medium shrink-0">
                    {(i.price * i.quantity).toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          )}
          {cart.length > 0 && (
            <div className="border-t border-stone-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-stone-800">
                <span>Total</span><span>{total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Durée</span><span>{duration} min</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Étape 2 : sélection du créneau ───────────────────────────────────────────
function StepSlot({ cart, selectedDate, selectedSlot, onDate, onSlot }) {
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [closedDates, setClosedDates] = useState([]);
  const [closedWeekdays, setClosedWeekdays] = useState([]);
  const duration = cart.reduce((s, i) => s + i.duration_minutes, 0);

  // Charger horaires + jours fermés une seule fois
  useEffect(() => {
    api.get("/calendar/working-hours")
      .then(rows => setClosedWeekdays(rows.filter(r => !r.is_open).map(r => r.day_of_week)))
      .catch(() => {});
    api.get("/calendar/closed-days")
      .then(rows => setClosedDates(rows.map(r => r.date)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    api.get(`/appointments/available-slots?date=${selectedDate}&duration=${duration}`)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, duration]);

  return (
    <div className="flex gap-8 flex-col md:flex-row">
      <div>
        <p className="text-stone-600 text-sm mb-3">Choisissez une date :</p>
        <Calendar
          selected={selectedDate}
          onSelect={(d) => { onDate(d); onSlot(null); }}
          closedDates={closedDates}
          closedWeekdays={closedWeekdays}
        />
      </div>

      <div className="flex-1">
        {!selectedDate && (
          <p className="text-stone-400 text-sm mt-8">← Sélectionnez une date</p>
        )}
        {selectedDate && loadingSlots && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
          </div>
        )}
        {selectedDate && !loadingSlots && slots.length === 0 && (
          <p className="text-stone-400 text-sm mt-8">Aucun créneau disponible ce jour. Essayez une autre date.</p>
        )}
        {selectedDate && !loadingSlots && slots.length > 0 && (
          <div>
            <p className="text-stone-600 text-sm mb-3">
              Créneaux disponibles le {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} :
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => onSlot(slot === selectedSlot ? null : slot)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition ${
                    slot === selectedSlot
                      ? "bg-sauge-500 text-white border-sauge-500"
                      : "bg-white text-stone-700 border-stone-200 hover:border-sauge-300"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Étape 3 : confirmation ────────────────────────────────────────────────────
function StepConfirm({ cart, selectedDate, selectedSlot, onSuccess }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const duration = cart.reduce((s, i) => s + i.duration_minutes * i.quantity, 0);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await api.post("/appointments", {
        date: selectedDate,
        start_time: selectedSlot,
        services: cart.map(i => ({ id: i.id, quantity: i.quantity })),
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-md">
      <div className="bg-sauge-50 rounded-2xl p-6 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Date</span>
          <span className="font-medium text-stone-800 capitalize">{dateLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Heure</span>
          <span className="font-medium text-stone-800">{selectedSlot}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Durée estimée</span>
          <span className="font-medium text-stone-800">{duration} min</span>
        </div>
        <div className="border-t border-sauge-200 pt-3">
          <p className="text-stone-500 text-sm mb-2">Prestations :</p>
          {cart.map(i => (
            <div key={i.id} className="flex justify-between text-sm gap-2">
              <span className="text-stone-700">
                {i.name}
                {i.quantity > 1 && <span className="text-stone-400"> × {i.quantity}</span>}
              </span>
              <span className="text-sauge-600 shrink-0">{(i.price * i.quantity).toFixed(2)} €</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-bold text-stone-800 pt-1">
          <span>Total</span><span>{total.toFixed(2)} €</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Notes (allergies, précisions…)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Optionnel"
          className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300 resize-none"
        />
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition"
      >
        {loading ? "Envoi en cours…" : "Confirmer ma réservation"}
      </button>
      <p className="text-stone-400 text-xs text-center mt-3">
        Votre rendez-vous sera confirmé par email après validation.
      </p>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Reservation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [success, setSuccess] = useState(false);

  const preselectedId = searchParams.get("service");

  // Pré-sélectionner un service depuis l'URL
  useEffect(() => {
    if (preselectedId) {
      api.get("/services").then(all => {
        const svc = all.find(s => String(s.id) === preselectedId);
        if (svc) setCart([svc]);
      }).catch(() => {});
    }
  }, [preselectedId]);

  const canNext = [
    cart.length > 0,
    !!selectedDate && !!selectedSlot,
    true,
  ][step];

  function handleNext() {
    if (step < 2) setStep(s => s + 1);
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="text-6xl mb-6">✨</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-3">Demande envoyée !</h1>
        <p className="text-stone-500 mb-8">
          Votre demande de rendez-vous a bien été reçue. Vous recevrez un email de confirmation
          dès que l'esthéticienne aura validé votre créneau.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate("/profil")} className="bg-sauge-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-sauge-600 transition">
            Mes rendez-vous
          </button>
          <button onClick={() => navigate("/")} className="border border-stone-200 text-stone-600 px-6 py-2 rounded-full text-sm hover:bg-stone-50 transition">
            Accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-stone-800">Réserver un rendez-vous</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-10 gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                i < step ? "bg-sauge-500 text-white" : i === step ? "bg-sauge-500 text-white ring-4 ring-sauge-100" : "bg-stone-200 text-stone-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${i === step ? "text-sauge-500" : "text-stone-400"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mb-4 mx-1 ${i < step ? "bg-sauge-400" : "bg-stone-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Étapes */}
      <div className="mb-8">
        {step === 0 && <StepServices cart={cart} onCart={setCart} />}
        {step === 1 && (
          <StepSlot
            cart={cart}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onDate={setSelectedDate}
            onSlot={setSelectedSlot}
          />
        )}
        {step === 2 && (
          <StepConfirm
            cart={cart}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onSuccess={() => setSuccess(true)}
          />
        )}
      </div>

      {/* Navigation entre étapes */}
      {step < 2 && (
        <div className="flex justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="px-6 py-2 rounded-full border border-stone-200 text-stone-500 text-sm disabled:opacity-30 hover:bg-stone-50 transition"
          >
            ← Retour
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext}
            className="px-8 py-2 rounded-full bg-sauge-500 hover:bg-sauge-600 disabled:opacity-40 text-white font-medium text-sm transition"
          >
            Suivant →
          </button>
        </div>
      )}
      {step === 2 && (
        <button
          onClick={() => setStep(1)}
          className="px-6 py-2 rounded-full border border-stone-200 text-stone-500 text-sm hover:bg-stone-50 transition"
        >
          ← Modifier le créneau
        </button>
      )}
    </div>
  );
}
