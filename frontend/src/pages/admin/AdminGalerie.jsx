import { useRef, useEffect, useState } from "react";
import { api } from "../../utils/api";

export default function AdminGalerie() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ url: "", caption: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    api.get("/gallery")
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api.upload("/uploads/image", fd);
      setForm(v => ({ ...v, url: data.url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function addPhoto(e) {
    e.preventDefault();
    if (!form.url) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.post("/gallery", {
        url: form.url,
        caption: form.caption || null,
        sort_order: parseInt(form.sort_order, 10),
      });
      setPhotos(prev => [...prev, created]);
      setForm({ url: "", caption: "", sort_order: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePhoto(id) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    try {
      await api.delete(`/gallery/${id}`);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  async function saveCaption(id) {
    try {
      const updated = await api.patch(`/gallery/${id}`, { caption: editCaption || null });
      setPhotos(prev => prev.map(p => p.id === id ? updated : p));
      setEditId(null);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Galerie</h1>

      {/* Formulaire ajout */}
      <form onSubmit={addPhoto} className="bg-white rounded-2xl border border-sauge-100 shadow-sm p-6 mb-8">
        <h2 className="font-semibold text-stone-800 mb-4">Ajouter une photo</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-600 mb-1">Image *</label>
            <div className="flex gap-2">
              <input
                required={!form.url}
                type="text"
                value={form.url}
                onChange={set("url")}
                placeholder="https://… ou choisir un fichier →"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
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
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Ordre</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={set("sort_order")}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-stone-600 mb-1">Légende</label>
            <input
              value={form.caption}
              onChange={set("caption")}
              placeholder="Optionnel"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge-300"
            />
          </div>
        </div>
        {form.url && (
          <div className="mt-3">
            <p className="text-xs text-stone-400 mb-1">Aperçu :</p>
            <img src={form.url} alt="" className="h-24 rounded-lg object-cover" onError={e => { e.target.style.display = "none"; }} />
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 bg-sauge-500 hover:bg-sauge-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-full transition"
        >
          {saving ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && photos.length === 0 && (
        <p className="text-center text-stone-400 py-12">Aucune photo pour l'instant.</p>
      )}

      {/* Grille */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map(p => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden bg-stone-100 aspect-square">
            <img
              src={p.url}
              alt={p.caption ?? ""}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2 gap-1">
              {editId === p.id ? (
                <div onClick={e => e.stopPropagation()} className="space-y-1">
                  <input
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded-lg bg-white/90 text-stone-800 outline-none"
                    placeholder="Légende…"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button onClick={() => saveCaption(p.id)} className="flex-1 bg-green-500 text-white text-xs py-1 rounded-lg">✓</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-white/20 text-white text-xs py-1 rounded-lg">✕</button>
                  </div>
                </div>
              ) : (
                <>
                  {p.caption && <p className="text-white text-xs line-clamp-2">{p.caption}</p>}
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditId(p.id); setEditCaption(p.caption ?? ""); }}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs py-1 rounded-lg transition"
                    >
                      Légende
                    </button>
                    <button
                      onClick={() => deletePhoto(p.id)}
                      className="flex-1 bg-red-500/80 hover:bg-red-500 text-white text-xs py-1 rounded-lg transition"
                    >
                      Suppr.
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
