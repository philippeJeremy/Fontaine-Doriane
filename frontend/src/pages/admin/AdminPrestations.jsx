import { useEffect, useRef, useState } from "react";
import { api } from "../../utils/api";

const EMPTY = { name: "", description: "", price: "", duration_minutes: "", category: "Soin", image_url: "", sort_order: 0 };

export default function AdminPrestations() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id ou null
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    api.get("/services/all")
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  function startEdit(s) {
    setEditing(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      category: s.category,
      image_url: s.image_url ?? "",
      sort_order: s.sort_order,
    });
    setError("");
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api.upload("/uploads/image", fd);
      setForm(v => ({ ...v, image_url: data.url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      price: parseFloat(form.price),
      duration_minutes: parseInt(form.duration_minutes, 10),
      sort_order: parseInt(form.sort_order, 10),
      image_url: form.image_url || null,
      description: form.description || null,
    };
    try {
      if (editing) {
        const updated = await api.put(`/services/${editing}`, payload);
        setServices(prev => prev.map(s => s.id === editing ? updated : s));
      } else {
        const created = await api.post("/services", payload);
        setServices(prev => [...prev, created]);
      }
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s) {
    try {
      const updated = await api.patch(`/services/${s.id}`, { is_active: !s.is_active });
      setServices(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (e) {
      alert(e.message);
    }
  }

  const inputCls = "w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Prestations</h1>
        {!editing && editing !== 0 && (
          <button
            onClick={() => { setEditing(0); setForm(EMPTY); }}
            className="bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-medium px-4 py-2 rounded-full transition"
          >
            + Nouvelle prestation
          </button>
        )}
      </div>

      {/* Formulaire */}
      {editing !== null && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-sauge-100 shadow-sm p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-stone-800">{editing ? "Modifier la prestation" : "Nouvelle prestation"}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Nom *</label>
              <input required value={form.name} onChange={set("name")} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Catégorie *</label>
              <input required value={form.category} onChange={set("category")} className={inputCls} placeholder="Ex: Pose, Soin, Nail Art" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Prix (€) *</label>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={set("price")} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Durée (minutes) *</label>
              <input required type="number" min="1" value={form.duration_minutes} onChange={set("duration_minutes")} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
              <textarea value={form.description} onChange={set("description")} rows={2} className={inputCls + " resize-none"} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.image_url}
                  onChange={set("image_url")}
                  className={`${inputCls} flex-1`}
                  placeholder="https://… ou choisir un fichier →"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageFile}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 border border-sauge-200 text-sauge-500 hover:bg-sauge-50 disabled:opacity-50 text-sm px-3 py-2 rounded-xl transition"
                >
                  {uploading ? "Upload…" : "📂 Fichier"}
                </button>
              </div>
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="mt-2 h-20 rounded-lg object-cover"
                  onError={e => { e.target.style.display = "none"; }}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Ordre d'affichage</label>
              <input type="number" value={form.sort_order} onChange={set("sort_order")} className={inputCls} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-full transition">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={cancelEdit} className="border border-stone-200 text-stone-500 text-sm px-6 py-2 rounded-full hover:bg-stone-50 transition">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {services.map(s => (
          <div key={s.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition ${s.is_active ? "border-stone-100" : "border-stone-100 opacity-50"}`}>
            {s.image_url ? (
              <img src={s.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-sauge-50 flex items-center justify-center text-2xl shrink-0">💅</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-stone-800 truncate">{s.name}</p>
                <span className="text-xs text-sauge-400 bg-sauge-50 px-2 py-0.5 rounded-full shrink-0">{s.category}</span>
                {!s.is_active && <span className="text-xs text-stone-400 shrink-0">Désactivé</span>}
              </div>
              <p className="text-sm text-stone-500">{s.price.toFixed(2)} € · {s.duration_minutes} min</p>
              {s.description && <p className="text-xs text-stone-400 truncate">{s.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(s)} className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-3 py-1 rounded-full hover:bg-stone-50 transition">
                Modifier
              </button>
              <button onClick={() => toggleActive(s)} className="text-sm border px-3 py-1 rounded-full transition text-stone-400 border-stone-200 hover:bg-stone-50">
                {s.is_active ? "Désactiver" : "Activer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
